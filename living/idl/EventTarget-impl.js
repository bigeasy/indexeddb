"use strict";
const DOMException = require("domexception/webidl2js-wrapper");
const hooks = require('async_hooks')

const reportException = require("../helpers/runtime-script-errors");
const idlUtils = require("../generated/utils");
const { nodeRoot } = require("../helpers/node");
const {
  isNode, isShadowRoot, isSlotable, getEventTargetParent,
  isShadowInclusiveAncestor, retarget
} = require("../helpers/shadow-dom");

const cadence = require('cadence')
const noop = require('nop')

const MouseEvent = require("../generated/MouseEvent");

const EVENT_PHASE = {
  NONE: 0,
  CAPTURING_PHASE: 1,
  AT_TARGET: 2,
  BUBBLING_PHASE: 3
};

function setEqual (left, right) {
    if (left.size != right.size) {
        return false
    }
    for (const object of left) {
        if (! right.has(object)) {
            return false
        }
    }
    return true
}

class EventTargetImpl {
  constructor(globalObject) {
    this._globalObject = globalObject;
    this._eventListeners = Object.create(null);
  }

  addEventListener(type, callback, options) {
    options = normalizeEventHandlerOptions(options, ["capture", "once", "passive"]);

    if (callback === null) {
      return;
    }

    if (!this._eventListeners[type]) {
      this._eventListeners[type] = [];
    }

    for (let i = 0; i < this._eventListeners[type].length; ++i) {
      const listener = this._eventListeners[type][i];
      if (
        listener.callback.objectReference === callback.objectReference &&
        listener.options.capture === options.capture
      ) {
        return;
      }
    }

    this._eventListeners[type].push({
      callback,
      options
    });
  }

  removeEventListener(type, callback, options) {
    options = normalizeEventHandlerOptions(options, ["capture"]);

    if (callback === null) {
      // Optimization, not in the spec.
      return;
    }

    if (!this._eventListeners[type]) {
      return;
    }

    for (let i = 0; i < this._eventListeners[type].length; ++i) {
      const listener = this._eventListeners[type][i];
      if (
        listener.callback.objectReference === callback.objectReference &&
        listener.options.capture === options.capture
      ) {
        this._eventListeners[type].splice(i, 1);
        break;
      }
    }
  }

  dispatchEvent(eventImpl) {
    if (eventImpl._dispatchFlag || !eventImpl._initializedFlag) {
      throw DOMException.create(this._globalObject, [
        "Tried to dispatch an uninitialized event",
        "InvalidStateError"
      ]);
    }
    if (eventImpl.eventPhase !== EVENT_PHASE.NONE) {
      throw DOMException.create(this._globalObject, [
        "Tried to dispatch a dispatching event",
        "InvalidStateError"
      ]);
    }

    eventImpl.isTrusted = false;

    let cancelled

    this._dispatch(eventImpl, false, false, false, (error, $) => cancelled = $);

    return cancelled
  }

  // https://dom.spec.whatwg.org/#get-the-parent
  _getTheParent() {
    return null;
  }

