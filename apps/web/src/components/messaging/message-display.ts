import type { Message } from './types';

const HISTORICAL_DUPLICATE_WINDOW_MS = 15 * 60 * 1000;
const HISTORICAL_DUPLICATE_MIN_AGE_MS = 60 * 60 * 1000;
const LONG_TAIL_DUPLICATE_MIN_AGE_MS = 24 * 60 * 60 * 1000;

export function dedupeMessagesForDisplay(messages: Message[]) {
  const now = Date.now();
  const deduped: Message[] = [];
  const lastSeenBySignature = new Map<string, number>();

  for (const message of messages) {
    const currentCreatedAt = new Date(message.createdAt).getTime();
    const normalizedContent = message.content.trim().replace(/\s+/g, ' ');
    const signature = `${message.connectionId}:${message.senderId}:${normalizedContent}`;
    const lastSeenAt = lastSeenBySignature.get(signature);
    const ageMs = now - currentCreatedAt;
    const duplicateWindowMs = ageMs > LONG_TAIL_DUPLICATE_MIN_AGE_MS
      ? Infinity
      : ageMs > HISTORICAL_DUPLICATE_MIN_AGE_MS
        ? HISTORICAL_DUPLICATE_WINDOW_MS
        : 0;

    if (
      duplicateWindowMs > 0
      && lastSeenAt !== undefined
      && Math.abs(currentCreatedAt - lastSeenAt) <= duplicateWindowMs
    ) {
      continue;
    }

    deduped.push(message);
    lastSeenBySignature.set(signature, currentCreatedAt);
  }

  return deduped;
}
