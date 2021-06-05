[Exposed=(Window,Worker)]
interface IDBTransaction : EventTarget {
  readonly attribute DOMStringList objectStoreNames;
  readonly attribute IDBTransactionMode mode;
  readonly attribute IDBTransactionDurability durability;
  [SameObject] readonly attribute IDBDatabase db;
  readonly attribute DOMException? error;

  IDBObjectStore objectStore(DOMString name);
  undefined commit();
  undefined abort();

  // Event handlers:
  attribute EventHandler onabort;
  attribute EventHandler oncomplete;
  attribute EventHandler onerror;
};

enum IDBTransactionMode {
  "readonly",
  "readwrite",
  "versionchange"
};
