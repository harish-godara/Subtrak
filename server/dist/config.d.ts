/**
 * SubTrack Config — loads settings from .env
 */
import 'dotenv/config';
export declare const config: {
    readonly NODE_ENV: string;
    readonly DATABASE_URL: string;
    readonly JWT_SECRET: string;
    readonly JWT_EXPIRY_HOURS: number;
    readonly ENCRYPTION_KEY: string;
    readonly ADMIN_EMAIL: string;
    readonly ADMIN_PASSWORD: string;
    readonly ADMIN_NAME: string;
    readonly PORT: number;
    readonly SCHEDULER_TIMEZONE: string;
};
//# sourceMappingURL=config.d.ts.map