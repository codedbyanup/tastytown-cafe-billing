exports.SCHEMA = `
CREATE TABLE IF NOT EXISTS menu(id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, name TEXT UNIQUE, price INTEGER);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, table_no INTEGER, created_at TEXT, original INTEGER, discount INTEGER, final INTEGER, status TEXT, closed_at TEXT);
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT, name TEXT, price INTEGER, qty INTEGER);
CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT, amount INTEGER, method TEXT, paid_at TEXT);
CREATE INDEX IF NOT EXISTS ix_pay ON payments(order_id);
CREATE INDEX IF NOT EXISTS ix_items ON order_items(order_id);
`;
