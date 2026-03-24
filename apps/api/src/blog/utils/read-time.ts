export function calculateReadTime(html: string): { wordCount: number; readTimeMinutes: number } {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text.split(' ').filter((w) => w.length > 0).length;
  const readTimeMinutes = Math.max(1, Math.round(wordCount / 200));
  return { wordCount, readTimeMinutes };
}

export function formatReadTime(minutes: number): string {
  if (minutes <= 4) return `Quick read · ${minutes} min`;
  if (minutes <= 8) return `${minutes} min read`;
  return `Longer read · ${minutes} min`;
}
