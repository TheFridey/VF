'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { accessToken, user, _hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !_hasHydrated) return;
    
    if (!accessToken || !user) {
      router.push('/auth/login');
    } else if (!['ADMIN', 'MODERATOR'].includes(user.role)) {
      router.push('/auth/login');
    }
  }, [accessToken, user, router, mounted, _hasHydrated]);

  if (!mounted || !_hasHydrated || !accessToken || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
