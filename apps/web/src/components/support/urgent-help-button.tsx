'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, HeartHandshake, MessageSquareText, Phone, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SupportOption = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  icon: LucideIcon;
  tone: 'critical' | 'support';
  secondaryLabel?: string;
  secondaryHref?: string;
  infoHref?: string;
  infoLabel?: string;
};

const supportOptions: SupportOption[] = [
  {
    title: 'Emergency',
    description: 'If you or someone else is in immediate danger, call emergency services now.',
    primaryLabel: 'Call 999',
    primaryHref: 'tel:999',
    icon: AlertTriangle,
    tone: 'critical',
  },
  {
    title: 'Veteran Mental Health Helpline',
    description: 'Combat Stress offers a 24/7 helpline for veterans and their families.',
    primaryLabel: 'Call 0800 138 1619',
    primaryHref: 'tel:08001381619',
    secondaryLabel: 'Text 07537 173683',
    secondaryHref: 'sms:07537173683',
    infoHref: 'https://www.combatstress.org.uk/helpline',
    infoLabel: 'Combat Stress',
    icon: HeartHandshake,
    tone: 'support',
  },
  {
    title: 'Urgent Mental Health Help',
    description: 'Call NHS 111 and select the mental health option for urgent advice and assessment.',
    primaryLabel: 'Call NHS 111',
    primaryHref: 'tel:111',
    infoHref: 'https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/',
    infoLabel: 'NHS guidance',
    icon: Phone,
    tone: 'support',
  },
  {
    title: 'Talk To Someone Now',
    description: 'Samaritans are available 24/7 if you need to talk right away.',
    primaryLabel: 'Call 116 123',
    primaryHref: 'tel:116123',
    infoHref: 'https://www.samaritans.org/how-we-can-help/contact-samaritan/',
    infoLabel: 'Samaritans',
    icon: Phone,
    tone: 'support',
  },
  {
    title: 'Text For Immediate Support',
    description: 'Text SHOUT to 85258 to speak with the Shout crisis text service.',
    primaryLabel: 'Text SHOUT to 85258',
    primaryHref: 'sms:85258?body=SHOUT',
    infoHref: 'https://giveusashout.org/get-help/',
    infoLabel: 'Shout',
    icon: MessageSquareText,
    tone: 'support',
  },
] as const;

const toneClasses = {
  critical: 'border-destructive/30 bg-destructive/10',
  support: 'border-border bg-muted/40',
} as const;

type UrgentHelpButtonProps = {
  className?: string;
  compact?: boolean;
  label?: string;
  onOpen?: () => void;
};

export function UrgentHelpButton({
  className,
  compact = false,
  label = 'Need help',
  onOpen,
}: UrgentHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentTime = useMemo(
    () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    [],
  );

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setIsOpen(true);
        }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          compact ? 'h-10 justify-center px-3' : 'w-full justify-start px-4 py-3',
          className,
        )}
        aria-label="Open urgent support options"
      >
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span>{label}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[1100] bg-black/60" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-0 z-[1101] flex items-center justify-center p-4">
            <div className="relative w-full max-w-3xl rounded-3xl bg-background shadow-2xl">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Close support popup"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="border-b border-border px-6 pb-5 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive">
                  Immediate Support
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  Help is available right now
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  If you need urgent support, use one of these official UK services. If there is immediate danger, call 999 now.
                </p>
              </div>

              <div className="max-h-[80vh] overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      If there is immediate danger, call 999 now or go to A&amp;E.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These contacts are available right away. Local time: {currentTime}.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {supportOptions.map((option) => {
                      const Icon = option.icon;

                      return (
                        <div key={option.title} className={cn('rounded-2xl border p-4', toneClasses[option.tone])}>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background">
                              <Icon className="h-5 w-5 text-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-semibold text-foreground">{option.title}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <a
                                  href={option.primaryHref}
                                  className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                                >
                                  {option.primaryLabel}
                                </a>
                                {option.secondaryHref && option.secondaryLabel && (
                                  <a
                                    href={option.secondaryHref}
                                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                                  >
                                    {option.secondaryLabel}
                                  </a>
                                )}
                                {option.infoHref && option.infoLabel && (
                                  <a
                                    href={option.infoHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                                  >
                                    <span>{option.infoLabel}</span>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    VeteranFinder cannot provide emergency support directly. If you are at immediate risk, call 999.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
