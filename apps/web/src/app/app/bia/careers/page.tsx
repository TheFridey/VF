'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { BookOpen, ExternalLink, Download, Lock, Briefcase, GraduationCap, Heart, FileText, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { ForumShell, ForumStage, ForumPanel } from '@/components/bia/forum-shell';
import { useBiaPageAccess } from '@/hooks/use-bia-page-access';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, any> = {
  'CV & Interview': FileText,
  'Career Transition': TrendingUp,
  'Education & Training': GraduationCap,
  'Business & Self-Employment': Briefcase,
  'Mental Health': Heart,
  'Benefits & Entitlements': BookOpen,
};

// Curated starter resources â€” admins can add more via DB
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
    title: 'RFEA - The Forces Employment Charity',
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
  const access = useBiaPageAccess('plus');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
    enabled: access.canAccess,
  });
  const isBiaPlus = ['BIA_PLUS'].includes(subData?.tier);

  const { data, isLoading } = useQuery({
    queryKey: ['career-resources', selectedCategory],
    queryFn: () => api.getCareerResources(selectedCategory === 'All' ? undefined : selectedCategory),
    enabled: access.canAccess && isBiaPlus,
  });

  const dbResources = data?.resources || [];
  const filteredResources = [...STARTER_RESOURCES, ...dbResources].filter((r) =>
    selectedCategory === 'All' || r.category === selectedCategory,
  );

  const allCategories = ['All', ...Object.keys(CATEGORY_ICONS)];

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
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Career Resources</h1>
          <p className="mt-1 text-sm text-slate-300/80">Practical resources and opportunities for veterans in transition.</p>
        </div>

        {!isBiaPlus && (
          <ForumPanel className="px-5 py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10">
              <Lock className="h-6 w-6 text-amber-300" />
            </div>
            <h2 className="text-lg font-semibold text-white">Career resources require BIA+</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-300/80">
              Access curated career resources, CV tools, job boards, and transition guides exclusively for BIA+ members.
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
            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
              {allCategories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'flex whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                      selectedCategory === cat
                        ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200',
                    )}
                  >
                    {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
                    {cat}
                  </button>
                );
              })}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Spinner className="h-8 w-8 text-emerald-400" />
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <BookOpen className="mb-3 h-12 w-12 text-slate-500 opacity-30" />
                <p className="text-sm text-slate-400">No resources found for this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredResources.map((resource: any) => {
                  const Icon = CATEGORY_ICONS[resource.category] || BookOpen;
                  return (
                    <ForumPanel key={resource.id} className="p-5 transition-all hover:border-emerald-400/25">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
                          <Icon className="h-4 w-4 text-emerald-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="leading-snug font-semibold text-white">{resource.title}</h3>
                          <span className="mt-1 inline-block rounded-full border border-white/12 bg-white/8 px-2.5 py-0.5 text-[11px] text-slate-300/80">
                            {resource.category}
                          </span>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300/80">{resource.description}</p>
                          <div className="mt-3 flex items-center gap-3">
                            {resource.url && (
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300 transition-colors hover:text-emerald-200"
                              >
                                Visit resource
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {resource.fileUrl && (
                              <a
                                href={resource.fileUrl}
                                download
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-300 transition-colors hover:text-amber-200"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </ForumPanel>
                  );
                })}
              </div>
            )}
          </>
        )}
      </ForumShell>
    </ForumStage>
  );
}
