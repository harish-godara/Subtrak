/**
 * Auth Routes — register, login, profile.
 */

import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { hashPassword, verifyPassword, createJWT, authMiddleware } from '../utils/security.js';

export const authRouter = Router();

// ── Schemas ────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  name: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

// ── Endpoints ──────────────────────────────────────────

authRouter.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const email = body.email.toLowerCase().trim();

    // Check if email already exists
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      res.status(400).json({ detail: 'Email already registered' });
      return;
    }

    const [user] = await db.insert(users).values({
      email,
      name: body.name.trim(),
      passwordHash: await hashPassword(body.password),
      role: 'user',
    }).returning();

    const token = createJWT(user.id, user.email, user.role);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, settings: user.settings },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[AUTH ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const email = body.email.toLowerCase().trim();

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      res.status(401).json({ detail: 'Invalid email or password' });
      return;
    }

    const token = createJWT(user.id, user.email, user.role);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, settings: user.settings },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[AUTH ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

authRouter.get('/me', authMiddleware, async (req, res) => {
  const user = req.user!;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    settings: user.settings,
    created_at: user.createdAt?.toISOString() || null,
  });
});

authRouter.put('/update', authMiddleware, async (req, res) => {
  try {
    const body = updateProfileSchema.parse(req.body);
    const user = req.user!;

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.settings !== undefined) updates.settings = body.settings;

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(users).set(updates).where(eq(users.id, user.id));
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: body.name?.trim() || user.name,
        settings: body.settings || user.settings,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[AUTH ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});
