'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { Navbar } from './navbar';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { user, isLoading, setUser, setLoading, isAuthenticated, accessToken, _hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Wait for component to mount (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Don't run auth check until hydration is complete
    if (!mounted || !_hasHydrated) return;

    const initAuth = async () => {
      if (!accessToken) {
        setLoading(false);
        router.push('/auth/login');
        return;
      }

      if (!user && accessToken) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Auth check failed:', error);
          router.push('/auth/login');
        }
      } else {
        setLoading(false);
      }
    };

    initAuth();
  }, [accessToken, user, setUser, setLoading, router, mounted, _hasHydrated]);

  // Show loading state until mounted and hydrated
  if (!mounted || !_hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
