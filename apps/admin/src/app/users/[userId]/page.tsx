'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { ArrowLeft, Activity, Shield, Users, MessageCircle, Flag, Clock, Gift, Award } from 'lucide-react';
import toast from 'react-hot-toast';

const S = {
  page: { minHeight: '100vh', background: '#060a12', color: '#c8d6e5', fontFamily: "'Barlow', sans-serif", padding: 32 },
  card: { background: '#0d1524', border: '1px solid #1a2636', borderRadius: 10, padding: 24, marginBottom: 20 },
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a5068', letterSpacing: 2, textTransform: 'uppercase' as const },
  h1: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color: '#dce8f5', letterSpacing: 0.5 },
  h2: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#dce8f5', letterSpacing: 0.5, marginBottom: 16 },
  badge: (c: string) => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, padding: '3px 8px', borderRadius: 3, background: `${c}18`, color: c, border: `1px solid ${c}30`, display: 'inline-block' }),
  statCard: { background: '#060a12', border: '1px solid #141f2e', borderRadius: 8, padding: '14px 18px', display: 'flex', flexDirection: 'column' as const, gap: 4 },
  logRow: { display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #0d1524', alignItems: 'flex-start' as const },
  mono: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 },
};

const roleColor: Record<string, string> = { ADMIN: '#d4a853', MODERATOR: '#a78bfa', VETERAN_VERIFIED: '#34d399', VETERAN_MEMBER: '#60a5fa', VETERAN_UNVERIFIED: '#6b7f96', CIVILIAN: '#6b7f96' };
const statusColor: Record<string, string> = { ACTIVE: '#34d399', PENDING: '#fbbf24', SUSPENDED: '#f97316', BANNED: '#f87171', DELETED: '#6b7280' };

