'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Navbar } from './navbar';
import { FloatingChatDock } from '@/components/messaging/floating-chat-dock';
import { PushNotificationSetup } from '@/components/notifications/push-notification-setup';
import { IncomingCallProvider } from '@/components/video/incoming-call-provider';
import { Loader2 } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, setUser, logout, setLoading, _hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !_hasHydrated || checked) return;

    let active = true;

    const validateSession = async () => {
      setLoading(true);

      try {
        const fetchedUser = await api.getMe();
        if (!active) return;

        setUser(fetchedUser);

        if (!fetchedUser.emailVerified) {
          router.replace('/auth/verify-email?pending=true');
        } else if (!(fetchedUser as any).profile?.displayName && !pathname.startsWith('/app/onboarding')) {
          router.replace('/app/onboarding');
        }
      } catch {
        if (!active) return;

        logout();
        queryClient.clear();
        router.replace('/auth/login');
      } finally {
        if (!active) return;

        setLoading(false);
        setChecked(true);
      }
    };

    void validateSession();

    return () => {
      active = false;
    };
  }, [checked, logout, mounted, pathname, queryClient, router, setLoading, setUser, _hasHydrated]);

  // Show spinner until we've confirmed auth state
  if (!mounted || !_hasHydrated || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isFullBleedRoute = pathname.startsWith('/app/bia/forums')
    || pathname === '/app'
    || pathname === '/app/bia/directory'
    || pathname === '/app/bia/mentorship'
    || pathname === '/app/bia/careers'
    || pathname === '/app/brothers'
    || pathname === '/app/messages'
    || pathname.startsWith('/app/video')
    || pathname === '/app/connections'
    || pathname === '/app/premium';
  const showFloatingChatDock = pathname !== '/app/onboarding' && !pathname.startsWith('/app/messages') && !pathname.startsWith('/app/video');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className={cn(
        isFullBleedRoute
          ? 'w-full max-w-none px-0 py-0'
          : 'container mx-auto px-4 py-6',
      )}>
        {children}
      </main>
      <PushNotificationSetup />
      <IncomingCallProvider />
      {showFloatingChatDock && <FloatingChatDock />}
    </div>
  );
}
