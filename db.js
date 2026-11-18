import * as SQLite from 'expo-sqlite';
const store = require('./store');
const { MENU } = require('./menu');
export async function open() {
  const db = await SQLite.openDatabaseAsync('tastytown.db'); // persists on the phone
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const a = { exec: s => db.execAsync(s), run: (s, p = []) => db.runAsync(s, p), all: (s, p = []) => db.getAllAsync(s, p), first: (s, p = []) => db.getFirstAsync(s, p), tx: f => db.withTransactionAsync(f) };
  await store.init(a, MENU);
  return a;
}
