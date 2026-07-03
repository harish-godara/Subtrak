/**
 * SubTrack Config — loads settings from .env
 */
import 'dotenv/config';
export const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/subtrack',
    JWT_SECRET: process.env.JWT_SECRET || 'fallback-dev-secret-change-me',
    JWT_EXPIRY_HOURS: parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10),
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@subtrack.local',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
    ADMIN_NAME: process.env.ADMIN_NAME || 'Admin',
    PORT: parseInt(process.env.PORT || '8000', 10),
    SCHEDULER_TIMEZONE: process.env.SCHEDULER_TIMEZONE || 'Asia/Kolkata',
};
//# sourceMappingURL=config.js.map