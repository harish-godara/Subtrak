/**
 * Encryption — AES-256-GCM symmetric encryption for the secrets vault.
 * All secret values (tokens, passwords, API keys) are encrypted at rest.
 */
/**
 * Encrypt a plaintext string → returns base64-encoded ciphertext.
 * Format: base64(IV + ciphertext + authTag)
 */
export declare function encryptValue(plaintext: string): string;
/**
 * Decrypt a ciphertext string → returns the original plaintext.
 */
export declare function decryptValue(ciphertext: string): string;
//# sourceMappingURL=encryption.d.ts.map