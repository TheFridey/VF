'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  Sparkles,
  Crown,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

const navItems = [
  { href: '/app/brothers', label: 'Reconnect', icon: Users, veteransOnly: true },
  { href: '/app/matches', label: 'Connections', icon: Sparkles },
  { href: '/app/messages', label: 'Messages', icon: MessageCircle },
  { href: '/app/profile', label: 'Profile', icon: User },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: unreadCounts } = useQuery({
    queryKey: ['unreadCounts'],
    queryFn: () => api.getUnreadCounts(),
    refetchInterval: 30000,
    enabled: !!user,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
    enabled: !!user,
  });

  const totalUnread = unreadCounts?.total || 0;
  const isPremium = subscription?.tier !== 'FREE';

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      window.location.href = '/auth/login';
    }
  };

  const isVeteran = user?.role?.includes('VETERAN');
  const isVerified = user?.role === 'VETERAN_VERIFIED' || user?.role === 'VETERAN_PAID';

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/app/brothers" className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold hidden sm:inline">VeteranFinder</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              // Only show Brothers tab for veterans
              if (item.veteransOnly && !isVeteran) return null;

              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              const showBadge = item.href === '/app/messages' && totalUnread > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors relative',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {showBadge && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </Badge>
                  )}
                </Link>
              );
            })}
            
            {/* Premium Button */}
            {!isPremium && (
              <Link
                href="/app/premium"
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700',
                  pathname === '/app/premium' && 'ring-2 ring-yellow-400 ring-offset-2'
                )}
              >
                <Crown className="h-4 w-4" />
                <span>Premium</span>
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isPremium && (
              <Badge className="hidden sm:flex bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
            
            {isVerified && !isPremium && (
              <Badge variant="success" className="hidden sm:flex">
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}

            <Link
              href="/app/settings"
              className="hidden md:flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <Avatar
                src={user?.profile?.profileImageUrl}
                name={user?.profile?.displayName || user?.email}
                size="sm"
              />
            </Link>

            <button
              onClick={handleLogout}
              className="hidden md:flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-accent"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {navItems.map((item) => {
              if (item.veteransOnly && !isVeteran) return null;

              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              const showBadge = item.href === '/app/messages' && totalUnread > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  {showBadge && (
                    <Badge variant="destructive" className="ml-auto">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </Badge>
                  )}
                </Link>
              );
            })}
            
            {/* Mobile Premium Button */}
            {!isPremium && (
              <Link
                href="/app/premium"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium bg-gradient-to-r from-yellow-500 to-yellow-600 text-white"
              >
                <Crown className="h-5 w-5" />
                <span>Upgrade to Premium</span>
              </Link>
            )}
            
            <div className="border-t my-2" />
            <Link
              href="/app/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
