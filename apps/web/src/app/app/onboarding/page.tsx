'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, MapPin, Check, Crown, ArrowRight,
  ChevronRight, Lock, Search, FileCheck, Award,
  Calendar, Hash, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UK_DEPLOYMENT_TAGS } from '@/components/features/community-activation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { UK_REGIMENTS, getRegimentBySlug } from '@/lib/regiments';

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingData = {
  displayName: string;
  bio: string;
  location: string;
  // service
  branch: string;
  rank: string;
  regiment: string;
  startDate: string;
  endDate: string;
  deployments: string[];
};

const TOTAL_STEPS = 5; // Welcome, Profile, Service, Verification, Complete

// ─── Shared UI ────────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-primary rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${(step / total) * 100}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}

function Slide({ children, direction }: { children: React.ReactNode; direction: number }) {
  return (
    <motion.div
      initial={{ x: direction * 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -60, opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ user, onNext }: { user: any; onNext: () => void }) {
  const name = user?.profile?.displayName?.split(' ')[0];
  return (
    <div className="text-center py-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, delay: 0.1 }}
        className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
      >
        <Shield className="h-12 w-12 text-primary" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h1 className="text-3xl font-bold mb-3">
          Welcome{name ? `, ${name}` : ''}! 🎖️
        </h1>
        <p className="text-muted-foreground text-lg mb-2">
          VeteranFinder is built for UK veterans to reconnect with people they served alongside.
        </p>
        <p className="text-muted-foreground mb-8 text-sm">
          We'll take 3 minutes to set up your service profile so we can find the right connections for you.
        </p>

        <div className="grid grid-cols-1 gap-3 mb-8 text-left">
          {[
            { icon: Users,     label: 'Find veterans from your regiment, unit or deployment', color: 'text-blue-500' },
            { icon: Shield,    label: 'Verified veteran-only community — no civilians', color: 'text-green-500' },
            { icon: Search,    label: 'Service overlap matching — see who you likely served with', color: 'text-amber-500' },
            { icon: Lock,      label: 'Secure and private — your data stays yours', color: 'text-purple-500' },
          ].map(({ icon: Icon, label, color }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-3 bg-muted/50 rounded-lg p-3"
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', color)} />
              <span className="text-sm">{label}</span>
            </motion.div>
          ))}
        </div>

        <Button size="lg" className="w-full" onClick={onNext}>
          Set Up My Profile <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}

// ─── Step 2: Profile ──────────────────────────────────────────────────────────

function ProfileStep({
  data, onChange, onNext, onBack,
}: {
  data: OnboardingData; onChange: (k: keyof OnboardingData, v: any) => void;
  onNext: () => void; onBack: () => void;
}) {
  const canContinue = data.displayName.length >= 2;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Your Profile</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        How you appear to other veterans on the platform
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Display Name *</label>
          <Input
            value={data.displayName}
            onChange={e => onChange('displayName', e.target.value)}
            placeholder="How should we call you? (e.g. Cpl Rhys M.)"
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground mt-1">
            You can use your name, nickname, or callsign — whatever you prefer.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Location <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={data.location}
              onChange={e => onChange('location', e.target.value)}
              placeholder="e.g. Manchester, UK"
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            About You <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <textarea
            value={data.bio}
            onChange={e => onChange('bio', e.target.value)}
            placeholder="Brief intro — your service background, what you've been up to since leaving, what you're hoping to find here..."
            maxLength={500}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{data.bio.length}/500</p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} disabled={!canContinue} className="flex-1">
          Next: Service History <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Regiment Searchable Dropdown ─────────────────────────────────────────────

function RegimentSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (slug: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = value ? getRegimentBySlug(value) : null;

  const results = query.trim().length === 0
    ? UK_REGIMENTS.slice(0, 12) // show first 12 as suggestions before typing
    : UK_REGIMENTS.filter((r) =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.category.toLowerCase().includes(query.toLowerCase()) ||
        r.slug.includes(query.toLowerCase()),
      ).slice(0, 20);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(slug: string) {
    onChange(slug);
    setQuery('');
    setOpen(false);
  }

  function clear() {
    onChange('');
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative">
      {selected ? (
        // Show selected regiment as a tag
        <div className="flex items-center gap-2 p-2.5 border border-primary rounded-md bg-primary/5">
          <span className="flex-1 text-sm font-medium text-primary">{selected.name}</span>
          <button
            type="button"
            onClick={clear}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search regiment or corps..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {open && !selected && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No regiment found.</p>
          ) : (
            results.map((r) => (
              <button
                key={r.slug}
                type="button"
                onMouseDown={() => select(r.slug)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{r.category}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Service History ──────────────────────────────────────────────────

const UK_BRANCHES = [
  { value: 'BRITISH_ARMY',    label: 'British Army' },
  { value: 'ROYAL_NAVY',      label: 'Royal Navy' },
  { value: 'ROYAL_AIR_FORCE', label: 'Royal Air Force' },
  { value: 'ROYAL_MARINES',   label: 'Royal Marines' },
  { value: 'RESERVE_FORCES',  label: 'Reserve Forces' },
  { value: 'OTHER',           label: 'Other' },
];

function ServiceStep({
  data, onChange, onNext, onBack,
}: {
  data: OnboardingData; onChange: (k: keyof OnboardingData, v: any) => void;
  onNext: () => void; onBack: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Service History</h2>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        This is the core of reconnection - the more detail you add, the better we can match you with veterans you actually served with.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Branch *</label>
          <div className="grid grid-cols-2 gap-2">
            {UK_BRANCHES.map(b => (
              <button
                key={b.value}
                onClick={() => onChange('branch', b.value)}
                className={cn(
                  'p-3 rounded-lg text-sm border text-left transition-all',
                  data.branch === b.value
                    ? 'bg-primary/10 border-primary text-primary font-medium'
                    : 'border-muted-foreground/30 hover:border-primary/40',
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Rank</label>
            <Input
              value={data.rank}
              onChange={e => onChange('rank', e.target.value)}
              placeholder="e.g. Sergeant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" /> Regiment / Corps
              </span>
            </label>
            <RegimentSearch
              value={data.regiment}
              onChange={(slug) => onChange('regiment', slug)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This unlocks your regiment's private forum and connects you to fellow members.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Service Start
              </span>
            </label>
            <Input
              type="date"
              value={data.startDate}
              onChange={e => onChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Service End
              </span>
            </label>
            <Input
              type="date"
              value={data.endDate}
              onChange={e => onChange('endDate', e.target.value)}
              placeholder="Leave blank if serving"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Deployments & Tours</label>
          <p className="text-xs text-muted-foreground mb-2">
            Add tours of duty - this is how we identify veterans who served in the same places as you.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {UK_DEPLOYMENT_TAGS.map(({ tag, label, years }) => {
              const selected = (data.deployments || []).includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const current = data.deployments || [];
                    onChange(
                      'deployments',
                      selected
                        ? current.filter((deployment) => deployment !== tag)
                        : [...current, tag],
                    );
                  }}
                  title={years}
                  className={[
                    'px-3 py-1.5 rounded text-xs font-medium border transition-all',
                    selected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-500',
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {(data.deployments || []).length > 0 && (
            <p className="text-xs text-zinc-500 mt-2">
              {data.deployments.length} operation
              {data.deployments.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">
          Next: Verification <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function VerificationStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <FileCheck className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Veteran Verification</h2>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        VeteranFinder is a verified-only community. Verification keeps the platform trustworthy and safe for everyone.
      </p>

      <div className="space-y-3 mb-6">
        {[
          {
            step: '1',
            title: 'Submit your MOD 90, discharge papers, or equivalent',
            desc: 'We accept MOD 90, F-Med 133 discharge summary, or service record documents.',
          },
          {
            step: '2',
            title: 'Our team reviews within 24–48 hours',
            desc: 'A human review ensures your documents are authentic. All data is handled securely.',
          },
          {
            step: '3',
            title: 'Access the full platform',
            desc: 'Once verified, you can connect with other veterans and access all platform features.',
          },
        ].map(({ step, title, desc }) => (
          <div key={step} className="flex gap-3 p-4 rounded-xl border bg-muted/30">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">
              {step}
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">You can still explore while waiting</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
              Unverified accounts can view the platform but cannot send connection requests or access BIA features until verified.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">
          Get Started <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground mt-3">
        You'll be prompted to submit verification documents from your account settings.
      </p>
    </div>
  );
}

// ─── Step 5: Complete ─────────────────────────────────────────────────────────

function CompleteStep({ user, onFinish }: { user: any; onFinish: () => void }) {
  const isVerified = user?.role === 'VETERAN_VERIFIED' || user?.role === 'VETERAN_MEMBER';

  return (
    <div className="text-center py-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 10 }}
        className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6"
      >
        <Check className="h-12 w-12 text-green-500" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-2xl font-bold mb-2">Profile Complete!</h2>
        <p className="text-muted-foreground mb-8 text-sm">
          {isVerified
            ? "You're verified and ready to start reconnecting with veterans you served with."
            : "Your profile is set up. Submit your verification documents to unlock full access."}
        </p>

        <div className="space-y-3 mb-8 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What to do next</p>
          {[
            ...(isVerified ? [] : [{
              icon: FileCheck,
              label: 'Submit verification documents',
              href: '/app/settings',
              highlight: true,
            }]),
            { icon: Users,    label: 'Find veterans from your unit', href: '/app/brothers', highlight: isVerified },
            { icon: Award,    label: 'Explore BIA community features', href: '/app/bia/forums', highlight: false },
            { icon: Crown,    label: 'Upgrade to BIA membership', href: '/app/premium', highlight: false },
          ].map(({ icon: Icon, label, href, highlight }, i) => (
            <motion.a
              key={i}
              href={href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                highlight
                  ? 'bg-primary/5 border-primary/30 text-primary hover:bg-primary/10'
                  : 'hover:bg-muted/50',
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{label}</span>
              <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
            </motion.a>
          ))}
        </div>

        <Button size="lg" className="w-full" onClick={onFinish}>
          {isVerified ? 'Find Veterans I Served With' : 'Go to Dashboard'}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}

// ─── Onboarding analytics ────────────────────────────────────────────────────
// Completion tracking via a lightweight local analytics layer.
// In production, swap trackOnboardingEvent() to call your analytics provider
// (PostHog, Mixpanel, GA4). The key events are:
//   onboarding_started   — user lands on step 0
//   onboarding_step_N    — user advances to step N (captures drop-off per step)
//   onboarding_completed — user clicked finish on the complete screen
//   onboarding_abandoned — user navigated away before completing (tracked via beforeunload)

type OnboardingEvent =
  | 'onboarding_started'
  | 'onboarding_step_1'
  | 'onboarding_step_2'
  | 'onboarding_step_3'
  | 'onboarding_step_4'
  | 'onboarding_completed'
  | 'onboarding_abandoned';

function trackOnboardingEvent(event: OnboardingEvent, props?: Record<string, unknown>) {
  // Replace this implementation with your analytics provider.
  // Using console in dev and a future /api/v1/analytics endpoint in prod.
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Onboarding] ${event}`, props);
  }
  // Production: POST to your analytics sink or call window.posthog?.capture()
  // fetch('/api/v1/analytics/event', { method: 'POST', body: JSON.stringify({ event, props }) });
}



export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const startedAt = useState(() => Date.now())[0];

  const [data, setData] = useState<OnboardingData>({
    displayName: user?.profile?.displayName || '',
    bio: '',
    location: '',
    branch: '',
    rank: '',
    regiment: '',
    startDate: '',
    endDate: '',
    deployments: [],
  });

  const onChange = useCallback((key: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  const steps = ['welcome', 'profile', 'service', 'verification', 'complete'];

  // Track start on mount + detect abandonment mid-flow
  useEffect(() => {
    trackOnboardingEvent('onboarding_started', { userId: user?.id });
    const handleUnload = () => {
      if (step < steps.length - 1) {
        trackOnboardingEvent('onboarding_abandoned', {
          step,
          stepName: steps[step],
          userId: user?.id,
          secondsElapsed: Math.round((Date.now() - startedAt) / 1000),
        });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.updateProfile({
        displayName: data.displayName,
        bio: data.bio || undefined,
        location: data.location || undefined,
      });
      if (data.branch) {
        await api.updateVeteranDetails({
          branch: data.branch,
          rank: data.rank || undefined,
          regiment: data.regiment || undefined,
          deployments: data.deployments,
        });
        if (data.startDate) {
          await api.addServicePeriod({
            branch: data.branch,
            startDate: data.startDate,
            endDate: data.endDate || undefined,
            unit: data.regiment || undefined,
          });
        }
      }
    } catch {
      // Non-critical
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (step === 2) await saveProfile(); // save after service step
    const nextStep = step + 1;
    // Track step advancement — step 0 (welcome) is already tracked via onboarding_started
    if (nextStep > 0 && nextStep < steps.length) {
      trackOnboardingEvent(`onboarding_step_${nextStep}` as OnboardingEvent, {
        userId: user?.id,
        stepName: steps[nextStep],
        secondsElapsed: Math.round((Date.now() - startedAt) / 1000),
        hasDisplayName: !!data.displayName,
        hasBranch: !!data.branch,
        deploymentsCount: data.deployments.length,
      });
    }
    setDirection(1);
    setStep(s => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep(s => Math.max(0, s - 1));
  };

  const finish = () => {
    trackOnboardingEvent('onboarding_completed', {
      userId: user?.id,
      secondsElapsed: Math.round((Date.now() - startedAt) / 1000),
      hasBranch: !!data.branch,
      deploymentsCount: data.deployments.length,
    });
    const isVerified = user?.role === 'VETERAN_VERIFIED' || user?.role === 'VETERAN_MEMBER';
    router.push(isVerified ? '/app/brothers' : '/app');
  };

  const currentStep = steps[step];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4 border-b">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold">VeteranFinder</span>
            <span className="text-xs text-muted-foreground ml-auto">
              Step {Math.min(step + 1, TOTAL_STEPS)} of {TOTAL_STEPS}
            </span>
          </div>
          <ProgressBar step={step + 1} total={TOTAL_STEPS} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto p-6">
          <AnimatePresence mode="wait">
            <Slide key={step} direction={direction}>
              {currentStep === 'welcome'       && <WelcomeStep user={user} onNext={goNext} />}
              {currentStep === 'profile'       && <ProfileStep data={data} onChange={onChange} onNext={goNext} onBack={goBack} />}
              {currentStep === 'service'       && <ServiceStep data={data} onChange={onChange} onNext={goNext} onBack={goBack} />}
              {currentStep === 'verification'  && <VerificationStep onNext={goNext} onBack={goBack} />}
              {currentStep === 'complete'      && <CompleteStep user={user} onFinish={finish} />}
            </Slide>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
