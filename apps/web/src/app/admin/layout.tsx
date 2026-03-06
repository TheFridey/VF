'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  Flag,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

const sidebarItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/verification', label: 'Verification', icon: Shield },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/audit', label: 'Audit Logs', icon: FileText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, accessToken, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      router.push('/auth/login');
      return;
    }

    // Check if user has admin/moderator role
    if (user && !['ADMIN', 'MODERATOR'].includes(user.role)) {
      router.push('/app/brothers');
      return;
    }

    setIsLoading(false);
  }, [accessToken, user, router]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-background border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-lg">Admin</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-muted rounded-md"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                src={user.profile?.profileImageUrl}
                name={user.profile?.displayName || user.email}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.profile?.displayName || user.email}
                </p>
                <Badge variant={user.role === 'ADMIN' ? 'default' : 'outline'} className="text-xs">
                  {user.role}
                </Badge>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-background border-b flex items-center px-4 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-muted rounded-md"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-muted-foreground">
            <Link href="/admin/dashboard" className="hover:text-foreground">
              Admin
            </Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="text-foreground font-medium">
              {sidebarItems.find((item) => pathname.startsWith(item.href))?.label || 'Dashboard'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/app/brothers"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Back to App
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
