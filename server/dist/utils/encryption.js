/**
 * Encryption — AES-256-GCM symmetric encryption for the secrets vault.
 * All secret values (tokens, passwords, API keys) are encrypted at rest.
 */
import crypto from 'node:crypto';
import { config } from '../config.js';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV for AES-GCM
const TAG_LENGTH = 16; // 128-bit auth tag
let _key = null;
function getKey() {
    if (_key)
        return _key;
    let keyStr = config.ENCRYPTION_KEY;
    if (!keyStr || keyStr === 'change_me_generate_a_32_byte_base64_key') {
        // Auto-generate a key for development (logged as warning)
        const generated = crypto.randomBytes(32);
        keyStr = generated.toString('base64');
        console.warn('[WARNING] No ENCRYPTION_KEY set! Generated a temporary key. Set ENCRYPTION_KEY in .env for persistence.');
        console.warn(`[WARNING] Generated key: ${keyStr}`);
    }
    _key = Buffer.from(keyStr, 'base64');
    if (_key.length !== 32) {
        throw new Error(`ENCRYPTION_KEY must decode to exactly 32 bytes, got ${_key.length}`);
    }
    return _key;
}
/**
 * Encrypt a plaintext string → returns base64-encoded ciphertext.
 * Format: base64(IV + ciphertext + authTag)
 */
export function encryptValue(plaintext) {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    // Concatenate: IV (16) + encrypted + tag (16)
    const combined = Buffer.concat([iv, encrypted, tag]);
    return combined.toString('base64');
}
/**
 * Decrypt a ciphertext string → returns the original plaintext.
 */
export function decryptValue(ciphertext) {
    const key = getKey();
    const combined = Buffer.from(ciphertext, 'base64');
    // Extract IV, encrypted data, and auth tag
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(combined.length - TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    try {
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    }
    catch {
        throw new Error('Failed to decrypt value — wrong encryption key or corrupted data');
    }
}
//# sourceMappingURL=encryption.js.map