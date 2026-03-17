'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield,
  Check,
  Loader2,
  ArrowRight,
  Lock,
  Info,
  Users,
  MessageSquare,
  Building2,
  GraduationCap,
  Briefcase,
  Video,
  BookOpen,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ForumShell, ForumStage, ForumPanel } from '@/components/bia/forum-shell';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface Membership {
  id: string;
  tier: string;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

const PRICING = {
  basic: { monthly: 6.99, annual: 55.99 },
  plus: { monthly: 14.99, annual: 119.99 },
};

const BIA_FEATURES = {
  basic: [
    { icon: Users, text: 'Brothers in Arms reconnection network' },
    { icon: MessageSquare, text: 'Private veteran community forums' },
    { icon: Shield, text: 'Verified veteran profile badge' },
    { icon: Video, text: 'Video calls with your connections' },
  ],
  plus: [
    { icon: BookOpen, text: 'The Bunker - premium veteran forums' },
    { icon: Building2, text: 'Veteran business directory' },
    { icon: GraduationCap, text: 'Mentorship tools and guidance' },
    { icon: Briefcase, text: 'Career resources and opportunities' },
  ],
};

function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full bg-primary/20"
          initial={{ x: Math.random() * 100 + '%', y: '100%', opacity: 0 }}
          animate={{ y: '-100%', opacity: [0, 1, 0] }}
          transition={{
            duration: 5 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

function PricingCard({
  title, subtitle, price, originalPrice, period,
  features, includedFeatures, popular, accent,
  disabled, disabledMessage, onSelect, loading,
}: {
  title: string; subtitle: string; price: number;
  originalPrice?: number; period: string;
  features: { icon: any; text: string }[];
  includedFeatures?: string; popular?: boolean;
  accent: 'emerald' | 'amber';
  disabled?: boolean; disabledMessage?: string;
  onSelect: () => void; loading?: boolean;
}) {
  const accentClasses = accent === 'emerald'
    ? {
      border: 'border-emerald-400/50',
      badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
      text: 'text-emerald-300',
      savings: 'text-emerald-300',
      button: 'bg-emerald-500 hover:bg-emerald-400 text-black',
    }
    : {
      border: 'border-amber-400/50',
      badge: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
      text: 'text-amber-300',
      savings: 'text-amber-300',
      button: 'bg-amber-500 hover:bg-amber-400 text-black',
    };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <ForumPanel className={cn('relative p-6', accentClasses.border, disabled && 'opacity-70')}>
        {popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className={cn('px-3', accentClasses.badge)}>MOST POPULAR</Badge>
          </div>
        )}

        {disabled && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[28px] bg-black/45 backdrop-blur-[1px]">
            <div className="p-4 text-center">
              <Lock className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="max-w-[220px] text-sm text-slate-300/80">{disabledMessage}</p>
            </div>
          </div>
        )}

        <div className={cn('space-y-6', disabled && 'pointer-events-none')}>
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-sm text-slate-300/80">{subtitle}</p>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">GBP {price.toFixed(2)}</span>
              <span className="text-slate-400/70">/{period}</span>
            </div>
            {originalPrice && (
              <p className={cn('mt-1 text-sm font-medium', accentClasses.savings)}>
                Save GBP {(originalPrice - price).toFixed(2)} vs monthly
              </p>
            )}
          </div>

          {includedFeatures && (
            <p className="border-b border-white/10 pb-3 text-sm text-slate-300/80">
              Everything in {includedFeatures}, plus:
            </p>
          )}

          <ul className="space-y-3">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-slate-200">
                <f.icon className={cn('h-4 w-4 flex-shrink-0', accentClasses.text)} />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>

          <Button
            className={cn('w-full font-semibold', accentClasses.button)}
            size="lg"
            onClick={onSelect}
            disabled={disabled || loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </ForumPanel>
    </motion.div>
  );
}

export default function MembershipPage() {
  const { user } = useAuthStore();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');

  const { data: membership, isLoading } = useQuery<Membership>({
    queryKey: ['membership'],
    queryFn: () => api.getSubscription(),
  });

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => api.createCheckoutSession(priceId),
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start checkout');
    },
  });

  const isVerifiedVeteran = user?.role === 'VETERAN_VERIFIED' || user?.role === 'VETERAN_MEMBER';
  const period = billingPeriod === 'monthly' ? 'month' : 'year';

  const getPrice = (monthly: number, annual: number) =>
    billingPeriod === 'monthly' ? monthly : annual;

  const getOriginalPrice = (monthly: number) =>
    billingPeriod === 'annual' ? monthly * 12 : undefined;

  if (isLoading) {
    return (
      <ForumStage>
        <ForumShell className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </ForumShell>
      </ForumStage>
    );
  }

  return (
    <ForumStage>
      <FloatingParticles />
      <ForumShell className="relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2">
            <Award className="h-4 w-4 text-amber-300" />
            <span className="text-sm font-medium text-amber-200">7-Day Free Trial on all BIA Plans</span>
          </div>

          <h1 className="text-4xl font-bold text-white md:text-5xl">Brothers in Arms Membership</h1>
          <p className="mx-auto mt-4 max-w-2xl text-xl text-slate-300/80">
            Unlock the full veteran community experience - reconnect, network, and access exclusive veteran resources.
          </p>
          {membership?.tier && (
            <p className="mt-3 text-sm text-slate-400/70">
              Current membership: <span className="font-medium text-white">{membership.tier}</span>
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center"
        >
          <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1.5">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={cn(
                'rounded-full px-6 py-2.5 text-sm font-medium transition-all',
                billingPeriod === 'monthly'
                  ? 'bg-white text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-100',
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={cn(
                'relative rounded-full px-6 py-2.5 text-sm font-medium transition-all',
                billingPeriod === 'annual'
                  ? 'bg-white text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-100',
              )}
            >
              Annual
              <span className="absolute -right-2 -top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-black">
                -33%
              </span>
            </button>
          </div>
        </motion.div>

        {!isVerifiedVeteran && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ForumPanel className="border-amber-400/20 bg-amber-500/8 p-5">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
                <div>
                  <p className="font-medium text-amber-200">Veteran Verification Required</p>
                  <p className="mt-1 text-sm text-slate-300/80">
                    BIA membership is available exclusively to verified veterans. Submit your service documents in Settings to get verified.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-amber-400/30 bg-transparent text-amber-200 hover:bg-amber-400/10 hover:text-amber-100"
                    onClick={() => { window.location.href = '/app/settings'; }}
                  >
                    Submit Verification Documents
                  </Button>
                </div>
              </div>
            </ForumPanel>
          </motion.div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <PricingCard
            title="BIA"
            subtitle="Core veteran reconnection and community access"
            price={getPrice(PRICING.basic.monthly, PRICING.basic.annual)}
            originalPrice={getOriginalPrice(PRICING.basic.monthly)}
            period={period}
            features={BIA_FEATURES.basic}
            popular
            accent="emerald"
            disabled={!isVerifiedVeteran}
            disabledMessage="Verified veteran status required"
            onSelect={() =>
              checkoutMutation.mutate(
                billingPeriod === 'monthly'
                  ? 'price_bia_basic_monthly'
                  : 'price_bia_basic_annual',
              )
            }
            loading={checkoutMutation.isPending}
          />

          <PricingCard
            title="BIA+"
            subtitle="Full veteran benefits and premium tools"
            price={getPrice(PRICING.plus.monthly, PRICING.plus.annual)}
            originalPrice={getOriginalPrice(PRICING.plus.monthly)}
            period={period}
            features={BIA_FEATURES.plus}
            includedFeatures="BIA"
            accent="amber"
            disabled={!isVerifiedVeteran}
            disabledMessage="Verified veteran status required"
            onSelect={() =>
              checkoutMutation.mutate(
                billingPeriod === 'monthly'
                  ? 'price_bia_plus_monthly'
                  : 'price_bia_plus_annual',
              )
            }
            loading={checkoutMutation.isPending}
          />
        </div>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="mb-8 grid gap-6 sm:grid-cols-3">
            <ForumPanel className="p-4">
              <Shield className="mx-auto mb-2 h-8 w-8 text-emerald-300" />
              <h4 className="font-semibold text-white">Secure Payments</h4>
              <p className="text-sm text-slate-300/80">Powered by Stripe</p>
            </ForumPanel>
            <ForumPanel className="p-4">
              <Check className="mx-auto mb-2 h-8 w-8 text-emerald-300" />
              <h4 className="font-semibold text-white">Cancel Anytime</h4>
              <p className="text-sm text-slate-300/80">No lock-in contracts</p>
            </ForumPanel>
            <ForumPanel className="p-4">
              <Award className="mx-auto mb-2 h-8 w-8 text-amber-300" />
              <h4 className="font-semibold text-white">7-Day Free Trial</h4>
              <p className="text-sm text-slate-300/80">Try before you commit</p>
            </ForumPanel>
          </div>

          <p className="text-sm text-slate-400/70">
            All prices shown in GBP. Annual plans are billed once per year.
          </p>
        </motion.section>
      </ForumShell>
    </ForumStage>
  );
}
