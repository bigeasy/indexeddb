[Exposed=(Window,Worker)]
interface IDBCursorWithValue : IDBCursor {
  readonly attribute any value;
};
