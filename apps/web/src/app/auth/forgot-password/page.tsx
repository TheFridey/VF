'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { api } from '@/lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await api.forgotPassword(data.email);
      setEmailSent(true);
      toast.success('Check your email for reset instructions');
    } catch (error: any) {
      // Don't reveal if email exists or not for security
      setEmailSent(true);
      toast.success('If an account exists, reset instructions have been sent');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>
            We&apos;ve sent password reset instructions to{' '}
            <strong>{getValues('email')}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or try again.
          </p>
          <Button
            variant="outline"
            onClick={() => setEmailSent(false)}
            className="w-full"
          >
            Try Another Email
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/auth/login"
            className="text-sm text-primary hover:underline flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Forgot Password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you reset instructions
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <Input
            {...register('email')}
            type="email"
            label="Email"
            placeholder="you@example.com"
            error={errors.email?.message}
            autoComplete="email"
          />
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Send Reset Link
          </Button>
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to login
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
