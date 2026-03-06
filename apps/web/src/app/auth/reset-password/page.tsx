'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { api } from '@/lib/api';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }

    setIsLoading(true);
    try {
      await api.resetPassword({ token, password: data.password });
      setIsSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reset password. The link may have expired.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Invalid Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/auth/forgot-password">
            <Button>Request New Link</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Password Reset!</CardTitle>
          <CardDescription>
            Your password has been successfully reset. You can now log in with your new password.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/auth/login">
            <Button>Go to Login</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <KeyRound className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Set New Password</CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <Input
            {...register('password')}
            type="password"
            label="New Password"
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
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Reset Password
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
