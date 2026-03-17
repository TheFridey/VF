'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import toast from 'react-hot-toast';

type VerificationState = 'pending' | 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [state, setState] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);
  const knownEmail = searchParams.get('email') || user?.email || 'your email address';

  useEffect(() => {
    const token = searchParams.get('token');
    const pending = searchParams.get('pending');

    // Redirected here because they haven't verified yet — no token in URL
    if (pending === 'true' && !token) {
      setState('pending');
      return;
    }

    if (!token) {
      setState('pending');
      return;
    }

    const verifyEmail = async () => {
      try {
        await api.verifyEmail(token);
        setState('success');
      } catch (error: any) {
        setState('error');
        setErrorMessage(error.response?.data?.message || 'Failed to verify email. The link may have expired.');
      }
    };

    verifyEmail();
  }, [searchParams]);

  const handleResend = async () => {
    if (!knownEmail || knownEmail === 'your email address') {
      toast.error('Return to registration or login to request a new email');
      return;
    }

    setResending(true);
    try {
      await api.resendVerificationEmail(knownEmail);
      toast.success('Verification email sent — check your inbox');
    } catch {
      toast.error('Failed to resend — please try again shortly');
    } finally {
      setResending(false);
    }
  };

  if (state === 'loading') {
    return (
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Verifying your email...</p>
        </CardContent>
      </Card>
    );
  }

  if (state === 'pending') {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We sent a verification link to <strong>{knownEmail}</strong>.
            Click the link in that email to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Didn't receive it? Check your spam folder, or request a new link below.
          </p>
        </CardContent>
        <CardFooter className="justify-center gap-3 flex-col">
          <Button onClick={handleResend} disabled={resending} className="w-full">
            {resending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</> : 'Resend verification email'}
          </Button>
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:underline">
            Back to login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (state === 'success') {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Email Verified</CardTitle>
          <CardDescription>
            Your account is now active. Welcome to VeteranFinder.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href={`/auth/login?verified=true&email=${encodeURIComponent(knownEmail)}`}>
            <Button>Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <CardTitle className="text-2xl">Verification Failed</CardTitle>
        <CardDescription>{errorMessage}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Verification links expire after 24 hours. Request a new one below.
        </p>
      </CardContent>
      <CardFooter className="justify-center gap-3">
        <Button onClick={handleResend} disabled={resending} variant="outline">
          {resending ? 'Sending...' : 'Resend email'}
        </Button>
        <Link href="/auth/login">
          <Button variant="ghost">Back to Login</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
