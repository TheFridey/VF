'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getBiaAccessState } from '@/lib/bia-access';
import { useAuthStore } from '@/stores/auth-store';

type RequiredAccess = 'forums' | 'plus';

export function useBiaPageAccess(requiredAccess: RequiredAccess) {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: membership, isLoading: isMembershipLoading } = useQuery({
    queryKey: ['membership'],
    queryFn: () => api.getSubscription(),
    enabled: !!user?.id,
  });

  const access = getBiaAccessState(user?.role, membership?.tier);
  const canAccess = requiredAccess === 'forums' ? access.hasForumsAccess : access.hasBiaPlusAccess;
  const isCheckingAccess = !!user?.id && isMembershipLoading;

  let redirectTarget: string | null = null;
  if (user?.id && !isCheckingAccess) {
    if (!access.canSeeBia) redirectTarget = '/app';
    else if (!canAccess) redirectTarget = '/app/premium';
  }

  useEffect(() => {
    if (!redirectTarget) return;
    router.replace(redirectTarget);
  }, [redirectTarget, router]);

  return {
    ...access,
    membership,
    canAccess,
    isCheckingAccess,
    redirectTarget,
    shouldBlockRender: isCheckingAccess || !!redirectTarget,
  };
}
