'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { api } from '@/lib/api';

type VerificationState = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setState('error');
      setErrorMessage('No verification token provided');
      return;
    }

    const verifyEmail = async () => {
      try {
        await api.verifyEmail(token);
        setState('success');
      } catch (error: any) {
        setState('error');
        setErrorMessage(
          error.response?.data?.message || 'Failed to verify email. The link may have expired.'
        );
      }
    };

    verifyEmail();
  }, [searchParams]);

  if (state === 'loading') {
    return (
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Verifying your email...</p>
        </CardContent>
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
          <CardTitle className="text-2xl">Email Verified!</CardTitle>
          <CardDescription>
            Your email has been successfully verified. You can now access all features.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/app/brothers">
            <Button>Get Started</Button>
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
          If your link has expired, you can request a new verification email from your account settings.
        </p>
      </CardContent>
      <CardFooter className="justify-center space-x-4">
        <Link href="/auth/login">
          <Button variant="outline">Back to Login</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