  // https://dom.spec.whatwg.org/#concept-event-dispatch
  // legacyOutputDidListenersThrowFlag optional parameter is not necessary here since it is only used by indexDB.
  _dispatch = cadence(function (step, eventImpl, targetOverride, legacyOutputDidListenersThrowFlag, asynchronous) {
        let targetImpl = this;
        let clearTargets = false;
        let activationTarget = null;

        const trace = function () {
            if (asynchronous) {
                const hook = hooks.createHook({
                    init(asyncId, type, triggerAsyncId, resource) {
                        trace.map.set(asyncId, { asyncId, type, triggerAsyncId })
                    },
                    after (asyncId) {
                        trace.map.delete(asyncId)
                    }
                })
                hook.enable()
                return { hook, map: new Map, previous: new Set }
            }
            return null
        } ()

        eventImpl._dispatchFlag = true;

        targetOverride = targetOverride || targetImpl;
        let relatedTarget = retarget(eventImpl.relatedTarget, targetImpl);

        step(function () {
            if (targetImpl !== relatedTarget || targetImpl === eventImpl.relatedTarget) {
              const touchTargets = [];

              appendToEventPath(eventImpl, targetImpl, targetOverride, relatedTarget, touchTargets, false);

              const isActivationEvent = MouseEvent.isImpl(eventImpl) && eventImpl.type === "click";

              if (isActivationEvent && targetImpl._hasActivationBehavior) {
                activationTarget = targetImpl;
              }

              let slotInClosedTree = false;
              let slotable = isSlotable(targetImpl) && targetImpl._assignedSlot ? targetImpl : null;
              let parent = getEventTargetParent(targetImpl, eventImpl);

              // Populate event path
              // https://dom.spec.whatwg.org/#event-path
              while (parent !== null) {
                if (slotable !== null) {
                  if (parent.localName !== "slot") {
                    throw new Error(`JSDOM Internal Error: Expected parent to be a Slot`);
                  }

                  slotable = null;

                  const parentRoot = nodeRoot(parent);
                  if (isShadowRoot(parentRoot) && parentRoot.mode === "closed") {
                    slotInClosedTree = true;
                  }
                }

                if (isSlotable(parent) && parent._assignedSlot) {
                  slotable = parent;
                }

                relatedTarget = retarget(eventImpl.relatedTarget, parent);

                if (
                  true || // TODO Hack to get bubbling to work correctly.
                  (isNode(parent) && isShadowInclusiveAncestor(nodeRoot(targetImpl), parent)) ||
                  idlUtils.wrapperForImpl(parent).constructor.name === "Window"
                ) {
                  if (isActivationEvent && eventImpl.bubbles && activationTarget === null &&
                      parent._hasActivationBehavior) {
                    activationTarget = parent;
                  }

                  appendToEventPath(eventImpl, parent, null, relatedTarget, touchTargets, slotInClosedTree);
                } else if (parent === relatedTarget) {
                  parent = null;
                } else {
                  targetImpl = parent;

                  if (isActivationEvent && activationTarget === null && targetImpl._hasActivationBehavior) {
                    activationTarget = targetImpl;
                  }

                  appendToEventPath(eventImpl, parent, targetImpl, relatedTarget, touchTargets, slotInClosedTree);
                }

                if (parent !== null) {
                  parent = getEventTargetParent(parent, eventImpl);
                }

                slotInClosedTree = false;
              }

              let clearTargetsStructIndex = -1;
              for (let i = eventImpl._path.length - 1; i >= 0 && clearTargetsStructIndex === -1; i--) {
                if (eventImpl._path[i].target !== null) {
                  clearTargetsStructIndex = i;
                }
              }
              const clearTargetsStruct = eventImpl._path[clearTargetsStructIndex];

              clearTargets =
                  (isNode(clearTargetsStruct.target) && isShadowRoot(nodeRoot(clearTargetsStruct.target))) ||
                  (isNode(clearTargetsStruct.relatedTarget) && isShadowRoot(nodeRoot(clearTargetsStruct.relatedTarget)));

              if (activationTarget !== null && activationTarget._legacyPreActivationBehavior) {
                activationTarget._legacyPreActivationBehavior();
              }

                step(function () {
                    step.loop([ eventImpl._path.length - 1 ], function (i) {
                        if (i < 0) {
                            return [ step.break ]
                        }
                        const struct = eventImpl._path[i];

                        if (struct.target !== null) {
                            eventImpl.eventPhase = EVENT_PHASE.AT_TARGET;
                        } else {
                            eventImpl.eventPhase = EVENT_PHASE.CAPTURING_PHASE;
                        }
                        step(function () {
                            _invokeEventListeners(struct, eventImpl, "capturing", legacyOutputDidListenersThrowFlag, trace, step());
                        }, function () {
                            return i - 1
                        })
                    })
                }, function () {
                    step.forEach([ eventImpl._path ], function (struct) {
                        if (struct.target !== null) {
                            eventImpl.eventPhase = EVENT_PHASE.AT_TARGET;
                        } else {
                            if (!eventImpl.bubbles) {
                                return [ step.continue ]
                            }
                            eventImpl.eventPhase = EVENT_PHASE.BUBBLING_PHASE;
                        }
                        _invokeEventListeners(struct, eventImpl, "bubbling", legacyOutputDidListenersThrowFlag, trace, step());
                    })
                })
            }
        }, function () {
            eventImpl.eventPhase = EVENT_PHASE.NONE;

            eventImpl.currentTarget = null;
            eventImpl._path = [];
            eventImpl._dispatchFlag = false;
            eventImpl._stopPropagationFlag = false;
            eventImpl._stopImmediatePropagationFlag = false;

            if (clearTargets) {
                eventImpl.target = null;
                eventImpl.relatedTarget = null;
            }

            if (activationTarget !== null) {
                if (!eventImpl._canceledFlag) {
                    activationTarget._activationBehavior(eventImpl);
                } else if (activationTarget._legacyCanceledActivationBehavior) {
                    activationTarget._legacyCanceledActivationBehavior();
                }
            }

            if (trace != null) {
                trace.hook.disable()
            }

            return [ ! eventImpl._canceledFlag ]
        })
    })
}

