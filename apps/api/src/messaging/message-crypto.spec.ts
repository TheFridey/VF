import { MessageCrypto, parseEncryptionKeyFallbacks } from './message-crypto';

describe('MessageCrypto', () => {
  it('decrypts messages written with the current key', () => {
    const cryptoHelper = new MessageCrypto('0123456789abcdef0123456789abcdef');
    const encrypted = cryptoHelper.encryptMessage('Current key message');

    expect(
      cryptoHelper.decryptMessage(
        encrypted.encryptedContent,
        encrypted.iv,
        encrypted.authTag,
      ),
    ).toBe('Current key message');
  });

  it('decrypts messages written with the legacy development key', () => {
    const legacyCrypto = new MessageCrypto('development-encryption-key-32ch');
    const currentCrypto = new MessageCrypto('0123456789abcdef0123456789abcdef');
    const encrypted = legacyCrypto.encryptMessage('Legacy thread still readable');

    expect(
      currentCrypto.decryptMessage(
        encrypted.encryptedContent,
        encrypted.iv,
        encrypted.authTag,
      ),
    ).toBe('Legacy thread still readable');
  });

  it('supports explicit fallback keys for non-standard rotations', () => {
    const oldCrypto = new MessageCrypto('custom-old-key');
    const currentCrypto = new MessageCrypto('custom-new-key', ['custom-old-key']);
    const encrypted = oldCrypto.encryptMessage('Rotated key message');

    expect(
      currentCrypto.decryptMessage(
        encrypted.encryptedContent,
        encrypted.iv,
        encrypted.authTag,
      ),
    ).toBe('Rotated key message');
  });

  it('returns the fallback string when no key matches', () => {
    const writer = new MessageCrypto('wrong-key');
    const reader = new MessageCrypto('0123456789abcdef0123456789abcdef');
    const encrypted = writer.encryptMessage('This should not decrypt');

    expect(
      reader.decryptMessage(
        encrypted.encryptedContent,
        encrypted.iv,
        encrypted.authTag,
      ),
    ).toBe('[Unable to decrypt message]');
  });

  it('parses comma-separated fallback keys', () => {
    expect(parseEncryptionKeyFallbacks(' old-one , old-two ,, old-three ')).toEqual([
      'old-one',
      'old-two',
      'old-three',
    ]);
  });
});

