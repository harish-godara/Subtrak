/**
 * Security — password hashing, JWT creation/validation, auth middleware.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
// ── Password Hashing ──────────────────────────────────
const SALT_ROUNDS = 10;
export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
export async function verifyPassword(plain, hashed) {
    return bcrypt.compare(plain, hashed);
}
export function createJWT(userId, email, role) {
    const payload = {
        sub: userId,
        email,
        role,
    };
    return jwt.sign(payload, config.JWT_SECRET, {
        expiresIn: `${config.JWT_EXPIRY_HOURS}h`,
    });
}
export function decodeJWT(token) {
    try {
        return jwt.verify(token, config.JWT_SECRET);
    }
    catch {
        throw new Error('Invalid or expired token');
    }
}
// ── Express Middleware ─────────────────────────────────
/**
 * Auth middleware — extracts Bearer token, validates JWT,
 * loads user from DB, attaches to req.user.
 */
export async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ detail: 'Missing or invalid authorization header' });
            return;
        }
        const token = authHeader.slice(7);
        const payload = decodeJWT(token);
        const userId = payload.sub;
        if (!userId) {
            res.status(401).json({ detail: 'Invalid token payload' });
            return;
        }
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) {
            res.status(401).json({ detail: 'User not found' });
            return;
        }
        req.user = user;
        next();
    }
    catch {
        res.status(401).json({ detail: 'Invalid or expired token' });
    }
}
/**
 * Admin middleware — same as auth but also checks role === 'admin'.
 */
export async function adminMiddleware(req, res, next) {
    await authMiddleware(req, res, () => {
        if (req.user?.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }
        next();
    });
}
//# sourceMappingURL=security.js.map