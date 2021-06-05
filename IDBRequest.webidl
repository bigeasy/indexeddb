[Exposed=(Window,Worker)]
interface IDBRequest : EventTarget {
  readonly attribute any result;
  readonly attribute DOMException? error;
  readonly attribute (IDBObjectStore or IDBIndex or IDBCursor)? source;
  readonly attribute IDBTransaction? transaction;
  readonly attribute IDBRequestReadyState readyState;

  // Event handlers:
  attribute EventHandler onsuccess;
  attribute EventHandler onerror;
};

enum IDBRequestReadyState {
  "pending",
  "done"
};
