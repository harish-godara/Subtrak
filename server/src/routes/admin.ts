/**
 * Admin Routes — user management and global stats (admin role only).
 */

import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, subscriptions, scriptTemplates } from '../db/schema.js';
import { adminMiddleware } from '../utils/security.js';

export const adminRouter = Router();

adminRouter.use(adminMiddleware);

// ── Users ──────────────────────────────────────────────

// GET /api/admin/users
adminRouter.get('/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(sql`${users.createdAt} DESC`);

    const userList = await Promise.all(allUsers.map(async (u) => {
      const [subCount] = await db.select({ count: sql<number>`count(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.userId, u.id));

      const [tmplCount] = await db.select({ count: sql<number>`count(*)` })
        .from(scriptTemplates)
        .where(eq(scriptTemplates.userId, u.id));

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        subscription_count: Number(subCount?.count) || 0,
        template_count: Number(tmplCount?.count) || 0,
        created_at: u.createdAt?.toISOString() || null,
      };
    }));

    res.json({ users: userList });
  } catch (e) {
    console.error('[ADMIN ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/admin/users/:id
adminRouter.get('/users/:id', async (req, res) => {
  try {
    const [u] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!u) { res.status(404).json({ detail: 'User not found' }); return; }

    const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, u.id));

    res.json({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      created_at: u.createdAt?.toISOString() || null,
      subscriptions: subs.map(s => ({
        id: s.id,
        name: s.name,
        account_label: s.accountLabel,
        category: s.category,
        status: s.status,
      })),
    });
  } catch (e) {
    console.error('[ADMIN ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id
adminRouter.delete('/users/:id', async (req, res) => {
  try {
    const admin = req.user!;
    if (req.params.id === admin.id) {
      res.status(400).json({ detail: 'Cannot delete yourself' });
      return;
    }

    const [u] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!u) { res.status(404).json({ detail: 'User not found' }); return; }

    await db.delete(users).where(eq(users.id, u.id));
    res.json({ success: true });
  } catch (e) {
    console.error('[ADMIN ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/role
adminRouter.put('/users/:id/role', async (req, res) => {
  try {
    const role = req.body.role || 'user';
    if (role !== 'user' && role !== 'admin') {
      res.status(400).json({ detail: "Role must be 'user' or 'admin'" });
      return;
    }

    const [u] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!u) { res.status(404).json({ detail: 'User not found' }); return; }

    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, u.id));
    res.json({ success: true, user_id: u.id, role });
  } catch (e) {
    console.error('[ADMIN ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// ── Stats ──────────────────────────────────────────────

// GET /api/admin/stats
adminRouter.get('/stats', async (req, res) => {
  try {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [subCount] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions);
    const [tmplCount] = await db.select({ count: sql<number>`count(*)` }).from(scriptTemplates);

    res.json({
      total_users: Number(userCount?.count) || 0,
      total_subscriptions: Number(subCount?.count) || 0,
      total_templates: Number(tmplCount?.count) || 0,
    });
  } catch (e) {
    console.error('[ADMIN ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});
