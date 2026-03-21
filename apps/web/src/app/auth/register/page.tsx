'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Client-side password strength analysis ──────────────────────────────────
// Mirrors the backend PasswordSecurityService checks so the user gets
// immediate feedback before the API call, not a 400 after submission.

const WEAK_BASES = [
  'password','passw0rd','p@ssword','qwerty','letmein','welcome','admin',
  'login','iloveyou','monkey','dragon','master','sunshine','princess',
  'football','liverpool','arsenal','chelsea','rangers','soldier','army',
  'navy','airforce','marines','military','veteran','hunter','shadow',
  'trustno1','abc123','starwars','batman','superman',
];
const SEQUENTIAL = ['12345','23456','34567','45678','56789','98765','87654',
  'abcde','bcdef','qwert','werty','asdfg','zxcvb'];
const KEYBOARD_ROWS = ['qwertyuiop','asdfghjkl','zxcvbnm'];

function calculateEntropy(pwd: string): number {
  if (!pwd) return 0;
  const freq: Record<string, number> = {};
  for (const c of pwd) freq[c] = (freq[c] || 0) + 1;
  let h = 0;
  for (const n of Object.values(freq)) {
    const p = n / pwd.length;
    h -= p * Math.log2(p);
  }
  return h * pwd.length;
}

type StrengthLevel = 'empty' | 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
interface PasswordStrength {
  level: StrengthLevel;
  score: number;        // 0–4
  entropy: number;
  issues: string[];
  label: string;
  color: string;
  barColor: string;
}

function analysePassword(pwd: string): PasswordStrength {
  if (!pwd) return { level: 'empty', score: 0, entropy: 0, issues: [], label: '', color: '', barColor: '' };

  const issues: string[] = [];
  const lower = pwd.toLowerCase();
  const stripped = lower.replace(/[^a-z0-9]/g, '');

  // Basic rules
  if (pwd.length < 8) issues.push('Too short — use at least 8 characters');
  if (!/[A-Z]/.test(pwd)) issues.push('Add an uppercase letter');
  if (!/[a-z]/.test(pwd)) issues.push('Add a lowercase letter');
  if (!/[0-9]/.test(pwd)) issues.push('Add a number');

  // Common pattern detection
  for (const base of WEAK_BASES) {
    if (stripped.includes(base) || lower.includes(base)) {
      issues.push(`"${pwd}" is based on a common word — easy to guess`);
      break;
    }
  }
  for (const seq of SEQUENTIAL) {
    if (stripped.includes(seq)) { issues.push('Contains a predictable number or letter sequence'); break; }
  }
  if (/(.)\1{3,}/.test(lower)) issues.push('Contains too many repeated characters');
  for (const row of KEYBOARD_ROWS) {
    for (let i = 0; i <= row.length - 5; i++) {
      if (stripped.includes(row.slice(i, i + 5))) { issues.push('Keyboard pattern detected (e.g. "qwert")'); break; }
    }
  }

  const entropy = calculateEntropy(pwd);
  if (entropy < 30 && issues.length === 0) issues.push('Password is too predictable — try mixing unrelated words');

  // Score 0–4
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;  // special char
  if (entropy >= 50 && issues.length === 0) score++;

  // Penalise for pattern issues
  if (issues.some(i => i.includes('common') || i.includes('predictable') || i.includes('sequence') || i.includes('Keyboard') || i.includes('repeated'))) {
    score = Math.min(score, 1);
  }

  const levels: [number, StrengthLevel, string, string, string][] = [
    [0, 'very-weak',   'Very weak',   'text-red-500',    'bg-red-500'],
    [1, 'weak',        'Weak',         'text-orange-500', 'bg-orange-500'],
    [2, 'fair',        'Fair',         'text-yellow-500', 'bg-yellow-500'],
    [3, 'strong',      'Strong',       'text-emerald-500','bg-emerald-500'],
    [4, 'very-strong', 'Very strong',  'text-emerald-600','bg-emerald-600'],
  ];
  const [,level, label, color, barColor] = levels[Math.min(score, 4)];

  return { level, score, entropy, issues, label, color, barColor };
}

// ─── Password strength UI component ──────────────────────────────────────────
function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = useMemo(() => analysePassword(password), [password]);

  if (!password) return null;

  const filledBars = strength.score + 1; // 1–5 bars

  return (
    <div className="mt-2 space-y-2">
      {/* Bar meter */}
      <div className="flex gap-1 h-1.5">
        {[0,1,2,3,4].map(i => (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-full transition-all duration-300',
              i < filledBars ? strength.barColor : 'bg-muted',
            )}
          />
        ))}
      </div>

      {/* Label */}
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-medium', strength.color)}>
          {strength.label}
        </span>
        {strength.entropy > 0 && (
          <span className="text-xs text-muted-foreground">
            {Math.round(strength.entropy)} bits entropy
          </span>
        )}
      </div>

      {/* First issue only — avoid overwhelming the user */}
      {strength.issues.length > 0 && (
        <p className="text-xs text-destructive flex items-start gap-1">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{strength.issues[0]}</span>
        </p>
      )}

      {/* Positive reinforcement once strong */}
      {strength.score >= 3 && strength.issues.length === 0 && (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <span>✓</span> Good password
        </p>
      )}
    </div>
  );
}

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .refine(
      (pwd) => {
        const s = analysePassword(pwd);
        return s.score >= 2 && s.issues.length === 0;
      },
      { message: 'Password is too weak or uses a common pattern — see the strength guide below' },
    ),
  confirmPassword: z.string(),
  ageVerification: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm you are 18 years or older' }),
  }),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service' }),
  }),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Privacy Policy' }),
  }),
  marketingOptIn: z.boolean().optional(),
  referralCode: z
    .string()
    .trim()
    .max(32, 'Referral code is too long')
    .optional()
    .or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// Custom Checkbox Component - using button to avoid hydration issues