module.exports = {
  implementation: EventTargetImpl
};

// https://dom.spec.whatwg.org/#concept-event-listener-invoke
const _invokeEventListeners = cadence(function (step, struct, eventImpl, phase, legacyOutputDidListenersThrowFlag, trace = null) {
  const structIndex = eventImpl._path.indexOf(struct);
  for (let i = structIndex; i >= 0; i--) {
    const t = eventImpl._path[i];
    if (t.target) {
      eventImpl.target = t.target;
      break;
    }
  }

  eventImpl.relatedTarget = idlUtils.wrapperForImpl(struct.relatedTarget);

  if (eventImpl._stopPropagationFlag) {
    return;
  }

  eventImpl.currentTarget = idlUtils.wrapperForImpl(struct.item);

  const listeners = struct.item._eventListeners;
  _innerInvokeEventListeners(eventImpl, listeners, phase, struct.itemInShadowTree, legacyOutputDidListenersThrowFlag, trace, step())
})

// https://dom.spec.whatwg.org/#concept-event-listener-inner-invoke

const _innerInvokeEventListeners = cadence(function (step, eventImpl, listeners, phase, itemInShadowTree, legacyOutputDidListenersThrowFlag, trace) {
    let found = false

    const { type, target } = eventImpl
    const wrapper = idlUtils.wrapperForImpl(target)

    if (!listeners || !listeners[type]) {
        return found
    }

    // Copy event listeners before iterating since the list can be modified during the iteration.
    const handlers = listeners[type].slice();

    step.forEach([ handlers ], function (listener) {
        const { capture, once, passive } = listener.options;
        if (
            (phase === "capturing" && !capture) ||
            (phase === "bubbling" && capture)
        ) {
            return [ step.continue ]
        }

        if (once) {
          listeners[type].splice(listeners[type].indexOf(listener), 1);
        }

        if (passive) {
            eventImpl._inPassiveListenerFlag = true;
        }

        try {
          listener.callback.call(eventImpl.currentTarget, eventImpl);
        } catch (e) {
            console.log(e.stack)
          if (legacyOutputDidListenersThrowFlag) {
            eventImpl._legacyOutputDidListenersThrowFlag = true
          }
        }

        eventImpl._inPassiveListenerFlag = false;

        if (trace != null) {
            step.loop([], function () {
                return new Promise(resolve => resolve(1))
            }, function () {
                trace.map.delete(hooks.executionAsyncId())
                trace.map.delete(hooks.triggerAsyncId())
                const next = new Set(trace.map.keys())
                if (setEqual(trace.previous, next)) {
                    return [ step.break ]
                }
                trace.previous = next
            })
        } else {
            return []
        }
    })
})

/**
 * Normalize the event listeners options argument in order to get always a valid options object
 * @param   {Object} options         - user defined options
 * @param   {Array} defaultBoolKeys  - boolean properties that should belong to the options object
 * @returns {Object} object containing at least the "defaultBoolKeys"
 */
function normalizeEventHandlerOptions(options, defaultBoolKeys) {
  const returnValue = {};

  // no need to go further here
  if (typeof options === "boolean" || options === null || typeof options === "undefined") {
    returnValue.capture = Boolean(options);
    return returnValue;
  }

  // non objects options so we typecast its value as "capture" value
  if (typeof options !== "object") {
    returnValue.capture = Boolean(options);
    // at this point we don't need to loop the "capture" key anymore
    defaultBoolKeys = defaultBoolKeys.filter(k => k !== "capture");
  }

  for (const key of defaultBoolKeys) {
    returnValue[key] = Boolean(options[key]);
  }

  return returnValue;
}

// https://dom.spec.whatwg.org/#concept-event-path-append
function appendToEventPath(eventImpl, target, targetOverride, relatedTarget, touchTargets, slotInClosedTree) {
  const itemInShadowTree = isNode(target) && isShadowRoot(nodeRoot(target));
  const rootOfClosedTree = isShadowRoot(target) && target.mode === "closed";

  eventImpl._path.push({
    item: target,
    itemInShadowTree,
    target: targetOverride,
    relatedTarget,
    touchTargets,
    rootOfClosedTree,
    slotInClosedTree
  });
}
