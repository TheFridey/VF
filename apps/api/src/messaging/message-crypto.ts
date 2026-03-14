import * as crypto from 'crypto';

const DEFAULT_PRIMARY_SECRET = 'default-dev-encryption-key-32ch';
const LEGACY_DEV_SECRETS = [
  'development-encryption-key-32ch',
  'dev-encryption-key-32-chars-longg',
  DEFAULT_PRIMARY_SECRET,
] as const;

type DerivedKey = {
  secret: string;
  key: Buffer;
};

export type EncryptedMessagePayload = {
  encryptedContent: string;
  iv: string;
  authTag: string;
};

function deriveKey(secret: string): DerivedKey {
  return {
    secret,
    key: crypto.scryptSync(secret, 'salt', 32),
  };
}

function uniqSecrets(secrets: string[]) {
  return [...new Set(secrets.map((secret) => secret.trim()).filter(Boolean))];
}

export class MessageCrypto {
  private readonly primaryKey: Buffer;
  private readonly decryptionKeys: DerivedKey[];

  constructor(primarySecret: string, fallbackSecrets: string[] = []) {
    const allSecrets = uniqSecrets([
      primarySecret || DEFAULT_PRIMARY_SECRET,
      ...fallbackSecrets,
      ...LEGACY_DEV_SECRETS,
    ]);

    this.decryptionKeys = allSecrets.map(deriveKey);
    this.primaryKey = this.decryptionKeys[0].key;
  }

  encryptMessage(content: string): EncryptedMessagePayload {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.primaryKey, iv);

    let encryptedContent = cipher.update(content, 'utf8', 'base64');
    encryptedContent += cipher.final('base64');

    return {
      encryptedContent,
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
    };
  }

  decryptMessage(encryptedContent: string, iv: string, authTag: string): string {
    for (const { key } of this.decryptionKeys) {
      try {
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          key,
          Buffer.from(iv, 'base64'),
        );
        decipher.setAuthTag(Buffer.from(authTag, 'base64'));

        let decrypted = decipher.update(encryptedContent, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch {
        continue;
      }
    }

    return '[Unable to decrypt message]';
  }
}

export function parseEncryptionKeyFallbacks(rawValue?: string | null) {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

