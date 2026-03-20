'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Users, Shield, MapPin, CheckCircle, Clock, XCircle, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { ForumShell, ForumStage, ForumPanel } from '@/components/bia/forum-shell';
import { useBiaPageAccess } from '@/hooks/use-bia-page-access';
import { cn, formatBranch, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

const SPECIALISMS = [
  'Leadership', 'Career Transition', 'Mental Health & Resilience', 'Business & Entrepreneurship',
  'Technology', 'Security Industry', 'Finance', 'Education', 'Physical Fitness', 'Legal',
];

export default function MentorshipPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const access = useBiaPageAccess('plus');
  const [tab, setTab] = useState<'find' | 'requests' | 'become'>('find');
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [mentorForm, setMentorForm] = useState({ specialisms: [] as string[], bio: '', availability: '' });

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
    enabled: access.canAccess,
  });
  const isBiaPlus = ['BIA_PLUS'].includes(subData?.tier);

  const { data: mentorsData, isLoading: mentorsLoading } = useQuery({
    queryKey: ['mentors'],
    queryFn: () => api.getMentors(),
    enabled: access.canAccess && isBiaPlus,
  });

  const { data: requestsData } = useQuery({
    queryKey: ['mentor-requests'],
    queryFn: () => api.getMentorRequests(),
    enabled: access.canAccess && isBiaPlus,
  });

  const sendRequestMutation = useMutation({
    mutationFn: () => api.sendMentorRequest(selectedMentor.id, requestMessage),
    onSuccess: () => {
      toast.success('Request sent!');
      setSelectedMentor(null);
      setRequestMessage('');
      queryClient.invalidateQueries({ queryKey: ['mentor-requests'] });
    },
    onError: () => toast.error('Failed to send request'),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => api.respondToMentorRequest(id, accept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-requests'] });
      toast.success('Response sent');
    },
  });

  const upsertProfileMutation = useMutation({
    mutationFn: () => api.upsertMentorProfile(mentorForm),
    onSuccess: () => {
      toast.success('Mentor profile saved!');
      queryClient.invalidateQueries({ queryKey: ['mentor-requests'] });
    },
    onError: () => toast.error('Failed to save profile'),
  });

  const mentors = mentorsData?.mentors || [];
  const incoming = requestsData?.incoming || [];
  const outgoing = requestsData?.outgoing || [];
  const myProfile = requestsData?.myProfile;

  if (access.shouldBlockRender) {
    return (
      <ForumStage>
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8 text-emerald-400" />
        </div>
      </ForumStage>
    );
  }

  return (
    <ForumStage>
      <ForumShell>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400/80">Brothers in Arms</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Mentorship</h1>
          <p className="mt-1 text-sm text-slate-300/80">Connect with experienced veterans for guidance and support.</p>
        </div>

        {!isBiaPlus && (
          <ForumPanel className="px-5 py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10">
              <Lock className="h-6 w-6 text-amber-300" />
            </div>
            <h2 className="text-lg font-semibold text-white">Mentorship requires BIA+</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-300/80">
              Connect with experienced veterans, offer your own expertise, and get guidance on career and life after service.
            </p>
            <button
              onClick={() => router.push('/app/premium')}
              className="mt-5 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
            >
              Upgrade to BIA+
            </button>
          </ForumPanel>
        )}

        {isBiaPlus && (
          <>
            <div className="flex gap-2 border-b border-white/10 pb-0">
              {([
                { key: 'find', label: 'Find a Mentor' },
                { key: 'requests', label: `My Requests${incoming.filter((r: any) => r.status === 'PENDING').length ? ` (${incoming.filter((r: any) => r.status === 'PENDING').length})` : ''}` },
                { key: 'become', label: myProfile ? 'My Profile' : 'Become a Mentor' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    tab === key
                      ? 'border-emerald-400 text-emerald-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'find' && (
              mentorsLoading ? (
                <div className="flex justify-center py-16">
                  <Spinner className="h-8 w-8 text-emerald-400" />
                </div>
              ) : mentors.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <Users className="mb-3 h-12 w-12 text-slate-500 opacity-30" />
                  <p className="text-sm text-slate-400">No mentors available yet. Be the first to offer mentorship.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {mentors.map((mentor: any) => (
                    <ForumPanel key={mentor.id} className="p-5 transition-all hover:border-emerald-400/25">
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <Avatar src={mentor.user?.profile?.profileImageUrl} fallback={mentor.user?.profile?.displayName?.[0]} className="h-12 w-12" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white">{mentor.user?.profile?.displayName}</p>
                            {mentor.user?.veteranDetails && (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-0.5 text-xs text-slate-300">
                                  <span className="inline-flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    {formatBranch(mentor.user.veteranDetails.branch)}
                                  </span>
                                </span>
                                {mentor.user.veteranDetails.rank && (
                                  <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-0.5 text-xs text-slate-300">
                                    {mentor.user.veteranDetails.rank}
                                  </span>
                                )}
                              </div>
                            )}
                            {mentor.user?.profile?.location && (
                              <p className="mt-2 flex items-center gap-1 text-xs text-slate-400/70">
                                <MapPin className="h-3 w-3" />
                                {mentor.user.profile.location}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="line-clamp-3 text-sm leading-6 text-slate-300/80">{mentor.bio}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {mentor.specialisms.slice(0, 3).map((s: string) => (
                            <span key={s} className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-xs text-emerald-300">
                              {s}
                            </span>
                          ))}
                          {mentor.specialisms.length > 3 && (
                            <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-0.5 text-xs text-slate-300">
                              +{mentor.specialisms.length - 3}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between border-t border-white/8 pt-2">
                          <span className="text-xs text-slate-400/70">{mentor.availability}</span>
                          <button
                            onClick={() => setSelectedMentor(mentor)}
                            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
                          >
                            Request mentorship
                          </button>
                        </div>
                      </div>
                    </ForumPanel>
                  ))}
                </div>
              )
            )}

            {tab === 'requests' && (
              <div className="space-y-6">
                {incoming.length > 0 && (
                  <section className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400/80">Incoming</p>
                      <h2 className="mt-1 text-xl font-bold text-white">Incoming Requests</h2>
                    </div>
                    <div className="space-y-3">
                      {incoming.map((req: any) => (
                        <ForumPanel key={req.id} className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar src={req.mentee?.profile?.profileImageUrl} fallback={req.mentee?.profile?.displayName?.[0]} className="h-10 w-10" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white">{req.mentee?.profile?.displayName}</p>
                              <p className="truncate text-sm text-slate-300/80">{req.message}</p>
                              <p className="mt-1 text-xs text-slate-400/70">{formatRelativeTime(req.createdAt)}</p>
                            </div>
                            {req.status === 'PENDING' ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => respondMutation.mutate({ id: req.id, accept: true })}
                                  className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-300 transition-colors hover:bg-emerald-400/20"
                                >
                                  <CheckCircle className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => respondMutation.mutate({ id: req.id, accept: false })}
                                  className="rounded-lg border border-red-400/20 bg-red-400/10 p-2 text-red-300 transition-colors hover:bg-red-400/20"
                                >
                                  <XCircle className="h-5 w-5" />
                                </button>
                              </div>
                            ) : (
                              <Badge className={req.status === 'ACCEPTED' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-white/12 bg-white/8 text-slate-300'}>
                                {req.status}
                              </Badge>
                            )}
                          </div>
                        </ForumPanel>
                      ))}
                    </div>
                  </section>
                )}

                {outgoing.length > 0 && (
                  <section className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400/80">Outgoing</p>
                      <h2 className="mt-1 text-xl font-bold text-white">My Requests</h2>
                    </div>
                    <div className="space-y-3">
                      {outgoing.map((req: any) => (
                        <ForumPanel key={req.id} className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar src={req.mentor?.user?.profile?.profileImageUrl} fallback="M" className="h-10 w-10" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white">{req.mentor?.user?.profile?.displayName}</p>
                              <p className="truncate text-sm text-slate-300/80">{req.message}</p>
                            </div>
                            <Badge className={
                              req.status === 'ACCEPTED' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' :
                                req.status === 'DECLINED' ? 'border-red-400/20 bg-red-400/10 text-red-300' :
                                  'border-amber-400/20 bg-amber-400/10 text-amber-300'
                            }
                            >
                              {req.status}
                            </Badge>
                          </div>
                        </ForumPanel>
                      ))}
                    </div>
                  </section>
                )}

                {incoming.length === 0 && outgoing.length === 0 && (
                  <div className="flex flex-col items-center py-20 text-center">
                    <Clock className="mb-3 h-12 w-12 text-slate-500 opacity-30" />
                    <p className="text-sm text-slate-400">No mentorship requests yet.</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'become' && (
              <ForumPanel className="p-5">
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400/80">Profile</p>
                    <h2 className="mt-1 text-xl font-bold text-white">{myProfile ? 'Update your mentor profile' : 'Become a mentor'}</h2>
                    <p className="mt-1 text-sm text-slate-300/80">
                      Share your experience and help fellow veterans navigate their next chapter.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-300/80">Your Specialisms</label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALISMS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setMentorForm((f) => ({
                            ...f,
                            specialisms: f.specialisms.includes(s)
                              ? f.specialisms.filter((x) => x !== s)
                              : [...f.specialisms, s],
                          }))}
                          className={cn(
                            'rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                            mentorForm.specialisms.includes(s)
                              ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
                              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200',
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300/80">Bio</label>
                    <textarea
                      value={mentorForm.bio}
                      onChange={(e) => setMentorForm((f) => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell mentees about your service history and what you can offer..."
                      rows={5}
                      className="w-full resize-none rounded-lg border border-white/15 bg-white/8 p-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300/80">Availability</label>
                    <input
                      value={mentorForm.availability}
                      onChange={(e) => setMentorForm((f) => ({ ...f, availability: e.target.value }))}
                      placeholder="e.g. Weekends, 1-2 hours/week"
                      className="w-full rounded-lg border border-white/15 bg-white/8 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  <Button
                    onClick={() => upsertProfileMutation.mutate()}
                    disabled={!mentorForm.bio || !mentorForm.availability || mentorForm.specialisms.length === 0 || upsertProfileMutation.isPending}
                    className="w-full bg-emerald-500 font-semibold text-black hover:bg-emerald-400"
                  >
                    {upsertProfileMutation.isPending ? <Spinner className="h-4 w-4" /> : myProfile ? 'Update Profile' : 'Register as Mentor'}
                  </Button>
                </div>
              </ForumPanel>
            )}
          </>
        )}

        <Modal isOpen={!!selectedMentor} onClose={() => setSelectedMentor(null)} title={`Request Mentorship - ${selectedMentor?.user?.profile?.displayName}`}>
          <div className="space-y-4">
            <p className="text-sm text-slate-300/80">Introduce yourself and explain what you're looking for help with.</p>
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Briefly describe your background, what stage you're at, and what you'd like guidance on..."
              rows={5}
              className="w-full resize-none rounded-lg border border-white/15 bg-white/8 p-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSelectedMentor(null)}>Cancel</Button>
              <Button
                onClick={() => sendRequestMutation.mutate()}
                disabled={requestMessage.length < 20 || sendRequestMutation.isPending}
                className="bg-emerald-500 font-semibold text-black hover:bg-emerald-400"
              >
                {sendRequestMutation.isPending ? <Spinner className="h-4 w-4" /> : 'Send Request'}
              </Button>
            </div>
          </div>
        </Modal>
      </ForumShell>
    </ForumStage>
  );
}
