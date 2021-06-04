[Exposed=(Window,Worker)]
interface IDBOpenDBRequest : IDBRequest {
  // Event handlers:
  attribute EventHandler onblocked;
  attribute EventHandler onupgradeneeded;
};
