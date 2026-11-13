import { kinds, mailSettings, prepareResendEmail } from './reminder-mail.mjs';
import {
  ValidationError, choice, date, email, integer, shiftDay, siteConfig, text, todayInBucharest,
} from './validation.mjs';

const selectReminders = `
  SELECT r.*, p.name AS pet, p.species, o.name AS owner, o.email, o.language, o.email_allowed,
    EXISTS(SELECT 1 FROM delivery_events d WHERE d.reminder_id = r.id AND d.revision = r.revision) AS simulated
  FROM reminders r JOIN pets p ON p.id = r.pet_id JOIN owners o ON o.id = p.owner_id
`;
const id = value => integer(value, 1, Number.MAX_SAFE_INTEGER, 'ID');
const revision = value => integer(value, 1, Number.MAX_SAFE_INTEGER, 'Revizie');

export function readContent(db) {
  return db.prepare('SELECT * FROM site_content WHERE id = 1').get();
}

function readSettings(db) {
  return JSON.parse(db.prepare('SELECT data FROM settings WHERE id = 1').get().data);
}

function reminders(db) {
  return db.prepare(selectReminders + ' ORDER BY r.send_on, r.id').all();
}

function getReminder(db, value) {
  const result = db.prepare(selectReminders + ' WHERE r.id = ?').get(id(value));
  if (!result) throw new ValidationError('Termenul nu a fost găsit.', 404);
  return result;
}

export function adminState(db) {
  const site = readContent(db);
  return {
    today: todayInBucharest(),
    site: {
      draft: JSON.parse(site.draft),
      revision: site.revision,
      publishedRevision: site.published_revision,
      publishedAt: site.published_at,
    },
    settings: readSettings(db),
    owners: db.prepare('SELECT * FROM owners ORDER BY name, id').all(),
    pets: db.prepare('SELECT * FROM pets ORDER BY name, id').all(),
    reminders: reminders(db),
    events: db.prepare(`
      SELECT id, simulated_on, send_time, created_at, kind, revision, reminder_id,
        pet_snapshot AS pet, kind_snapshot AS reminder_kind
      FROM delivery_events ORDER BY id DESC LIMIT 100
    `).all(),
  };
}

function ensureChanged(result, message) {
  if (!result.changes) throw new ValidationError(message, 409);
}

