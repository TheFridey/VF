'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, MapPin,
  Check, Crown, Video, ArrowRight,
  ChevronRight, Sparkles, Lock, Bell
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type OnboardingData = {
  displayName: string;
  bio: string;
  dateOfBirth: string;
  location: string;
  gender: string;
  interests: string[];
  // veteran only
  branch: string;
  rank: string;
  regiment: string;
  startDate: string;
  endDate: string;
  deployments: string[];
};

const TOTAL_STEPS = 6; // Welcome, Profile, Veteran (conditional), Interests, Notifications, Paywall

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-primary rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${((step) / total) * 100}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}

// ─── Slide wrapper ────────────────────────────────────────────────────────────

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
          Welcome{user?.profile?.displayName ? `, ${user.profile.displayName}` : ''}! 🎖️
        </h1>
        <p className="text-muted-foreground text-lg mb-2">
          VeteranFinder helps veterans reconnect with old colleagues and comrades.
        </p>
        <p className="text-muted-foreground mb-8 text-sm">
          Let's take 2 minutes to set up your profile and find the connections that matter.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-8 text-left">
          {[
            { icon: Users, label: 'Reconnect with your network', color: 'text-blue-500' },
            { icon: Users, label: 'Brothers in Arms network', color: 'text-blue-500' },
            { icon: Shield, label: 'Veteran-verified community', color: 'text-green-500' },
            { icon: Lock, label: 'Private & secure', color: 'text-purple-500' },
          ].map(({ icon: Icon, label, color }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-2 bg-muted/50 rounded-lg p-3"
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', color)} />
              <span className="text-sm">{label}</span>
            </motion.div>
          ))}
        </div>
        <Button size="lg" className="w-full" onClick={onNext}>
          Let's Get Started <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}

// ─── Step 2: Basic Profile ────────────────────────────────────────────────────