function FormCheckbox({
  checked,
  onChange,
  error,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="flex items-start gap-3 text-left w-full group"
      >
        <div
          className={cn(
            'flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-all',
            checked
              ? 'bg-primary border-primary'
              : error
              ? 'border-destructive'
              : 'border-input group-hover:border-primary/50'
          )}
        >
          {checked && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
        <span className="text-sm leading-tight">{children}</span>
      </button>
      {error && <p className="text-xs text-destructive ml-8">{error}</p>}
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const prefilledReferralCode = useMemo(
    () => searchParams.get('ref')?.trim().toUpperCase() ?? '',
    [searchParams],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      ageVerification: undefined as unknown as true,
      termsAccepted: undefined as unknown as true,
      privacyAccepted: undefined as unknown as true,
      marketingOptIn: false,
      referralCode: prefilledReferralCode,
    },
  });

  // Live password value for the strength meter
  const watchedPassword = useWatch({ control, name: 'password', defaultValue: '' });

  useEffect(() => {
    if (prefilledReferralCode) {
      setValue('referralCode', prefilledReferralCode, { shouldDirty: false });
    }
  }, [prefilledReferralCode, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await api.register({
        email: data.email,
        password: data.password,
        userType: 'veteran',
        referralCode: data.referralCode?.trim() || undefined,
      });
      toast.success('Account created! Please check your email to verify.');
      router.push(`/auth/verify-email?pending=true&email=${encodeURIComponent(data.email)}`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>Join VeteranFinder and start connecting</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="font-medium flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-primary" />
              Veteran-only platform
            </p>
            <p className="text-muted-foreground">
              VeteranFinder is now focused exclusively on verified veteran reconnection.
            </p>
          </div>

          <Input
            {...register('email')}
            type="email"
            label="Email"
            placeholder="you@example.com"
            error={errors.email?.message}
            autoComplete="email"
          />

          <div className="space-y-1">
            <Input
              {...register('referralCode')}
              type="text"
              label="Referral Code (Optional)"
              placeholder="VFABC1234"
              error={errors.referralCode?.message}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              If a verified veteran invited you, enter their code to link your signup.
            </p>
          </div>

          <div className="space-y-1">
            <Input
              {...register('password')}
              type="password"
              label="Password"
              placeholder="••••••••"
              error={errors.password?.message}
              autoComplete="new-password"
            />
            <PasswordStrengthMeter password={watchedPassword} />
          </div>

          <Input
            {...register('confirmPassword')}
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
          />

          {/* Age Verification & Consent Section */}
          <div className="space-y-4 pt-2 border-t">
            <p className="text-sm font-medium text-foreground">Confirmations</p>
            
            {/* Age Verification - Required */}
            <Controller
              name="ageVerification"
              control={control}
              render={({ field }) => (
                <FormCheckbox
                  checked={field.value === true}
                  onChange={(checked) => field.onChange(checked ? true : undefined)}
                  error={errors.ageVerification?.message}
                >
                  <span className="text-foreground">
                    I confirm that I am <strong>18 years of age or older</strong>
                  </span>
                </FormCheckbox>
              )}
            />

            {/* Terms of Service - Required */}
            <Controller
              name="termsAccepted"
              control={control}
              render={({ field }) => (
                <FormCheckbox
                  checked={field.value === true}
                  onChange={(checked) => field.onChange(checked ? true : undefined)}
                  error={errors.termsAccepted?.message}
                >
                  <span className="text-muted-foreground">
                    I have read and agree to the{' '}
                    <Link 
                      href="/terms" 
                      className="text-primary hover:underline" 
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms of Service
                    </Link>
                  </span>
                </FormCheckbox>
              )}
            />

            {/* Privacy Policy - Required */}
            <Controller
              name="privacyAccepted"
              control={control}
              render={({ field }) => (
                <FormCheckbox
                  checked={field.value === true}
                  onChange={(checked) => field.onChange(checked ? true : undefined)}
                  error={errors.privacyAccepted?.message}
                >
                  <span className="text-muted-foreground">
                    I have read and agree to the{' '}
                    <Link 
                      href="/privacy" 
                      className="text-primary hover:underline" 
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Privacy Policy
                    </Link>{' '}
                    and consent to the processing of my personal data
                  </span>
                </FormCheckbox>
              )}
            />

            {/* Marketing - Optional */}
            <Controller
              name="marketingOptIn"
              control={control}
              render={({ field }) => (
                <FormCheckbox
                  checked={field.value === true}
                  onChange={(checked) => field.onChange(checked)}
                >
                  <span className="text-muted-foreground">
                    I would like to receive updates, tips, and promotional emails from VeteranFinder{' '}
                    <span className="text-xs">(optional)</span>
                  </span>
                </FormCheckbox>
              )}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Create Account
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    }>
      <RegisterForm />
    </Suspense>
  );
}