export const actions = {
  'site/draft'(db, body) {
    const draft = JSON.stringify(siteConfig(body.config));
    ensureChanged(db.prepare(`
      UPDATE site_content SET draft = ?, revision = revision + 1 WHERE id = 1 AND revision = ?
    `).run(draft, revision(body.revision)), 'Ciorna s-a schimbat în altă filă. Reîncarcă editorul.');
    return adminState(db);
  },

  'site/publish'(db, body) {
    ensureChanged(db.prepare(`
      UPDATE site_content SET published = draft, published_revision = revision, published_at = CURRENT_TIMESTAMP
      WHERE id = 1 AND revision = ?
    `).run(revision(body.revision)), 'Ciorna s-a schimbat în altă filă. Reîncarcă editorul înainte să aplici.');
    return adminState(db);
  },

  settings(db, body) {
    const settings = mailSettings(body);
    db.prepare('UPDATE settings SET data = ? WHERE id = 1').run(JSON.stringify(settings));
    return adminState(db);
  },

  owners(db, body) {
    const name = text(body.name, 90, 'Numele proprietarului');
    const address = email(body.email);
    if (!address.toLowerCase().endsWith('@example.com')) {
      throw new ValidationError('În demo folosește o adresă fictivă de forma nume@example.com.');
    }
    const language = choice(body.language, ['ro', 'en'], 'Limba e-mailului');
    const allowed = body.emailAllowed === true ? 1 : 0;
    const other = db.prepare('SELECT id FROM owners WHERE email = ? COLLATE NOCASE').get(address);
    if (other && other.id !== body.id) throw new ValidationError('Există deja un proprietar cu această adresă.');
    if (body.id != null) {
      ensureChanged(db.prepare('UPDATE owners SET name = ?, email = ?, language = ?, email_allowed = ? WHERE id = ?')
        .run(name, address, language, allowed, id(body.id)), 'Proprietarul nu a fost găsit.');
    } else {
      db.prepare('INSERT INTO owners(name, email, language, email_allowed) VALUES (?, ?, ?, ?)')
        .run(name, address, language, allowed);
    }
    return adminState(db);
  },

  pets(db, body) {
    const owner = id(body.ownerId);
    if (!db.prepare('SELECT id FROM owners WHERE id = ?').get(owner)) {
      throw new ValidationError('Proprietarul nu a fost găsit.');
    }
    const name = text(body.name, 55, 'Numele animalului');
    const species = choice(body.species, ['dog', 'cat', 'other'], 'Specie');
    if (body.id != null) {
      ensureChanged(db.prepare('UPDATE pets SET name = ?, species = ? WHERE id = ? AND owner_id = ?')
        .run(name, species, id(body.id), owner), 'Animalul nu a fost găsit la acest proprietar.');
    } else {
      db.prepare('INSERT INTO pets(owner_id, name, species) VALUES (?, ?, ?)').run(owner, name, species);
    }
    return adminState(db);
  },

  reminders(db, body) {
    const pet = id(body.petId);
    if (!db.prepare('SELECT id FROM pets WHERE id = ?').get(pet)) {
      throw new ValidationError('Animalul nu a fost găsit.');
    }
    const kind = choice(body.kind, Object.keys(kinds), 'Tipul termenului');
    const due = date(body.dueOn);
    if (due < todayInBucharest()) throw new ValidationError('Alege termenul de azi sau o dată viitoare.');
    const lead = integer(body.leadDays, 0, 90, 'Zile înainte');
    const send = shiftDay(due, -lead);
    if (body.id != null) {
      ensureChanged(db.prepare(`
        UPDATE reminders SET pet_id = ?, kind = ?, due_on = ?, lead_days = ?, send_on = ?,
          revision = revision + CASE WHEN pet_id <> ? OR kind <> ? OR due_on <> ? OR lead_days <> ? THEN 1 ELSE 0 END
        WHERE id = ? AND revision = ? AND status = 'active'
      `).run(pet, kind, due, lead, send, pet, kind, due, lead, id(body.id), revision(body.revision)),
      'Termenul a fost modificat sau închis.');
    } else {
      db.prepare('INSERT INTO reminders(pet_id, kind, due_on, lead_days, send_on) VALUES (?, ?, ?, ?, ?)')
        .run(pet, kind, due, lead, send);
    }
    return adminState(db);
  },

  'reminders/status'(db, body) {
    const status = choice(body.status, ['done', 'cancelled'], 'Stare');
    ensureChanged(db.prepare(`
      UPDATE reminders SET status = ?, revision = revision + 1 WHERE id = ? AND revision = ? AND status = 'active'
    `).run(status, id(body.id), revision(body.revision)), 'Termenul a fost deja modificat sau închis.');
    return adminState(db);
  },

  'mail/preview'(db, body) {
    const reminder = getReminder(db, body.id);
    const language = choice(body.language, ['ro', 'en'], 'Limba de previzualizare');
    const settings = body.settings ? mailSettings(body.settings) : readSettings(db);
    return prepareResendEmail(settings, reminder, language);
  },

  'mail/simulate'(db, body) {
    const simulatedOn = date(body.date);
    const count = db.transaction(() => {
      let count = 0;
      const settings = readSettings(db);
      if (!settings.enabled) throw new ValidationError('Activează reminderele din Setări înainte de simulare.');
      const insert = db.prepare(`
        INSERT INTO delivery_events (reminder_id, revision, idempotency_key, simulated_on, send_time, pet_snapshot, kind_snapshot, kind)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'simulated') ON CONFLICT(reminder_id, revision) DO NOTHING
      `);
      for (const reminder of reminders(db)) {
        if (reminder.status !== 'active' || reminder.simulated || !reminder.email_allowed ||
            reminder.send_on > simulatedOn || reminder.due_on < simulatedOn) continue;
        const { idempotencyKey } = prepareResendEmail(settings, reminder);
        count += Number(insert.run(reminder.id, reminder.revision, idempotencyKey, simulatedOn, settings.sendTime, reminder.pet, reminder.kind).changes);
      }
      return count;
    });
    return { count, state: adminState(db) };
  },
};