const actionIcon = (action: string) => {
  if (action.includes('login')) return '🔑';
  if (action.includes('ban') || action.includes('suspend')) return '🔴';
  if (action.includes('verif')) return '✅';
  if (action.includes('password')) return '🔐';
  if (action.includes('role')) return '🛡';
  if (action.includes('message')) return '💬';
  if (action.includes('report')) return '⚠️';
  return '📋';
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function UserDetailPage() {
  const { userId } = useParams() as { userId: string };
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [membershipTier, setMembershipTier] = useState<'BIA_BASIC' | 'BIA_PLUS'>('BIA_BASIC');
  const [membershipDuration, setMembershipDuration] = useState<'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'>('WEEK');
  const [grantingMembership, setGrantingMembership] = useState(false);

  const loadUser = async () => {
    setLoading(true);
    try {
      const nextUser = await adminApi.getUserDetails(userId);
      setUser(nextUser);
    } catch {
      toast.error('Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadUser();
  }, [userId]);

  const handleGrantMembership = async () => {
    setGrantingMembership(true);
    try {
      await adminApi.grantUserMembership(userId, {
        tier: membershipTier,
        duration: membershipDuration,
      });
      toast.success('Timed membership access granted');
      await loadUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to grant membership');
    } finally {
      setGrantingMembership(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...S.mono, color: '#3a5068', fontSize: 13 }}>Loading user...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <button onClick={() => router.push('/users')}
            style={{ background: '#0d1524', border: '1px solid #1a2636', borderRadius: 6, padding: '7px 10px', color: '#5a7a9a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <ArrowLeft size={14} /> Users
          </button>
          <div>
            <div style={S.label}>User Detail</div>
            <h1 style={S.h1}>{user.profile?.displayName || user.email}</h1>
          </div>
        </div>

        {/* Identity card */}
        <div style={S.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ ...S.label, marginBottom: 8 }}>Identity</div>
              <div style={{ ...S.mono, fontSize: 12, color: '#7a9bb5', lineHeight: 2.2 }}>
                <div>Email: <span style={{ color: '#c8d6e5' }}>{user.email}</span></div>
                <div>ID: <span style={{ color: '#3a5068' }}>{user.id}</span></div>
                <div>Joined: <span style={{ color: '#c8d6e5' }}>{new Date(user.createdAt).toLocaleDateString('en-GB')}</span></div>
                <div>Last Active: <span style={{ color: '#c8d6e5' }}>{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString('en-GB') : 'Never'}</span></div>
              </div>
            </div>
            <div>
              <div style={{ ...S.label, marginBottom: 8 }}>Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <span style={S.badge(roleColor[user.role] || '#6b7f96')}>{user.role}</span>
                <span style={S.badge(statusColor[user.status] || '#6b7f96')}>{user.status}</span>
                {user.emailVerified && <span style={S.badge('#34d399')}>EMAIL VERIFIED</span>}
              </div>
              {user.veteranDetails && (
                <div style={{ ...S.mono, fontSize: 11, color: '#5a7a9a' }}>
                  {user.veteranDetails.branch} · {user.veteranDetails.rank || '—'} · {user.veteranDetails.regiment || '—'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ ...S.card, border: '1px solid #27415f' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Award size={15} color="#d4a853" />
                <h2 style={{ ...S.h2, marginBottom: 0 }}>Membership Access</h2>
              </div>
              <div style={{ ...S.mono, fontSize: 12, color: '#7a9bb5', lineHeight: 2 }}>
                <div>Effective tier: <span style={{ color: '#dce8f5' }}>{user.membershipSummary?.tier || 'FREE'}</span></div>
                <div>Base tier: <span style={{ color: '#dce8f5' }}>{user.membershipSummary?.baseTier || 'FREE'}</span></div>
                <div>Status: <span style={{ color: '#dce8f5' }}>{user.membershipSummary?.status || 'UNKNOWN'}</span></div>
                <div>
                  Access until:{' '}
                  <span style={{ color: '#dce8f5' }}>
                    {user.membershipSummary?.currentPeriodEnd
                      ? new Date(user.membershipSummary.currentPeriodEnd).toLocaleString('en-GB')
                      : 'No paid access window'}
                  </span>
                </div>
                <div>
                  Active timed grants:{' '}
                  <span style={{ color: '#dce8f5' }}>{user.membershipSummary?.activeGrants?.length || 0}</span>
                </div>
              </div>

              {user.membershipSummary?.activeGrants?.length > 0 && (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {user.membershipSummary.activeGrants.slice(0, 4).map((grant: any) => (
                    <div key={grant.id} style={{ background: '#060a12', border: '1px solid #141f2e', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ ...S.mono, fontSize: 11, color: '#dce8f5' }}>{grant.tier}</span>
                        <span style={S.badge(grant.source === 'ADMIN' ? '#d4a853' : '#34d399')}>{grant.source}</span>
                      </div>
                      <div style={{ ...S.mono, fontSize: 10, color: '#5a7a9a', marginTop: 6 }}>
                        {grant.label || 'Timed access grant'} · ends {new Date(grant.endsAt).toLocaleString('en-GB')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div style={{ ...S.label, marginBottom: 8 }}>Grant Timed Access</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select
                  value={membershipTier}
                  onChange={(event) => setMembershipTier(event.target.value as 'BIA_BASIC' | 'BIA_PLUS')}
                  style={{ background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '10px 12px', color: '#c8d6e5', fontSize: 12 }}
                >
                  <option value="BIA_BASIC">BIA</option>
                  <option value="BIA_PLUS">BIA+</option>
                </select>
                <select
                  value={membershipDuration}
                  onChange={(event) => setMembershipDuration(event.target.value as 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR')}
                  style={{ background: '#060c17', border: '1px solid #1a2636', borderRadius: 6, padding: '10px 12px', color: '#c8d6e5', fontSize: 12 }}
                >
                  <option value="DAY">1 day</option>
                  <option value="WEEK">1 week</option>
                  <option value="MONTH">1 month</option>
                  <option value="QUARTER">3 months</option>
                  <option value="YEAR">1 year</option>
                </select>
                <button
                  type="button"
                  onClick={handleGrantMembership}
                  disabled={grantingMembership}
                  style={{ background: '#d4a853', border: 'none', borderRadius: 8, padding: '10px 14px', color: '#060a12', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: grantingMembership ? 0.7 : 1 }}
                >
                  {grantingMembership ? 'Granting...' : 'Grant access'}
                </button>
                <p style={{ ...S.mono, fontSize: 10, color: '#3a5068', lineHeight: 1.5 }}>
                  This adds a timed BIA access grant on top of any existing Stripe membership. New time stacks onto any live grant window.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {user.stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { icon: Users,         label: 'Connections',  val: user.stats.connectionCount },
              { icon: MessageCircle, label: 'Messages Sent', val: user.stats.messageCount },
              { icon: Flag,          label: 'Reports Made',  val: user.stats.reportsMadeCount },
              { icon: Shield,        label: 'Reports Rcvd',  val: user.stats.reportsReceivedCount },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} style={S.statCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={13} color="#3a5068" />
                  <span style={S.label}>{label}</span>
                </div>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 700, color: '#dce8f5', lineHeight: 1 }}>{val ?? 0}</span>
              </div>
            ))}
          </div>
        )}

        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Gift size={15} color="#34d399" />
            <h2 style={{ ...S.h2, marginBottom: 0 }}>Referral Progress</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={S.statCard}>
              <span style={S.label}>Code</span>
              <span style={{ ...S.mono, fontSize: 13, color: '#dce8f5' }}>{user.referralSummary?.referralCode || 'Unavailable'}</span>
            </div>
            <div style={S.statCard}>
              <span style={S.label}>Verified</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 700, color: '#dce8f5', lineHeight: 1 }}>
                {user.referralSummary?.qualifiedCount ?? 0}
              </span>
            </div>
            <div style={S.statCard}>
              <span style={S.label}>Pending</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 700, color: '#dce8f5', lineHeight: 1 }}>
                {user.referralSummary?.pendingCount ?? 0}
              </span>
            </div>
          </div>

          {user.referralSummary?.rewards?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {user.referralSummary.rewards.map((reward: any) => (
                <div key={reward.id} style={{ background: '#060a12', border: '1px solid #141f2e', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ ...S.mono, fontSize: 11, color: '#dce8f5' }}>{reward.label || reward.tier}</span>
                    <span style={S.badge('#34d399')}>{reward.tier}</span>
                  </div>
                  <div style={{ ...S.mono, fontSize: 10, color: '#5a7a9a', marginTop: 6 }}>
                    Starts {new Date(reward.startsAt).toLocaleDateString('en-GB')} · ends {new Date(reward.endsAt).toLocaleDateString('en-GB')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...S.mono, color: '#3a5068', textAlign: 'center', padding: '12px 0' }}>
              No referral rewards unlocked yet
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Activity size={15} color="#d4a853" />
            <h2 style={{ ...S.h2, marginBottom: 0 }}>Activity Log</h2>
            <span style={{ ...S.label, marginLeft: 'auto' }}>Last 30 events</span>
          </div>

          {(!user.activityLog || user.activityLog.length === 0) ? (
            <div style={{ ...S.mono, color: '#3a5068', textAlign: 'center', padding: '24px 0' }}>No activity recorded</div>
          ) : (
            user.activityLog.map((event: any, i: number) => (
              <div key={event.id || i} style={S.logRow}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{actionIcon(event.action)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ ...S.mono, fontSize: 12, color: '#c8d6e5', fontWeight: 500 }}>
                      {event.action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                    {event.resource && (
                      <span style={S.badge('#4a9eff')}>{event.resource}</span>
                    )}
                  </div>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div style={{ ...S.mono, fontSize: 10, color: '#3a5068', marginTop: 3 }}>
                      {Object.entries(event.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </div>
                  )}
                  {event.ipAddress && (
                    <div style={{ ...S.mono, fontSize: 10, color: '#1e2e42', marginTop: 2 }}>
                      IP: {event.ipAddress}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <Clock size={10} color="#1e2e42" />
                  <span style={{ ...S.mono, fontSize: 10, color: '#1e2e42' }}>{timeAgo(event.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Ban reason */}
        {user.banReason && (
          <div style={{ ...S.card, border: '1px solid #f8717130' }}>
            <div style={S.label}>Ban Reason</div>
            <div style={{ ...S.mono, fontSize: 13, color: '#f87171', marginTop: 8 }}>{user.banReason}</div>
            {user.banExpiresAt && (
              <div style={{ ...S.mono, fontSize: 11, color: '#3a5068', marginTop: 4 }}>
                Expires: {new Date(user.banExpiresAt).toLocaleDateString('en-GB')}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
