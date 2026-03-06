'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
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
  const { setUser, setTokens } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
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
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await api.register({
        email: data.email,
        password: data.password,
        userType: 'veteran',
      });
      setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      toast.success('Account created! Please check your email to verify.');
      router.push('/app/profile');
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

          <Input
            {...register('password')}
            type="password"
            label="Password"
            placeholder="••••••••"
            error={errors.password?.message}
            hint="Min 8 characters with uppercase, lowercase, and number"
            autoComplete="new-password"
          />

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
