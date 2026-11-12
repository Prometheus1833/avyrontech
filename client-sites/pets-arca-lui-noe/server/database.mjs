import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { siteDefaults } from '../site-config.mjs';
import { defaultSettings } from './reminder-mail.mjs';
import { shiftDay, todayInBucharest } from './validation.mjs';

export function openDatabase(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  db.exec('BEGIN IMMEDIATE');
  try {
    const initial = JSON.stringify(siteDefaults);
    const seeded = db.prepare('INSERT OR IGNORE INTO site_content(id, draft, published) VALUES (1, ?, ?)').run(initial, initial).changes;
    db.prepare('INSERT OR IGNORE INTO settings(id, data) VALUES (1, ?)').run(JSON.stringify(defaultSettings));
    if (seeded) seedDirectory(db);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    db.close();
    throw error;
  }
  return db;
}

function seedDirectory(db) {
  const owners = [
    ['Ana Demo', 'ana@example.com', 'ro', 1],
    ['Mihai Demo', 'mihai@example.com', 'ro', 1],
    ['Emma Demo', 'emma@example.com', 'en', 1],
    ['Irina Demo', 'irina@example.com', 'ro', 0],
  ];
  const pets = [[1, 'Luna', 'cat'], [2, 'Max', 'dog'], [3, 'Milo', 'cat'], [4, 'Nala', 'dog']];
  const entries = [[1, 'vaccine', 5, 7], [2, 'parasites', 7, 3], [3, 'checkup', 12, 1], [4, 'vaccine', 9, 7]];
  const insertOwner = db.prepare('INSERT INTO owners(name, email, language, email_allowed) VALUES (?, ?, ?, ?)');
  const insertPet = db.prepare('INSERT INTO pets(owner_id, name, species) VALUES (?, ?, ?)');
  const insertReminder = db.prepare('INSERT INTO reminders(pet_id, kind, due_on, lead_days, send_on) VALUES (?, ?, ?, ?, ?)');
  for (const owner of owners) insertOwner.run(...owner);
  for (const pet of pets) insertPet.run(...pet);
  const today = todayInBucharest();
  for (const [pet, kind, offset, lead] of entries) {
    const due = shiftDay(today, offset);
    insertReminder.run(pet, kind, due, lead, shiftDay(due, -lead));
  }
}
