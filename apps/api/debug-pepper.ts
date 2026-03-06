/**
 * Debug script — checks what PASSWORD_PEPPER is loaded from .env
 * Run from apps/api: npx ts-node debug-pepper.ts
 * Delete after use.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

// Load .env explicitly from the same directory as this script
const result = dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('\n=== Pepper Debug ===');
console.log('dotenv loaded:', !result.error);
console.log('dotenv path:', path.resolve(__dirname, '.env'));
console.log('PASSWORD_PEPPER present:', !!process.env.PASSWORD_PEPPER);
console.log('PASSWORD_PEPPER length:', process.env.PASSWORD_PEPPER?.length ?? 0);
console.log('PASSWORD_PEPPER first 8 chars:', process.env.PASSWORD_PEPPER?.slice(0, 8) ?? 'NOT SET');

if (process.env.PASSWORD_PEPPER) {
  const testHash = crypto
    .createHmac('sha256', process.env.PASSWORD_PEPPER)
    .update('VfDev2024!Reset#')
    .digest('hex');
  console.log('\nHMAC of test password (first 16):', testHash.slice(0, 16));
}
