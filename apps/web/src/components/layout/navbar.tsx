'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users, MessageCircle, User, Settings, LogOut, Shield, Menu, X,
  BookOpen, Briefcase, Award, ChevronDown, Building2, LayoutDashboard, Bell,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { getBiaAccessState } from '@/lib/bia-access';
import { useQuery } from '@tanstack/react-query';
import { VeteranFinderLogo } from '@/components/brand/veteranfinder-logo';
import { UrgentHelpButton } from '@/components/support/urgent-help-button';

const biaMenuItems = [
  { href: '/app/bia/forums',     label: 'Forums',             icon: BookOpen,   description: 'Private veteran discussions', requiredAccess: 'forums' },
  { href: '/app/bia/directory',  label: 'Business Directory', icon: Building2,  description: 'Veteran-owned businesses and jobs', requiredAccess: 'public' },
  { href: '/app/bia/mentorship', label: 'Mentorship',         icon: Users,      description: 'Connect with mentors',         requiredAccess: 'plus' },
  { href: '/app/bia/careers',    label: 'Career Resources',   icon: Briefcase,  description: 'Jobs and career support',      requiredAccess: 'plus' },
];

function BIADropdown({
  canSeeBia,
  hasForumsAccess,
  hasBiaPlusAccess,
}: {
  canSeeBia: boolean;
  hasForumsAccess: boolean;
  hasBiaPlusAccess: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = pathname.startsWith('/app/bia');

  const enter = () => { if (timeout.current) clearTimeout(timeout.current); setOpen(true); };
  const leave = () => { timeout.current = setTimeout(() => setOpen(false), 150); };
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);

  if (!canSeeBia) return null;

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button className={cn(
        'flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors',
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}>
        <Award className="h-4 w-4" />
        <span>Brothers in Arms</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 rounded-lg border bg-popover shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 bg-primary/5 border-b">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">BIA Community</p>
            {!hasForumsAccess && <p className="text-xs text-muted-foreground mt-0.5">Choose a plan to unlock BIA access</p>}
            {hasForumsAccess && !hasBiaPlusAccess && <p className="text-xs text-muted-foreground mt-0.5">Some features require BIA+ membership</p>}
          </div>
          <div className="p-1.5">
            {biaMenuItems.map((item) => {
              const Icon = item.icon;
              const locked = item.requiredAccess === 'plus'
                ? !hasBiaPlusAccess
                : item.requiredAccess === 'forums'
                  ? !hasForumsAccess
                  : false;
              const badgeLabel = item.requiredAccess === 'plus' ? 'BIA+' : 'BIA';
              return (
                <Link key={item.href} href={locked ? '/app/premium' : item.href} onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-start space-x-3 px-3 py-2.5 rounded-md transition-colors group',
                    'hover:bg-accent',
                    locked && 'opacity-60',
                    pathname === item.href && 'bg-primary/10',
                  )}
                >
                  <div className={cn(
                    'mt-0.5 p-1.5 rounded-md transition-colors',
                    pathname === item.href ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      {locked && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-2">{badgeLabel}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          {!hasBiaPlusAccess && (
            <div className="p-3 border-t bg-muted/30">
              <Link href="/app/premium" onClick={() => setOpen(false)}
                className="flex items-center justify-center w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                <Award className="h-3.5 w-3.5 mr-1.5" />
                View BIA Plans
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserDropdown({ user, membership, onLogout }: { user: any; membership: any; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMember = membership?.tier !== 'FREE';

  const enter = () => { if (timeout.current) clearTimeout(timeout.current); setOpen(true); };
  const leave = () => { timeout.current = setTimeout(() => setOpen(false), 200); };

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => { document.removeEventListener('mousedown', close); if (timeout.current) clearTimeout(timeout.current); };
  }, []);

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 rounded-full px-1 py-1 hover:bg-accent transition-colors">
        <Avatar src={user?.profile?.profileImageUrl} name={user?.profile?.displayName || user?.email} size="sm" />
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-64 rounded-lg border bg-popover shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center space-x-3">
              <Avatar src={user?.profile?.profileImageUrl} name={user?.profile?.displayName || user?.email} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.profile?.displayName || 'Veteran'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                {isMember && (
                  <Badge className="mt-1 h-4 text-[10px] bg-primary/10 text-primary border border-primary/30 px-1.5">
                    <Award className="h-2.5 w-2.5 mr-0.5" />
                    {membership?.tier === 'BIA_PLUS' ? 'BIA+' : 'BIA Member'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="p-1.5">
            {[
              { href: '/app',          label: 'Dashboard',  icon: LayoutDashboard },
              { href: '/app/profile',  label: 'My Profile', icon: User            },
              { href: '/app/settings', label: 'Settings',   icon: Settings        },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{label}</span>
              </Link>
            ))}
            {!isMember && (
              <Link href="/app/premium" onClick={() => setOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-primary">
                <Award className="h-4 w-4" />
                <span>Get BIA Access</span>
              </Link>
            )}
          </div>

          <div className="p-1.5 border-t">
            <button onClick={() => { setOpen(false); onLogout(); }}
              className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm hover:bg-destructive/10 hover:text-destructive transition-colors w-full text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileBIAOpen, setMobileBIAOpen] = useState(false);

  const { data: unreadCounts } = useQuery({
    queryKey: ['unreadCounts'],
    queryFn: () => api.getUnreadCounts(),
    refetchInterval: 30000,
    enabled: !!user?.id,
  });
  const { data: membership } = useQuery({
    queryKey: ['membership'],
    queryFn: () => api.getSubscription(),
    enabled: !!user?.id,
  });

  const totalUnread = unreadCounts?.total || 0;
  const isBiaPlus = membership?.tier === 'BIA_PLUS';
  const biaAccess = getBiaAccessState(user?.role, membership?.tier);
  const hasPaidMembership = membership?.tier !== 'FREE';
  const isAdmin = user?.role === 'ADMIN';
  const isModerator = user?.role === 'MODERATOR';
  const isVeteran = user?.role?.includes('VETERAN') || isAdmin || isModerator;
  const showPremiumCta = biaAccess.canSeeBia && !isBiaPlus && !biaAccess.isStaff;

  const handleLogout = async () => {
    try { await api.logout(); } catch { /* ignore */ } finally {
      logout();
      window.location.href = '/auth/login';
    }
  };

  const navLink = (href: string, label: string, Icon: any, exact = false) => {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link href={href} className={cn(
        'flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}>
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </Link>
    );
  };

  const premiumLink = (mobile = false) => {
    const active = pathname === '/app/premium';
    return (
      <Link href="/app/premium" className={cn(
        'flex items-center justify-center space-x-1.5 rounded-md text-sm font-semibold transition-colors',
        mobile
          ? active
            ? 'bg-primary text-primary-foreground px-4 py-3'
            : 'bg-primary/10 text-primary hover:bg-primary/15 px-4 py-3'
          : active
            ? 'bg-primary text-primary-foreground px-4 py-2'
            : 'bg-primary/10 text-primary hover:bg-primary/15 px-4 py-2',
      )}>
        <Award className="h-4 w-4" />
        <span>Premium</span>
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/app" className="flex items-center space-x-2.5 shrink-0">
            <VeteranFinderLogo
              priority
              markClassName="h-7 sm:h-8"
              textClassName="hidden text-lg font-bold tracking-tight text-foreground sm:inline"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-0.5 flex-1">
            {navLink('/app', 'Home', LayoutDashboard, true)}
            {isVeteran && navLink('/app/brothers', 'Find Veterans', Users)}
            {navLink('/app/connections', 'Connections', Shield)}

            {/* Messages with badge */}
            <Link href="/app/messages" className={cn(
              'flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors relative',
              pathname.startsWith('/app/messages') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}>
              <MessageCircle className="h-4 w-4" />
              <span>Messages</span>
              {totalUnread > 0 && (
                <span className="absolute -top-0.5 right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </Link>

            <BIADropdown
              canSeeBia={biaAccess.canSeeBia}
              hasForumsAccess={biaAccess.hasForumsAccess}
              hasBiaPlusAccess={biaAccess.hasBiaPlusAccess}
            />
            {showPremiumCta && premiumLink()}
            <UrgentHelpButton compact className="shrink-0" />
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-1.5">
            <button className="hidden md:flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors">
              <Bell className="h-4 w-4" />
            </button>
            <div className="hidden md:block">
              <UserDropdown user={user} membership={membership} onLogout={handleLogout} />
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-accent transition-colors">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t pb-4 pt-2 space-y-0.5">
            {[
              { href: '/app', label: 'Home', icon: LayoutDashboard, exact: true },
              ...(isVeteran ? [{ href: '/app/brothers', label: 'Find Veterans', icon: Users, exact: false }] : []),
              { href: '/app/connections', label: 'Connections', icon: Shield, exact: false },
            ].map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                  className={cn('flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-colors',
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent')}>
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </Link>
              );
            })}

            {showPremiumCta && premiumLink(true)}
            <UrgentHelpButton label="Need help" onOpen={() => setMobileMenuOpen(false)} />

            {/* Messages */}
            <Link href="/app/messages" onClick={() => setMobileMenuOpen(false)}
              className={cn('flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith('/app/messages') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent')}>
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-5 w-5" />
                <span>Messages</span>
              </div>
              {totalUnread > 0 && <Badge variant="destructive" className="h-5 text-xs">{totalUnread > 99 ? '99+' : totalUnread}</Badge>}
            </Link>

            {/* BIA expandable */}
            {biaAccess.canSeeBia && (
              <>
                <button onClick={() => setMobileBIAOpen(!mobileBIAOpen)}
                  className={cn('flex items-center justify-between w-full px-4 py-3 rounded-md text-sm font-medium transition-colors',
                    pathname.startsWith('/app/bia') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent')}>
                  <div className="flex items-center space-x-3">
                    <Award className="h-5 w-5" />
                    <span>Brothers in Arms</span>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', mobileBIAOpen && 'rotate-180')} />
                </button>
                {mobileBIAOpen && (
                  <div className="ml-4 pl-4 border-l space-y-0.5">
                    {biaMenuItems.map(({ href, label, icon: Icon, requiredAccess }) => {
                      const locked = requiredAccess === 'plus'
                        ? !biaAccess.hasBiaPlusAccess
                        : requiredAccess === 'forums'
                          ? !biaAccess.hasForumsAccess
                          : false;
                      const badgeLabel = requiredAccess === 'plus' ? 'BIA+' : 'BIA';
                      return (
                        <Link key={href} href={locked ? '/app/premium' : href} onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors">
                          <div className="flex items-center space-x-2.5">
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                          </div>
                          {locked && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{badgeLabel}</Badge>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* User section */}
            <div className="border-t my-2 pt-2">
              <div className="flex items-center space-x-3 px-4 py-2 mb-1">
                <Avatar src={user?.profile?.profileImageUrl} name={user?.profile?.displayName || user?.email} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user?.profile?.displayName || 'Veteran'}</p>
                  {hasPaidMembership && <p className="text-xs text-primary font-medium">{isBiaPlus ? 'BIA+ Member' : 'BIA Member'}</p>}
                </div>
              </div>
              {[
                { href: '/app/profile',  label: 'My Profile', icon: User     },
                { href: '/app/settings', label: 'Settings',   icon: Settings },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </Link>
              ))}
              <button onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full">
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