function ProfileStep({
  data, onChange, onNext, onBack
}: {
  data: OnboardingData; onChange: (k: keyof OnboardingData, v: any) => void;
  onNext: () => void; onBack: () => void;
}) {
  const genders = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY'];
  const genderLabels: Record<string, string> = {
    MALE: 'Man', FEMALE: 'Woman', NON_BINARY: 'Non-binary',
    OTHER: 'Other', PREFER_NOT_TO_SAY: 'Prefer not to say',
  };

  const canContinue = data.displayName.length >= 2 && data.dateOfBirth && data.gender;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">About You</h2>
      <p className="text-muted-foreground mb-6 text-sm">Tell the community a little about yourself</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Display Name *</label>
          <Input
            value={data.displayName}
            onChange={e => onChange('displayName', e.target.value)}
            placeholder="How should we call you?"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date of Birth *</label>
          <Input type="date" value={data.dateOfBirth} onChange={e => onChange('dateOfBirth', e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">I am a... *</label>
          <div className="flex flex-wrap gap-2">
            {genders.map(g => (
              <button
                key={g}
                onClick={() => onChange('gender', g)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm border transition-all',
                  data.gender === g
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-muted-foreground/30 hover:border-primary/50'
                )}
              >
                {genderLabels[g]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={data.location}
              onChange={e => onChange('location', e.target.value)}
              placeholder="City, Country"
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bio <span className="text-muted-foreground text-xs">(optional)</span></label>
          <textarea
            value={data.bio}
            onChange={e => onChange('bio', e.target.value)}
            placeholder="Tell people about yourself and your service background..."
            maxLength={500}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{data.bio.length}/500</p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} disabled={!canContinue} className="flex-1">
          Continue <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Veteran Details ──────────────────────────────────────────────────

function VeteranStep({
  data, onChange, onNext, onBack, isVeteran
}: {
  data: OnboardingData; onChange: (k: keyof OnboardingData, v: any) => void;
  onNext: () => void; onBack: () => void; isVeteran: boolean;
}) {
  const branches = [
    { value: 'BRITISH_ARMY', label: 'British Army' },
    { value: 'ROYAL_NAVY', label: 'Royal Navy' },
    { value: 'ROYAL_AIR_FORCE', label: 'Royal Air Force' },
    { value: 'ROYAL_MARINES', label: 'Royal Marines' },
    { value: 'RESERVE_FORCES', label: 'Reserve Forces' },
    { value: 'OTHER', label: 'Other' },
  ];
  const [newDeployment, setNewDeployment] = useState('');

  if (!isVeteran) {
    // Legacy non-veteran accounts skip veteran-specific fields
    return (
      <div className="text-center py-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Users className="h-10 w-10 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-3">Veteran Community Access</h2>
        <p className="text-muted-foreground mb-8">
          This account does not currently include service history. Continue to finish setup and update profile details in settings.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
          <Button onClick={onNext} className="flex-1">Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Service Details</h2>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">This helps us find veterans with shared service history</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Branch *</label>
          <div className="grid grid-cols-2 gap-2">
            {branches.map(b => (
              <button
                key={b.value}
                onClick={() => onChange('branch', b.value)}
                className={cn(
                  'p-3 rounded-lg text-sm border text-left transition-all',
                  data.branch === b.value
                    ? 'bg-primary/10 border-primary text-primary font-medium'
                    : 'border-muted-foreground/30 hover:border-primary/40'
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
            <Input value={data.rank} onChange={e => onChange('rank', e.target.value)} placeholder="e.g. Sergeant" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Regiment / Unit</label>
            <Input value={data.regiment} onChange={e => onChange('regiment', e.target.value)} placeholder="e.g. 1 Para" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Service Start</label>
            <Input type="date" value={data.startDate} onChange={e => onChange('startDate', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Service End</label>
            <Input type="date" value={data.endDate} onChange={e => onChange('endDate', e.target.value)} placeholder="Leave blank if still serving" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Deployments</label>
          <p className="text-xs text-muted-foreground mb-2">Add tours — helps us find veterans who served in the same places</p>
          <div className="flex gap-2 mb-2">
            <Input
              value={newDeployment}
              onChange={e => setNewDeployment(e.target.value)}
              placeholder="e.g. Afghanistan, Iraq, Bosnia..."
              onKeyPress={e => {
                if (e.key === 'Enter' && newDeployment.trim()) {
                  onChange('deployments', [...(data.deployments || []), newDeployment.trim()]);
                  setNewDeployment('');
                }
              }}
            />
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => {
                if (newDeployment.trim()) {
                  onChange('deployments', [...(data.deployments || []), newDeployment.trim()]);
                  setNewDeployment('');
                }
              }}
            >Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(data.deployments || []).map((d, i) => (
              <Badge key={i} variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => onChange('deployments', data.deployments.filter((_, j) => j !== i))}>
                {d} ×
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </div>
  );
}

// ─── Step 4: Interests ────────────────────────────────────────────────────────

const INTEREST_OPTIONS = [
  '🏃 Running', '🏋️ Fitness', '🎯 Shooting Sports', '🏕️ Camping',
  '🎮 Gaming', '🎸 Music', '📚 Reading', '🍺 Pub nights',
  '⚽ Football', '🏉 Rugby', '🧗 Climbing', '🚴 Cycling',
  '🐕 Dogs', '🌍 Travel', '🍳 Cooking', '🎣 Fishing',
  '🏊 Swimming', '🤿 Diving', '🧠 History', '✈️ Aviation',
  '🚗 Cars', '🏍️ Motorcycles', '🎨 Art', '💻 Tech',
];

function InterestsStep({
  data, onChange, onNext, onBack
}: {
  data: OnboardingData; onChange: (k: keyof OnboardingData, v: any) => void;
  onNext: () => void; onBack: () => void;
}) {
  const toggleInterest = (interest: string) => {
    const current = data.interests || [];
    if (current.includes(interest)) {
      onChange('interests', current.filter(i => i !== interest));
    } else if (current.length < 8) {
      onChange('interests', [...current, interest]);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Your Interests</h2>
      <p className="text-muted-foreground mb-1 text-sm">Select up to 8 — shown on your profile to spark conversations</p>
      <p className="text-xs text-muted-foreground mb-5">
        {(data.interests || []).length}/8 selected
      </p>

      <div className="grid grid-cols-2 gap-2 mb-6 max-h-80 overflow-y-auto pr-1">
        {INTEREST_OPTIONS.map(interest => {
          const selected = (data.interests || []).includes(interest);
          return (
            <motion.button
              key={interest}
              onClick={() => toggleInterest(interest)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'p-3 rounded-xl text-sm text-left border transition-all',
                selected
                  ? 'bg-primary/10 border-primary text-primary font-medium'
                  : 'border-muted-foreground/20 hover:border-primary/40',
                !selected && (data.interests || []).length >= 8 && 'opacity-40 cursor-not-allowed'
              )}
            >
              {interest}
            </motion.button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">
          Continue <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 5: Notifications ────────────────────────────────────────────────────

function NotificationsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [requesting, setRequesting] = useState(false);
  const [granted, setGranted] = useState(false);

  const requestPermission = async () => {
    setRequesting(true);
    try {
      if (!('Notification' in window)) {
        toast.error('Notifications not supported in this browser');
        onNext();
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setGranted(true);
        // Register service worker and subscribe
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            const vapidData = await api.getVapidKey();
            if (vapidData.publicKey) {
              const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidData.publicKey,
              });
              await api.subscribeToPush(sub.toJSON() as PushSubscriptionJSON);
            }
          } catch (e) {
            // Silently fail — not critical
          }
        }
        toast.success('Notifications enabled!');
        setTimeout(onNext, 800);
      } else {
        onNext();
      }
    } catch {
      onNext();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="text-center py-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className={cn(
          'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-500',
          granted ? 'bg-green-500/20' : 'bg-primary/10'
        )}
      >
        <AnimatePresence mode="wait">
          {granted ? (
            <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
              <Check className="h-12 w-12 text-green-500" />
            </motion.div>
          ) : (
            <motion.div key="bell" initial={{ scale: 1 }} animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ delay: 0.5, duration: 0.6 }}>
              <Bell className="h-12 w-12 text-primary" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <h2 className="text-2xl font-bold mb-3">Stay in the Loop</h2>
      <p className="text-muted-foreground mb-6">
        Get notified instantly about new connection requests, messages, and veteran community updates.
      </p>

      <div className="bg-muted/50 rounded-xl p-4 mb-8 text-left space-y-3">
        {[
          { icon: Users, label: "New connection requests", color: "text-blue-500" },
          { icon: Sparkles, label: "Community updates", color: "text-amber-500" },
          { icon: Bell, label: "New messages", color: "text-blue-500" },
        ].map(({ icon: Icon, label, color }, i) => (
          <div key={i} className="flex items-center gap-3">
            <Icon className={cn("h-5 w-5", color)} />
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onNext} className="flex-1 text-muted-foreground">
          Not now
        </Button>
        <Button onClick={requestPermission} disabled={requesting || granted} className="flex-1">
          {requesting ? 'Enabling...' : granted ? 'Enabled ✓' : 'Enable Notifications'}
          {!requesting && !granted && <Bell className="h-4 w-4 ml-2" />}
        </Button>
      </div>
      <button onClick={onBack} className="mt-3 text-xs text-muted-foreground hover:text-foreground">
        ← Back
      </button>
    </div>
  );
}

// ─── Step 6: Paywall ──────────────────────────────────────────────────────────

function PaywallStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const premiumFeatures = [
    { icon: Users, label: 'Priority reconnection visibility', highlight: true },
    { icon: Shield, label: 'Advanced veteran directory filters', highlight: true },
    { icon: Video, label: 'Video calls with connections', highlight: false },
    { icon: Sparkles, label: 'Full BIA community access', highlight: false },
    { icon: Users, label: 'Full Brothers in Arms access', highlight: false },
    { icon: Crown, label: 'Premium veteran support perks', highlight: false },
  ];

  return (
    <div>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14 }}
        className="text-center mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
          <Crown className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Your Profile is Ready!</h2>
        <p className="text-muted-foreground text-sm">
          Upgrade now to unlock advanced reconnection and BIA tools.
        </p>
      </motion.div>

      {/* Pricing card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="relative rounded-2xl border-2 border-amber-500 bg-gradient-to-b from-amber-500/5 to-transparent p-5 mb-4"
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-amber-500 text-white px-3 text-xs">MOST POPULAR</Badge>
        </div>

        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="font-bold text-lg">BIA Premium</p>
            <p className="text-xs text-muted-foreground">Everything you need to reconnect</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">£9.99</p>
            <p className="text-xs text-muted-foreground">/month</p>
          </div>
        </div>

        <div className="space-y-2.5 mb-5">
          {premiumFeatures.map(({ icon: Icon, label, highlight }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="flex items-center gap-2.5"
            >
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                highlight ? 'bg-amber-500 text-white' : 'bg-green-500/20'
              )}>
                {highlight ? <Icon className="h-3 w-3" /> : <Check className="h-3 w-3 text-green-600" />}
              </div>
              <span className={cn('text-sm', highlight && 'font-medium')}>{label}</span>
            </motion.div>
          ))}
        </div>

        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0 shadow-md shadow-amber-500/25"
          onClick={onNext}
        >
          Start Free Trial <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">7 days free, then £9.99/month. Cancel anytime.</p>
      </motion.div>

      {/* Annual option */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onNext}
        className="w-full p-3 rounded-xl border text-sm flex items-center justify-between hover:border-primary/40 transition-colors mb-3"
      >
        <span>Annual — <strong>£79.99/year</strong></span>
        <Badge variant="outline" className="text-green-600 border-green-500 text-xs">Save 33%</Badge>
      </motion.button>

      <button
        onClick={onSkip}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        Continue with free account →
      </button>
    </div>
  );
}

// ─── Main Onboarding Page ────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const isVeteran = user?.role?.includes('VETERAN');

  const [data, setData] = useState<OnboardingData>({
    displayName: user?.profile?.displayName || '',
    bio: '', dateOfBirth: '', location: '', gender: '',
    interests: [],
    branch: '', rank: '', regiment: '', startDate: '', endDate: '', deployments: [],
  });

  const onChange = useCallback((key: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  const steps = [
    'welcome', 'profile', 'veteran', 'interests', 'notifications', 'paywall'
  ];

  const saveAndContinue = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.updateProfile({
        displayName: data.displayName,
        bio: data.bio,
        dateOfBirth: data.dateOfBirth || undefined,
        location: data.location,
        gender: data.gender || undefined,
        interests: data.interests,
      });

      if (isVeteran && data.branch) {
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
      // Non-critical — continue anyway
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    // Save profile data when leaving the profile step
    if (step === 1) await saveAndContinue();

    setDirection(1);
    setStep(s => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep(s => Math.max(0, s - 1));
  };

  const goToPremium = () => {
    router.push('/app/premium');
  };

  const finish = () => {
    router.push('/app/brothers');
  };

  const currentStep = steps[step];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold">VeteranFinder</span>
            <span className="text-xs text-muted-foreground ml-auto">
              Step {Math.min(step + 1, 6)} of {TOTAL_STEPS}
            </span>
          </div>
          <ProgressBar step={step + 1} total={TOTAL_STEPS} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto p-6">
          <AnimatePresence mode="wait">
            <Slide key={step} direction={direction}>
              {currentStep === 'welcome' && (
                <WelcomeStep user={user} onNext={goNext} />
              )}
              {currentStep === 'profile' && (
                <ProfileStep data={data} onChange={onChange} onNext={goNext} onBack={goBack} />
              )}
              {currentStep === 'veteran' && (
                <VeteranStep data={data} onChange={onChange} onNext={goNext} onBack={goBack} isVeteran={!!isVeteran} />
              )}
              {currentStep === 'interests' && (
                <InterestsStep data={data} onChange={onChange} onNext={goNext} onBack={goBack} />
              )}
              {currentStep === 'notifications' && (
                <NotificationsStep onNext={goNext} onBack={goBack} />
              )}
              {currentStep === 'paywall' && (
                <PaywallStep onNext={goToPremium} onSkip={finish} />
              )}
            </Slide>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
