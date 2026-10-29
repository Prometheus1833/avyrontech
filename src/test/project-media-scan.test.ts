// @vitest-environment node
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { mediaRouter } from '../../cloudflare/workers/api/src/media';
import type { Env, Role } from '../../cloudflare/workers/api/src/types';

vi.mock('../../cloudflare/workers/api/src/projects', () => ({
  canAccessProject: async () => ({ read: true, write: true }),
}));

describe('project media scanner gate', () => {
  it('rejects unavailable and malicious verdicts before R2 or D1, then accepts a clean file', async () => {
    const put = vi.fn(async () => ({ size: 8 }));
    const run = vi.fn(async () => ({ meta: { changes: 1 } }));
    const env = {
      FILES: { put },
      DB: { prepare: () => ({ bind: () => ({ run }) }) },
    } as unknown as Env;
    const app = new Hono<{ Bindings: Env; Variables: { userId: string; roles: Role[] } }>();
    app.use('*', async (c, next) => { c.set('userId', 'synthetic-user'); c.set('roles', ['user']); await next(); });
    app.route('/', mediaRouter);
    const upload = () => app.request('https://avyron.test/api/projects/synthetic-project/media?filename=synthetic.png', {
      method: 'POST',
      headers: { 'content-type': 'image/png' },
      body: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    }, env);

    expect((await upload()).status).toBe(503);
    expect(put).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();

    env.MALWARE_SCANNER = { fetch: async () => Response.json({ verdict: 'rejected' }) };
    expect((await upload()).status).toBe(400);
    expect(put).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();

    env.MALWARE_SCANNER = { fetch: async () => Response.json({ verdict: 'clean' }) };
    expect((await upload()).status).toBe(201);
    expect(put).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledOnce();
  });
});
