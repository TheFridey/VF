'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Users, Shield, MapPin, CheckCircle, Clock, XCircle, Plus, Star, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { formatBranch, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

const SPECIALISMS = [
  'Leadership', 'Career Transition', 'Mental Health & Resilience', 'Business & Entrepreneurship',
  'Technology', 'Security Industry', 'Finance', 'Education', 'Physical Fitness', 'Legal',
];

export default function MentorshipPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'find' | 'requests' | 'become'>('find');
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [mentorForm, setMentorForm] = useState({ specialisms: [] as string[], bio: '', availability: '' });

  const { data: subData } = useQuery({ queryKey: ['subscription'], queryFn: () => api.getSubscription() });
  const isBiaPlus = ['BIA_PLUS', 'BUNDLE_PREMIUM_BIA'].includes(subData?.tier);

  const { data: mentorsData, isLoading: mentorsLoading } = useQuery({
    queryKey: ['mentors'],
    queryFn: () => api.getMentors(),
    enabled: isBiaPlus,
  });

  const { data: requestsData } = useQuery({
    queryKey: ['mentor-requests'],
    queryFn: () => api.getMentorRequests(),
    enabled: isBiaPlus,
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

  if (!isBiaPlus) return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-gray-800/60 border border-amber-600/30 rounded-xl p-8 text-center space-y-4">
        <Lock className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Mentorship Tools</h2>
        <p className="text-gray-400">Connect with experienced veterans who can guide your transition and career. Available exclusively for BIA+ members.</p>
        <Button onClick={() => router.push('/app/premium')} className="bg-amber-600 hover:bg-amber-500">
          Upgrade to BIA+
        </Button>
      </div>
    </div>
  );

  const mentors = mentorsData?.mentors || [];
  const incoming = requestsData?.incoming || [];
  const outgoing = requestsData?.outgoing || [];
  const myProfile = requestsData?.myProfile;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mentorship</h1>
        <p className="text-gray-400 mt-1">Connect with veterans who've walked the path you're on.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800/60 p-1 rounded-xl w-fit">
        {[
          { key: 'find', label: 'Find a Mentor' },
          { key: 'requests', label: `Requests${incoming.filter((r: any) => r.status === 'PENDING').length ? ` (${incoming.filter((r: any) => r.status === 'PENDING').length})` : ''}` },
          { key: 'become', label: myProfile ? 'My Profile' : 'Become a Mentor' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Find a Mentor */}
      {tab === 'find' && (
        mentorsLoading ? <div className="flex justify-center py-12"><Spinner className="w-8 h-8 text-green-500" /></div> :
        mentors.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No mentors available yet. Be the first to offer mentorship!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mentors.map((mentor: any) => (
              <Card key={mentor.id} className="bg-gray-800/60 border-gray-700/50 hover:border-green-500/30 transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex gap-3">
                    <Avatar src={mentor.user?.profile?.profileImageUrl} fallback={mentor.user?.profile?.displayName?.[0]} className="w-12 h-12" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{mentor.user?.profile?.displayName}</p>
                      {mentor.user?.veteranDetails && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {formatBranch(mentor.user.veteranDetails.branch)}
                          {mentor.user.veteranDetails.rank && ` · ${mentor.user.veteranDetails.rank}`}
                        </p>
                      )}
                      {mentor.user?.profile?.location && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{mentor.user.profile.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-3">{mentor.bio}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mentor.specialisms.slice(0, 3).map((s: string) => (
                      <Badge key={s} className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">{s}</Badge>
                    ))}
                    {mentor.specialisms.length > 3 && (
                      <Badge className="bg-gray-700 text-gray-400 text-xs">+{mentor.specialisms.length - 3}</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                    <span className="text-xs text-gray-500">{mentor.availability}</span>
                    <Button size="sm" onClick={() => setSelectedMentor(mentor)} className="bg-green-600 hover:bg-green-500">
                      Request Mentorship
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Requests */}
      {tab === 'requests' && (
        <div className="space-y-6">
          {incoming.length > 0 && (
            <div>
              <h2 className="font-semibold text-white mb-3">Incoming Requests</h2>
              <div className="space-y-3">
                {incoming.map((req: any) => (
                  <Card key={req.id} className="bg-gray-800/60 border-gray-700/50">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar src={req.mentee?.profile?.profileImageUrl} fallback={req.mentee?.profile?.displayName?.[0]} className="w-10 h-10" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white">{req.mentee?.profile?.displayName}</p>
                        <p className="text-sm text-gray-400 truncate">{req.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(req.createdAt)}</p>
                      </div>
                      {req.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button onClick={() => respondMutation.mutate({ id: req.id, accept: true })} className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors">
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button onClick={() => respondMutation.mutate({ id: req.id, accept: false })} className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <Badge className={req.status === 'ACCEPTED' ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-400'}>
                          {req.status}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {outgoing.length > 0 && (
            <div>
              <h2 className="font-semibold text-white mb-3">My Requests</h2>
              <div className="space-y-3">
                {outgoing.map((req: any) => (
                  <Card key={req.id} className="bg-gray-800/60 border-gray-700/50">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar src={req.mentor?.user?.profile?.profileImageUrl} fallback="M" className="w-10 h-10" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white">{req.mentor?.user?.profile?.displayName}</p>
                        <p className="text-sm text-gray-400 truncate">{req.message}</p>
                      </div>
                      <Badge className={
                        req.status === 'ACCEPTED' ? 'bg-green-600/20 text-green-400' :
                        req.status === 'DECLINED' ? 'bg-red-600/20 text-red-400' :
                        'bg-yellow-600/20 text-yellow-400'
                      }>{req.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {incoming.length === 0 && outgoing.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No mentorship requests yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Become a Mentor */}
      {tab === 'become' && (
        <div className="max-w-xl space-y-5">
          <p className="text-gray-400 text-sm">Share your experience and help fellow veterans navigate their next chapter.</p>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Your Specialisms</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALISMS.map(s => (
                <button
                  key={s}
                  onClick={() => setMentorForm(f => ({
                    ...f,
                    specialisms: f.specialisms.includes(s) ? f.specialisms.filter(x => x !== s) : [...f.specialisms, s],
                  }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    mentorForm.specialisms.includes(s)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Bio</label>
            <textarea
              value={mentorForm.bio}
              onChange={(e) => setMentorForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell mentees about your service history and what you can offer..."
              rows={5}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg p-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Availability</label>
            <input
              value={mentorForm.availability}
              onChange={(e) => setMentorForm(f => ({ ...f, availability: e.target.value }))}
              placeholder="e.g. Weekends, 1-2 hours/week"
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <Button
            onClick={() => upsertProfileMutation.mutate()}
            disabled={!mentorForm.bio || !mentorForm.availability || mentorForm.specialisms.length === 0 || upsertProfileMutation.isPending}
            className="bg-green-600 hover:bg-green-500 w-full"
          >
            {upsertProfileMutation.isPending ? <Spinner className="w-4 h-4" /> : myProfile ? 'Update Profile' : 'Register as Mentor'}
          </Button>
        </div>
      )}

      {/* Request Mentor Modal */}
      <Modal isOpen={!!selectedMentor} onClose={() => setSelectedMentor(null)} title={`Request Mentorship — ${selectedMentor?.user?.profile?.displayName}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Introduce yourself and explain what you're looking for help with.</p>
          <textarea
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            placeholder="Briefly describe your background, what stage you're at, and what you'd like guidance on..."
            rows={5}
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg p-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setSelectedMentor(null)}>Cancel</Button>
            <Button
              onClick={() => sendRequestMutation.mutate()}
              disabled={requestMessage.length < 20 || sendRequestMutation.isPending}
              className="bg-green-600 hover:bg-green-500"
            >
              {sendRequestMutation.isPending ? <Spinner className="w-4 h-4" /> : 'Send Request'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
