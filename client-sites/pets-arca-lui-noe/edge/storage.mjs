import { DurableObject } from 'cloudflare:workers';
import schema from '../server/schema.sql';
import { actions, adminState, readContent } from '../server/actions.mjs';
import { seedDatabase } from '../server/seed.mjs';
import { ValidationError } from '../server/validation.mjs';

export class ClinicDemo extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const storage = ctx.storage;
    const sql = storage.sql;
    this.db = {
      prepare: statement => ({
        get: (...values) => sql.exec(statement, ...values).toArray()[0],
        all: (...values) => sql.exec(statement, ...values).toArray(),
        run: (...values) => {
          sql.exec(statement, ...values).toArray();
          return sql.exec('SELECT changes() AS changes').one();
        },
      }),
      transaction: work => storage.transactionSync(work),
    };
    if (!storage.kv.get('schema-v1')) {
      this.db.transaction(() => {
        sql.exec(schema).toArray();
        seedDatabase(this.db);
        storage.kv.put('schema-v1', true);
      });
    }
  }

  content(draft) {
    const site = readContent(this.db);
    return JSON.parse(draft ? site.draft : site.published);
  }

  state() {
    return adminState(this.db);
  }

  mutate(action, body) {
    if (!Object.hasOwn(actions, action)) return { status: 404, data: { error: 'Acțiune indisponibilă.' } };
    try {
      return { status: 200, data: actions[action](this.db, body) };
    } catch (error) {
      if (error instanceof ValidationError) return { status: error.status, data: { error: error.message } };
      throw error;
    }
  }
}
