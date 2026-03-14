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
  plus:  { monthly: 14.99, annual: 119.99 },
};

const BIA_FEATURES = {
  basic: [
    { icon: Users,        text: 'Brothers in Arms reconnection network' },
    { icon: MessageSquare, text: 'Private veteran community forums' },
    { icon: Shield,       text: 'Verified veteran profile badge' },
    { icon: Video,        text: 'Video calls with your connections' },
  ],
  plus: [
    { icon: BookOpen,     text: 'The Bunker — premium veteran forums' },
    { icon: Building2,    text: 'Veteran business directory' },
    { icon: GraduationCap, text: 'Mentorship tools and guidance' },
    { icon: Briefcase,    text: 'Career resources and opportunities' },
  ],
};

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-primary/20 rounded-full"
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
  features, includedFeatures, popular,
  disabled, disabledMessage, onSelect, loading,
}: {
  title: string; subtitle: string; price: number;
  originalPrice?: number; period: string;
  features: { icon: any; text: string }[];
  includedFeatures?: string; popular?: boolean;
  disabled?: boolean; disabledMessage?: string;
  onSelect: () => void; loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative rounded-2xl border-2 p-6 transition-all',
        popular ? 'border-primary' : 'border-border',
        disabled ? 'opacity-60 grayscale' : 'hover:shadow-lg',
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-3">MOST POPULAR</Badge>
        </div>
      )}

      {disabled && (
        <div className="absolute inset-0 rounded-2xl bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div className="text-center p-4">
            <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-[220px]">{disabledMessage}</p>
          </div>
        </div>
      )}

      <div className={cn(disabled && 'pointer-events-none')}>
        <div className="mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">£{price.toFixed(2)}</span>
            <span className="text-muted-foreground">/{period}</span>
          </div>
          {originalPrice && (
            <p className="text-sm text-green-600 font-medium mt-1">
              Save £{(originalPrice - price).toFixed(2)} vs monthly
            </p>
          )}
        </div>

        {includedFeatures && (
          <p className="text-sm text-muted-foreground mb-3 pb-3 border-b">
            Everything in {includedFeatures}, plus:
          </p>
        )}

        <ul className="space-y-3 mb-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <f.icon className="h-4 w-4 text-primary flex-shrink-0" />
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        <Button className="w-full" size="lg" onClick={onSelect} disabled={disabled || loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <>
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen -mt-6 -mx-4 px-4 pt-6 pb-12 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      <FloatingParticles />

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">7-Day Free Trial on all BIA Plans</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">Brothers in Arms Membership</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full veteran community experience — reconnect, network, and access exclusive veteran resources.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-muted rounded-full p-1.5 flex items-center">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={cn(
                'px-6 py-2.5 rounded-full text-sm font-medium transition-all',
                billingPeriod === 'monthly'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={cn(
                'px-6 py-2.5 rounded-full text-sm font-medium transition-all relative',
                billingPeriod === 'annual'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Annual
              <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold bg-green-500 text-white rounded-full">
                -33%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Verification notice */}
        {!isVerifiedVeteran && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-lg bg-orange-50 border border-orange-200 flex items-start gap-3"
          >
            <Info className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-800">Veteran Verification Required</p>
              <p className="text-sm text-orange-700 mt-1">
                BIA membership is available exclusively to verified veterans. Submit your service documents in Settings to get verified.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => (window.location.href = '/app/settings')}
              >
                Submit Verification Documents
              </Button>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <PricingCard
            title="BIA"
            subtitle="Core veteran reconnection and community access"
            price={getPrice(PRICING.basic.monthly, PRICING.basic.annual)}
            originalPrice={getOriginalPrice(PRICING.basic.monthly)}
            period={period}
            features={BIA_FEATURES.basic}
            popular
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
          className="text-center mt-10"
        >
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            <div className="p-4 rounded-lg bg-muted/50">
              <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h4 className="font-semibold">Secure Payments</h4>
              <p className="text-sm text-muted-foreground">Powered by Stripe</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <Check className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h4 className="font-semibold">Cancel Anytime</h4>
              <p className="text-sm text-muted-foreground">No lock-in contracts</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h4 className="font-semibold">7-Day Free Trial</h4>
              <p className="text-sm text-muted-foreground">Try before you commit</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            All prices shown in GBP (£). Annual plans are billed once per year.
          </p>
        </motion.section>
      </div>
    </div>
  );
}
