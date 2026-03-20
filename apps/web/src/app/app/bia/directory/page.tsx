'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Globe, MapPin, Crown, Star, Plus, ExternalLink, Building2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { ForumShell, ForumStage, ForumPanel } from '@/components/bia/forum-shell';
import { useBiaPageAccess } from '@/hooks/use-bia-page-access';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'All', 'Consulting', 'Security', 'Technology', 'Construction', 'Logistics',
  'Training', 'Healthcare', 'Legal', 'Finance', 'Retail', 'Other',
];

export default function BusinessDirectoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const access = useBiaPageAccess('plus');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showListForm, setShowListForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: '', website: '', location: '' });

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
    enabled: access.canAccess,
  });

  const isBiaPlus = ['BIA_PLUS'].includes(subData?.tier);

  const { data, isLoading } = useQuery({
    queryKey: ['business-directory', selectedCategory],
    queryFn: () => api.getBusinessDirectory(selectedCategory === 'All' ? undefined : selectedCategory),
    enabled: access.canAccess,
  });

  const { data: myListing } = useQuery({
    queryKey: ['my-listing'],
    queryFn: () => api.getMyBusinessListing(),
    enabled: access.canAccess && isBiaPlus,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createBusinessListing(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-directory'] });
      queryClient.invalidateQueries({ queryKey: ['my-listing'] });
      toast.success('Listing submitted for review!');
      setShowListForm(false);
    },
    onError: () => toast.error('Failed to submit listing'),
  });

  const listings = data?.listings || [];

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400/80">Brothers in Arms</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Veterans Business Directory</h1>
            <p className="mt-1 text-sm text-slate-300/80">Veteran-owned businesses from the BIA+ community.</p>
          </div>
          {isBiaPlus && (
            <button
              onClick={() => setShowListForm(true)}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              {myListing ? 'Update Listing' : 'List My Business'}
            </button>
          )}
        </div>

        {!isBiaPlus && (
          <ForumPanel className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <div>
                  <p className="text-sm font-semibold text-amber-200">List your veteran-owned business</p>
                  <p className="mt-0.5 text-sm text-slate-300/80">
                    Upgrade to BIA+ to add your business and reach the entire VeteranFinder community.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/app/premium')}
                className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
              >
                Upgrade to BIA+
              </button>
            </div>
          </ForumPanel>
        )}

        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                selectedCategory === cat
                  ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200',
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-emerald-400" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Building2 className="mb-3 h-12 w-12 text-slate-500 opacity-30" />
            <p className="text-sm text-slate-400">No businesses listed yet in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((biz: any) => (
              <ForumPanel key={biz.id} className="cursor-default p-5 transition-all hover:border-emerald-400/25">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/8">
                    {biz.logoUrl ? (
                      <img src={biz.logoUrl} alt={biz.name} className="h-full w-full object-cover" />
                    ) : (
                      <Briefcase className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="leading-tight font-semibold text-white">{biz.name}</h3>
                      <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                        {biz.category}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-300/80">{biz.description}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-400/70">
                      {biz.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {biz.location}
                        </span>
                      )}
                      {biz.website && (
                        <a
                          href={biz.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-300/80 transition-colors hover:text-emerald-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-3 w-3" />
                          Website
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3">
                      <div className="h-5 w-5 overflow-hidden rounded-full border border-white/10 bg-white/8">
                        {biz.user?.profile?.profileImageUrl ? (
                          <img src={biz.user.profile.profileImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Star className="m-1 h-3 w-3 text-amber-300" />
                        )}
                      </div>
                      <span className="text-xs text-slate-400/70">
                        {biz.user?.profile?.displayName || 'BIA+ Member'}
                      </span>
                      <span className="ml-auto rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                        BIA+
                      </span>
                    </div>
                  </div>
                </div>
              </ForumPanel>
            ))}
          </div>
        )}

        <Modal isOpen={showListForm} onClose={() => setShowListForm(false)} title={myListing ? 'Update Your Listing' : 'List Your Business'}>
          <div className="space-y-4">
            {[
              { key: 'name', label: 'Business Name', placeholder: 'Your business name' },
              { key: 'location', label: 'Location', placeholder: 'e.g. Manchester, UK' },
              { key: 'website', label: 'Website (optional)', placeholder: 'https://' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="mb-1 block text-sm text-slate-300/80">{label}</label>
                <Input
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="border-white/15 bg-white/8 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm text-slate-300/80">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-white/8 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="">Select category...</option>
                {CATEGORIES.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300/80">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Tell veterans what your business offers..."
                rows={4}
                className="w-full resize-none rounded-lg border border-white/15 bg-white/8 p-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            <p className="text-xs text-slate-400/70">Listings are reviewed before going live. Usually approved within 24 hours.</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowListForm(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.name || !form.description || !form.category || createMutation.isPending}
                className="bg-emerald-500 font-semibold text-black hover:bg-emerald-400"
              >
                {createMutation.isPending ? <Spinner className="h-4 w-4" /> : 'Submit for Review'}
              </Button>
            </div>
          </div>
        </Modal>
      </ForumShell>
    </ForumStage>
  );
}
