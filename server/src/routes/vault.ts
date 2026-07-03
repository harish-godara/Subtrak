/**
 * Vault Routes — encrypted secret storage (tokens, API keys, credentials).
 * Values are NEVER returned to the frontend. Only key names are listed.
 */

import { Router } from 'express';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { secrets } from '../db/schema.js';
import { authMiddleware } from '../utils/security.js';
import { encryptValue } from '../utils/encryption.js';

export const vaultRouter = Router();

vaultRouter.use(authMiddleware);

// ── Schemas ────────────────────────────────────────────

const createSecretSchema = z.object({
  key_name: z.string().min(1),
  value: z.string().min(1),
  subscription_id: z.string().nullish(),
});

// ── Endpoints ──────────────────────────────────────────

// GET /api/vault
vaultRouter.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const subId = req.query.subscription_id as string | undefined;

    const conditions = [eq(secrets.userId, user.id)];
    if (subId) {
      conditions.push(eq(secrets.subscriptionId, subId));
    }

    const rows = await db.select().from(secrets)
      .where(and(...conditions))
      .orderBy(secrets.keyName);

    res.json({
      secrets: rows.map(s => ({
        id: s.id,
        key_name: s.keyName,
        subscription_id: s.subscriptionId || null,
        created_at: s.createdAt?.toISOString() || null,
      })),
    });
  } catch (e) {
    console.error('[VAULT ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/vault/has/:subscriptionId/:keyName
vaultRouter.get('/has/:subscriptionId/:keyName', async (req, res) => {
  try {
    const user = req.user!;
    const [existing] = await db.select().from(secrets)
      .where(and(
        eq(secrets.userId, user.id),
        eq(secrets.subscriptionId, req.params.subscriptionId),
        eq(secrets.keyName, req.params.keyName)
      ))
      .limit(1);

    res.json({ exists: !!existing });
  } catch (e) {
    console.error('[VAULT ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/vault
vaultRouter.post('/', async (req, res) => {
  try {
    const user = req.user!;
    const body = createSecretSchema.parse(req.body);
    const subId = body.subscription_id || null;
    const keyName = body.key_name.trim();

    // Check for existing secret with same key_name + subscription
    const conditions = [eq(secrets.userId, user.id), eq(secrets.keyName, keyName)];
    if (subId) {
      conditions.push(eq(secrets.subscriptionId, subId));
    } else {
      conditions.push(isNull(secrets.subscriptionId));
    }

    const [existing] = await db.select().from(secrets).where(and(...conditions)).limit(1);

    if (existing) {
      // Update existing secret
      await db.update(secrets)
        .set({ encryptedValue: encryptValue(body.value), updatedAt: new Date() })
        .where(eq(secrets.id, existing.id));
      res.json({ success: true, action: 'updated', key_name: body.key_name });
    } else {
      // Create new secret
      await db.insert(secrets).values({
        userId: user.id,
        subscriptionId: subId,
        keyName,
        encryptedValue: encryptValue(body.value),
      });
      res.json({ success: true, action: 'created', key_name: body.key_name });
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[VAULT ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/vault/batch
vaultRouter.post('/batch', async (req, res) => {
  try {
    const user = req.user!;
    const secretsList: { key_name?: string; value?: string }[] = req.body.secrets || [];
    const subId = req.body.subscription_id || null;

    for (const item of secretsList) {
      const keyName = (item.key_name || '').trim();
      const value = item.value || '';
      if (!keyName || !value) continue;

      // Upsert logic
      const conditions = [eq(secrets.userId, user.id), eq(secrets.keyName, keyName)];
      if (subId) {
        conditions.push(eq(secrets.subscriptionId, subId));
      } else {
        conditions.push(isNull(secrets.subscriptionId));
      }

      const [existing] = await db.select().from(secrets).where(and(...conditions)).limit(1);

      if (existing) {
        await db.update(secrets)
          .set({ encryptedValue: encryptValue(value), updatedAt: new Date() })
          .where(eq(secrets.id, existing.id));
      } else {
        await db.insert(secrets).values({
          userId: user.id,
          subscriptionId: subId,
          keyName,
          encryptedValue: encryptValue(value),
        });
      }
    }

    res.json({ success: true, stored: secretsList.length });
  } catch (e) {
    console.error('[VAULT ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// DELETE /api/vault/:id
vaultRouter.delete('/:id', async (req, res) => {
  try {
    const user = req.user!;
    const [secret] = await db.select().from(secrets)
      .where(and(eq(secrets.id, req.params.id), eq(secrets.userId, user.id)))
      .limit(1);

    if (!secret) {
      res.status(404).json({ detail: 'Secret not found' });
      return;
    }

    await db.delete(secrets).where(eq(secrets.id, secret.id));
    res.json({ success: true });
  } catch (e) {
    console.error('[VAULT ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});
