/**
 * Method A: Curl Proxy
 * Receives fetch config from frontend, executes the HTTP request, returns full response.
 */

import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { secrets } from '../db/schema.js';
import { authMiddleware } from '../utils/security.js';
import { decryptValue } from '../utils/encryption.js';

export const proxyRouter = Router();

const proxySchema = z.object({
  url: z.string().url(),
  method: z.string().default('GET'),
  headers: z.record(z.string()).default({}),
  body: z.string().nullish(),
});

proxyRouter.post('/proxy', authMiddleware, async (req, res) => {
  try {
    const body = proxySchema.parse(req.body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(body.url, {
        method: body.method.toUpperCase(),
        headers: body.headers,
        body: body.body || undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Try to parse body as JSON, fall back to text
      let respBody: unknown;
      try {
        respBody = await response.json();
      } catch {
        respBody = await response.text();
      }

      res.json({
        success: true,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: respBody,
      });
    } catch (e: unknown) {
      clearTimeout(timeout);

      if (e instanceof DOMException && e.name === 'AbortError') {
        res.json({
          success: false,
          error: 'Request timed out after 30 seconds',
          status: 0,
        });
        return;
      }

      const errorMsg = e instanceof Error ? e.message : String(e);
      if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
        res.json({
          success: false,
          error: `Connection failed: ${errorMsg}`,
          status: 0,
        });
        return;
      }

      res.json({
        success: false,
        error: errorMsg,
        status: 0,
      });
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[PROXY ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

const secureProxySchema = z.object({
  fetchConfig: proxySchema,
  secrets: z.record(z.string()).default({}),
  subscription_id: z.string().nullish()
});

// POST /api/proxy/secure — authenticated curl execution with secret injection
proxyRouter.post('/proxy/secure', authMiddleware, async (req, res) => {
  try {
    const user = req.user!;
    const body = secureProxySchema.parse(req.body);
    const { fetchConfig, secrets: inlineSecrets, subscription_id } = body;

    // Load stored secrets from vault if subscription is provided
    const secretMap: Record<string, string> = { ...inlineSecrets };
    
    if (subscription_id) {
      const storedSecrets = await db.select().from(secrets)
        .where(and(eq(secrets.userId, user.id), eq(secrets.subscriptionId, subscription_id)));
      for (const s of storedSecrets) {
        secretMap[s.keyName] = decryptValue(s.encryptedValue);
      }
    }

    // Helper to replace placeholders
    const injectAll = (text: string) => {
      if (!text) return text;
      text = text.replace(/\{\{secret:([^}]+)\}\}/g, (_, key) => secretMap[key] || `{{secret:${key}}}`);
      text = text.replace(/\{\{([^}]+)\}\}/g, (_, key) => secretMap[key] || `{{${key}}}`);
      return text;
    };

    const url = injectAll(fetchConfig.url);
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(fetchConfig.headers)) {
      headers[k] = injectAll(v);
    }
    let fetchBody = fetchConfig.body;
    if (fetchBody) fetchBody = injectAll(fetchBody);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: fetchConfig.method.toUpperCase(),
        headers,
        body: fetchBody || undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      let respBody: unknown;
      try { respBody = await response.json(); } catch { respBody = await response.text(); }

      res.json({
        success: true,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: respBody,
      });
    } catch (e: unknown) {
      clearTimeout(timeout);
      const errorMsg = e instanceof Error ? e.message : String(e);
      res.json({ success: false, error: errorMsg, status: 0 });
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ detail: e.errors[0]?.message || 'Validation error' });
      return;
    }
    console.error('[PROXY SECURE ERROR]', e);
    res.status(500).json({ detail: 'Internal server error' });
  }
});
