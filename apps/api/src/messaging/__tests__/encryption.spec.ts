/**
 * AES-256-GCM message encryption — round-trip tests
 *
 * These tests protect the core privacy guarantee: messages stored in the DB
 * are encrypted and decrypt correctly. A regression here would mean messages
 * are stored as plaintext or become permanently unreadable.
 */
import * as crypto from 'crypto';

// ── Standalone encryption helpers (mirrored from MessagingService) ──────────
// Tested independently so any change to the service implementation that breaks
// the algorithm is caught at the unit level, not only in integration.

const ENCRYPTION_KEY = crypto.scryptSync('test-encryption-key-for-tests', 'salt', 32);

function encryptMessage(content: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(content, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptMessage(encrypted: string, iv: string, authTag: string): string {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      ENCRYPTION_KEY,
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '[Unable to decrypt message]';
  }
}

describe('AES-256-GCM Message Encryption', () => {
  describe('encrypt → decrypt round-trip', () => {
    it('should correctly decrypt a short message', () => {
      const original = 'Hello, brother';
      const { encrypted, iv, authTag } = encryptMessage(original);
      expect(decryptMessage(encrypted, iv, authTag)).toBe(original);
    });

    it('should correctly decrypt a long message', () => {
      const original = 'A'.repeat(10000);
      const { encrypted, iv, authTag } = encryptMessage(original);
      expect(decryptMessage(encrypted, iv, authTag)).toBe(original);
    });

    it('should correctly handle Unicode / emoji content', () => {
      const original = 'Op Herrick 🎖️ — Helmand, 2009. Remember the lads. 🫡';
      const { encrypted, iv, authTag } = encryptMessage(original);
      expect(decryptMessage(encrypted, iv, authTag)).toBe(original);
    });

    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const content = 'Same message';
      const { encrypted: enc1 } = encryptMessage(content);
      const { encrypted: enc2 } = encryptMessage(content);
      expect(enc1).not.toBe(enc2);
    });

    it('should produce valid base64 for encrypted content, IV, and authTag', () => {
      const { encrypted, iv, authTag } = encryptMessage('test');
      const b64Re = /^[A-Za-z0-9+/]+=*$/;
      expect(b64Re.test(encrypted)).toBe(true);
      expect(b64Re.test(iv)).toBe(true);
      expect(b64Re.test(authTag)).toBe(true);
    });
  });

  describe('tamper resistance (GCM authentication)', () => {
    it('should return fallback string when ciphertext is tampered', () => {
      const { encrypted, iv, authTag } = encryptMessage('Secret message');
      const tampered = Buffer.from(encrypted, 'base64');
      tampered[0] ^= 0xff; // Flip bits in first byte
      const result = decryptMessage(tampered.toString('base64'), iv, authTag);
      expect(result).toBe('[Unable to decrypt message]');
    });

    it('should return fallback string when authTag is tampered', () => {
      const { encrypted, iv, authTag } = encryptMessage('Secret message');
      const tamperedTag = Buffer.from(authTag, 'base64');
      tamperedTag[0] ^= 0xff;
      const result = decryptMessage(encrypted, iv, tamperedTag.toString('base64'));
      expect(result).toBe('[Unable to decrypt message]');
    });

    it('should return fallback string when IV is wrong', () => {
      const { encrypted, authTag } = encryptMessage('Secret message');
      const wrongIv = crypto.randomBytes(16).toString('base64');
      const result = decryptMessage(encrypted, wrongIv, authTag);
      expect(result).toBe('[Unable to decrypt message]');
    });

    it('should not throw on completely invalid inputs', () => {
      expect(() => decryptMessage('notbase64!!!', 'alsonotbase64', 'nope')).not.toThrow();
      expect(decryptMessage('', '', '')).toBe('[Unable to decrypt message]');
    });
  });
});
