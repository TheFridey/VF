'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Globe, MapPin, Crown, Star, Plus, Filter, ExternalLink, Building2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'All', 'Consulting', 'Security', 'Technology', 'Construction', 'Logistics',
  'Training', 'Healthcare', 'Legal', 'Finance', 'Retail', 'Other',
];

export default function BusinessDirectoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showListForm, setShowListForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: '', website: '', location: '' });

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
  });

  const isBiaPlus = ['BIA_PLUS', 'BUNDLE_PREMIUM_BIA'].includes(subData?.tier);

  const { data, isLoading } = useQuery({
    queryKey: ['business-directory', selectedCategory],
    queryFn: () => api.getBusinessDirectory(selectedCategory === 'All' ? undefined : selectedCategory),
  });

  const { data: myListing } = useQuery({
    queryKey: ['my-listing'],
    queryFn: () => api.getMyBusinessListing(),
    enabled: isBiaPlus,
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

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-6 h-6 text-green-400" />
          <h1 className="text-2xl font-bold text-white">Veterans Business Directory</h1>
        </div>
        <p className="text-gray-400">Businesses run by our BIA+ Members.</p>
      </div>

      {/* BIA+ upgrade banner */}
      <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/20 border border-amber-600/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Crown className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white text-sm">
              {isBiaPlus ? 'You can list your business here' : 'Want to list your business?'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isBiaPlus
                ? 'As a BIA+ member, your business is visible to the entire VeteranFinder community.'
                : 'Upgrade to BIA+ to add your veteran-owned business to the directory.'}
            </p>
          </div>
        </div>
        {isBiaPlus ? (
          <Button onClick={() => setShowListForm(true)} size="sm" className="bg-amber-600 hover:bg-amber-500 gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            {myListing ? 'Update Listing' : 'List My Business'}
          </Button>
        ) : (
          <Button onClick={() => router.push('/app/premium')} size="sm" className="bg-amber-600 hover:bg-amber-500 shrink-0">
            Upgrade to BIA+
          </Button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="w-8 h-8 text-green-500" /></div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No businesses listed yet in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((biz: any) => (
            <Card key={biz.id} className="bg-gray-800/60 border-gray-700/50 hover:border-green-500/30 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {biz.logoUrl
                      ? <img src={biz.logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                      : <Briefcase className="w-6 h-6 text-gray-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white">{biz.name}</h3>
                      <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs shrink-0">
                        {biz.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{biz.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                      {biz.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{biz.location}
                        </span>
                      )}
                      {biz.website && (
                        <a
                          href={biz.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="w-3 h-3" />Website
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/50">
                      <div className="w-5 h-5 rounded-full bg-gray-600 overflow-hidden">
                        {biz.user?.profile?.profileImageUrl
                          ? <img src={biz.user.profile.profileImageUrl} alt="" className="w-full h-full object-cover" />
                          : <Star className="w-3 h-3 m-1 text-amber-400" />
                        }
                      </div>
                      <span className="text-xs text-gray-500">
                        {biz.user?.profile?.displayName || 'BIA+ Member'}
                      </span>
                      <Badge className="ml-auto bg-amber-600/20 text-amber-400 border-amber-600/30 text-xs">BIA+</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List Business Modal */}
      <Modal isOpen={showListForm} onClose={() => setShowListForm(false)} title={myListing ? 'Update Your Listing' : 'List Your Business'}>
        <div className="space-y-4">
          {[
            { key: 'name', label: 'Business Name', placeholder: 'Your business name' },
            { key: 'location', label: 'Location', placeholder: 'e.g. Manchester, UK' },
            { key: 'website', label: 'Website (optional)', placeholder: 'https://' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-sm text-gray-400 mb-1 block">{label}</label>
              <Input
                value={(form as any)[key]}
                onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="">Select category...</option>
              {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Tell veterans what your business offers..."
              rows={4}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg p-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <p className="text-xs text-gray-500">Listings are reviewed before going live. Usually approved within 24 hours.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowListForm(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || !form.description || !form.category || createMutation.isPending}
              className="bg-green-600 hover:bg-green-500"
            >
              {createMutation.isPending ? <Spinner className="w-4 h-4" /> : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
