/**
 * Templates Routes — per-user CRUD for reusable script templates.
 * Now supports global (admin-created) templates visible to all users,
 * and a template_type field ('script' | 'api').
 */

import { Router } from 'express';
import { z } from 'zod';
import { eq, and, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { scriptTemplates } from '../db/schema.js';
import { authMiddleware } from '../utils/security.js';

export const templatesRouter = Router();

templatesRouter.use(authMiddleware);

// ── Schemas ────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1),
  platform: z.string().default(''),
  description: z.string().default(''),
  script_content: z.string().min(1),
  credential_fields: z.array(z.record(z.unknown())).default([]),
  script_mode: z.string().default('data'),
  is_global: z.boolean().default(false),
  template_type: z.enum(['script', 'api']).default('script'),
});

const updateSchema = createSchema.partial();

// ── Helpers ────────────────────────────────────────────

function templateToDict(t: typeof scriptTemplates.$inferSelect) {
  return {
    id: t.id,
    name: t.name,
    platform: t.platform,
    description: t.description,
    script_content: t.scriptContent,
    credential_fields: t.credentialFields,
    script_mode: t.scriptMode,
    is_global: t.isGlobal,
    template_type: t.templateType,
    created_at: t.createdAt?.toISOString() || null,
    updated_at: t.updatedAt?.toISOString() || null,
  };
}

async function getOwnTemplate(templateId: string, userId: string) {
  const [t] = await db.select().from(scriptTemplates)
    .where(and(eq(scriptTemplates.id, templateId), eq(scriptTemplates.userId, userId)))
    .limit(1);
  return t || null;
}

async function getTemplateById(templateId: string) {
  const [t] = await db.select().from(scriptTemplates)
    .where(eq(scriptTemplates.id, templateId))
    .limit(1);
  return t || null;
}

// ── Endpoints ──────────────────────────────────────────

// GET /api/templates — returns user's own templates + all global templates
templatesRouter.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const templates = await db.select().from(scriptTemplates)
      .where(
        or(
          eq(scriptTemplates.userId, user.id),
          eq(scriptTemplates.isGlobal, true),
        )
      )
      .orderBy(scriptTemplates.name);
    res.json({ templates: templates.map(templateToDict) });
  } catch (e) {
    console.error('[TEMPLATES ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /api/templates/:id
templatesRouter.get('/:id', async (req, res) => {
  try {
    const user = req.user!;
    const t = await getTemplateById(req.params.id);

    if (!t) { res.status(404).json({ detail: 'Script template not found' }); return; }

    // Allow access if user owns it OR it's global
    if (t.userId !== user.id && !t.isGlobal) {
      res.status(404).json({ detail: 'Script template not found' });
      return;
    }

    res.json(templateToDict(t));
  } catch (e) {
    console.error('[TEMPLATES ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/templates
templatesRouter.post('/', async (req, res) => {
  try {
    const body = createSchema.parse(req.body);
    const user = req.user!;

    // Only admins can create global templates
    const isGlobal = body.is_global && user.role === 'admin' ? true : false;

    const [t] = await db.insert(scriptTemplates).values({
      userId: user.id,
      name: body.name.trim(),
      platform: body.platform.trim(),
      description: body.description.trim(),
      scriptContent: body.script_content,
      credentialFields: body.credential_fields,
      scriptMode: body.script_mode,
      isGlobal,
      templateType: body.template_type,
    }).returning();
    res.json(templateToDict(t));
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[TEMPLATES ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// PUT /api/templates/:id
templatesRouter.put('/:id', async (req, res) => {
  try {
    const user = req.user!;
    const t = await getTemplateById(req.params.id);

    if (!t) { res.status(404).json({ detail: 'Script template not found' }); return; }

    // Admins can edit global templates they own, and their private templates.
    // Regular users can only edit their own non-global templates.
    if (t.isGlobal && user.role !== 'admin') {
      res.status(403).json({ detail: 'Only admins can edit global templates' });
      return;
    }
    if (!t.isGlobal && t.userId !== user.id) {
      res.status(404).json({ detail: 'Script template not found' });
      return;
    }

    const body = updateSchema.parse(req.body);
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.platform !== undefined) updates.platform = body.platform.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.script_content !== undefined) updates.scriptContent = body.script_content;
    if (body.credential_fields !== undefined) updates.credentialFields = body.credential_fields;
    if (body.script_mode !== undefined) updates.scriptMode = body.script_mode;
    if (body.template_type !== undefined) updates.templateType = body.template_type;

    // Only admins can toggle is_global
    if (body.is_global !== undefined && user.role === 'admin') {
      updates.isGlobal = body.is_global;
    }

    const [updated] = await db.update(scriptTemplates)
      .set(updates)
      .where(eq(scriptTemplates.id, t.id))
      .returning();

    res.json(templateToDict(updated));
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[TEMPLATES ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// DELETE /api/templates/:id
templatesRouter.delete('/:id', async (req, res) => {
  try {
    const user = req.user!;
    const t = await getTemplateById(req.params.id);

    if (!t) { res.status(404).json({ detail: 'Script template not found' }); return; }

    // Admins can delete global templates; users can only delete their own
    if (t.isGlobal && user.role !== 'admin') {
      res.status(403).json({ detail: 'Only admins can delete global templates' });
      return;
    }
    if (!t.isGlobal && t.userId !== user.id) {
      res.status(404).json({ detail: 'Script template not found' });
      return;
    }

    await db.delete(scriptTemplates).where(eq(scriptTemplates.id, t.id));
    res.json({ success: true });
  } catch (e) {
    console.error('[TEMPLATES ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/templates/:id/duplicate
templatesRouter.post('/:id/duplicate', async (req, res) => {
  try {
    const user = req.user!;
    const t = await getTemplateById(req.params.id);

    if (!t) { res.status(404).json({ detail: 'Script template not found' }); return; }

    // Allow duplicating if user owns it OR it's global
    if (t.userId !== user.id && !t.isGlobal) {
      res.status(404).json({ detail: 'Script template not found' });
      return;
    }

    // Duplicated template is always private and owned by the current user
    const [copy] = await db.insert(scriptTemplates).values({
      userId: user.id,
      name: `${t.name} (Copy)`,
      platform: t.platform,
      description: t.description,
      scriptContent: t.scriptContent,
      credentialFields: t.credentialFields as Record<string, unknown>[],
      scriptMode: t.scriptMode,
      isGlobal: false,
      templateType: t.templateType,
    }).returning();

    res.json(templateToDict(copy));
  } catch (e) {
    console.error('[TEMPLATES ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});
