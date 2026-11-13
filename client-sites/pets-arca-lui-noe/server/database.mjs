import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { seedDatabase } from './seed.mjs';

export function openDatabase(path) {
  const db = new DatabaseSync(path);
  const adapter = {
    prepare: sql => db.prepare(sql),
    close: () => db.close(),
    transaction(work) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = work();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
    adapter.transaction(() => seedDatabase(adapter));
    return adapter;
  } catch (error) {
    db.close();
    throw error;
  }
}
