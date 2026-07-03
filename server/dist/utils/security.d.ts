/**
 * Security — password hashing, JWT creation/validation, auth middleware.
 */
import type { Request, Response, NextFunction } from 'express';
import { type User } from '../db/schema.js';
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(plain: string, hashed: string): Promise<boolean>;
interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}
export declare function createJWT(userId: string, email: string, role: string): string;
export declare function decodeJWT(token: string): JwtPayload;
/**
 * Auth middleware — extracts Bearer token, validates JWT,
 * loads user from DB, attaches to req.user.
 */
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Admin middleware — same as auth but also checks role === 'admin'.
 */
export declare function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
export {};
//# sourceMappingURL=security.d.ts.map