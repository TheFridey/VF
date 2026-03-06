'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { BookOpen, ExternalLink, Download, Lock, Filter, Briefcase, GraduationCap, Heart, FileText, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const CATEGORY_ICONS: Record<string, any> = {
  'CV & Interview': FileText,
  'Career Transition': TrendingUp,
  'Education & Training': GraduationCap,
  'Business & Self-Employment': Briefcase,
  'Mental Health': Heart,
  'Benefits & Entitlements': BookOpen,
};

// Curated starter resources — admins can add more via DB
const STARTER_RESOURCES = [
  {
    id: 'res-1',
    title: 'Career Transition Partnership (CTP)',
    description: 'The Ministry of Defence\'s official resettlement service for armed forces personnel. Offers job finding, training, and career guidance.',
    category: 'Career Transition',
    url: 'https://www.ctp.org.uk',
    isPublished: true,
  },
  {
    id: 'res-2',
    title: 'Officers\' Association',
    description: 'Employment support for ex-officers and their partners, including a job board, mentoring, and networking events.',
    category: 'Career Transition',
    url: 'https://www.officersassociation.org.uk',
    isPublished: true,
  },
  {
    id: 'res-3',
    title: 'RFEA – The Forces Employment Charity',
    description: 'Provides lifelong employment support to ex-forces personnel, reservists, and their families. Free CV reviews and job placement.',
    category: 'CV & Interview',
    url: 'https://www.rfea.org.uk',
    isPublished: true,
  },
  {
    id: 'res-4',
    title: 'X-Forces Enterprise',
    description: 'The leading social enterprise supporting the armed forces community in starting and growing their own businesses.',
    category: 'Business & Self-Employment',
    url: 'https://x-forces.com',
    isPublished: true,
  },
  {
    id: 'res-5',
    title: 'Enhanced Learning Credits (ELC)',
    description: 'MoD scheme that helps service leavers fund higher-level learning and qualifications post-service.',
    category: 'Education & Training',
    url: 'https://www.enhancedlearningcredits.com',
    isPublished: true,
  },
  {
    id: 'res-6',
    title: 'Combat Stress',
    description: 'The UK\'s leading veterans\' mental health charity. 24-hour helpline and specialist treatment for PTSD, depression, and anxiety.',
    category: 'Mental Health',
    url: 'https://www.combatstress.org.uk',
    isPublished: true,
  },
  {
    id: 'res-7',
    title: 'Veterans UK Benefits',
    description: 'Official guide to financial support, pensions, and compensation available to service leavers and their families.',
    category: 'Benefits & Entitlements',
    url: 'https://www.gov.uk/government/organisations/veterans-uk',
    isPublished: true,
  },
  {
    id: 'res-8',
    title: 'Step Into Health',
    description: 'NHS programme to help veterans transition into health and social care careers, with dedicated support and fast-track pathways.',
    category: 'Career Transition',
    url: 'https://www.nhsemployers.org/stepintohealth',
    isPublished: true,
  },
];

export default function CareerResourcesPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: subData } = useQuery({ queryKey: ['subscription'], queryFn: () => api.getSubscription() });
  const isBiaPlus = ['BIA_PLUS', 'BUNDLE_PREMIUM_BIA'].includes(subData?.tier);

  const { data, isLoading } = useQuery({
    queryKey: ['career-resources', selectedCategory],
    queryFn: () => api.getCareerResources(selectedCategory === 'All' ? undefined : selectedCategory),
    enabled: isBiaPlus,
  });

  if (!isBiaPlus) return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-gray-800/60 border border-amber-600/30 rounded-xl p-8 text-center space-y-4">
        <Lock className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Career Resources</h2>
        <p className="text-gray-400">Access curated career resources, CV tools, job boards, and transition guides — exclusively for BIA+ members.</p>
        <Button onClick={() => router.push('/app/premium')} className="bg-amber-600 hover:bg-amber-500">
          Upgrade to BIA+
        </Button>
      </div>
    </div>
  );

  // Combine DB resources with starter resources
  const dbResources = data?.resources || [];
  const allResources = [...STARTER_RESOURCES, ...dbResources].filter(r =>
    selectedCategory === 'All' || r.category === selectedCategory,
  );

  const allCategories = ['All', ...Object.keys(CATEGORY_ICONS)];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Career Resources</h1>
        <p className="text-gray-400 mt-1">Curated tools and organisations to support your next chapter after service.</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {allCategories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {cat}
            </button>
          );
        })}
      </div>

      {/* Resources grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="w-8 h-8 text-green-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allResources.map((resource: any) => {
            const Icon = CATEGORY_ICONS[resource.category] || BookOpen;
            return (
              <Card key={resource.id} className="bg-gray-800/60 border-gray-700/50 hover:border-green-500/30 transition-all group">
                <CardContent className="p-5 h-full flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                      <Icon className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white group-hover:text-green-300 transition-colors leading-snug">
                        {resource.title}
                      </h3>
                      <Badge className="mt-1 bg-gray-700 text-gray-300 border-gray-600 text-xs">
                        {resource.category}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed flex-1">{resource.description}</p>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700/50">
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 font-medium transition-colors"
                      >
                        Visit Website
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {resource.fileUrl && (
                      <a
                        href={resource.fileUrl}
                        download
                        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors ml-auto"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
