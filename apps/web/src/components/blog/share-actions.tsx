'use client';

import { useMemo, useState } from 'react';
import { Copy, Mail, MessageCircle, Share2 } from 'lucide-react';

type ShareActionsProps = {
  title: string;
  excerpt: string;
  url: string;
};

export function ShareActions({ title, excerpt, url }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const canNativeShare =
    typeof navigator !== 'undefined' &&
    'share' in navigator &&
    typeof navigator.share === 'function';

  const shareUrls = useMemo(
    () => ({
      x: `https://x.com/intent/tweet?text=${encodeURIComponent(`${title}\n\n${excerpt}`)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title}\n\n${excerpt}\n\n${url}`)}`,
      email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${excerpt}\n\n${url}`)}`,
    }),
    [excerpt, title, url],
  );

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const nativeShare = async () => {
    if (!navigator.share) return;
    await navigator.share({
      title,
      text: excerpt,
      url,
    });
  };

  const openShare = (shareUrl: string) => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const buttonClassName =
    'inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary';

  return (
    <section className="mx-auto mt-8 max-w-4xl rounded-2xl border border-border bg-card/70 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Share this article
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        Send it to someone who would want it.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Platform previews use this article&apos;s excerpt and cover image where supported.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {canNativeShare ? (
          <button type="button" onClick={() => nativeShare().catch(() => undefined)} className={buttonClassName}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </button>
        ) : null}
        <button type="button" onClick={() => copyLink().catch(() => undefined)} className={buttonClassName}>
          <Copy className="mr-2 h-4 w-4" />
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <button type="button" onClick={() => openShare(shareUrls.whatsapp)} className={buttonClassName}>
          <MessageCircle className="mr-2 h-4 w-4" />
          WhatsApp
        </button>
        <button type="button" onClick={() => openShare(shareUrls.facebook)} className={buttonClassName}>
          Facebook
        </button>
        <button type="button" onClick={() => openShare(shareUrls.linkedin)} className={buttonClassName}>
          LinkedIn
        </button>
        <button type="button" onClick={() => openShare(shareUrls.x)} className={buttonClassName}>
          X
        </button>
        <button type="button" onClick={() => openShare(shareUrls.email)} className={buttonClassName}>
          <Mail className="mr-2 h-4 w-4" />
          Email
        </button>
      </div>
    </section>
  );
}
