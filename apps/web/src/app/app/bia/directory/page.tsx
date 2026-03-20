'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Globe, MapPin, Crown, Star, Plus, ExternalLink, Building2,
  FileText, Send, Users, BadgeCheck, Lock, CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { ForumShell, ForumStage, ForumPanel } from '@/components/bia/forum-shell';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

const CATEGORIES = [
  'All', 'Consulting', 'Security', 'Technology', 'Construction', 'Logistics',
  'Training', 'Healthcare', 'Legal', 'Finance', 'Retail', 'Other',
];

const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Temporary',
  'Remote',
  'Hybrid',
  'Volunteer',
] as const;

type BusinessFormState = {
  name: string;
  description: string;
  category: string;
  website: string;
  location: string;
};

type JobFormState = {
  title: string;
  employmentType: string;
  location: string;
  summary: string;
  description: string;
};

type ApplicationFormState = {
  message: string;
  file: File | null;
};

const EMPTY_BUSINESS_FORM: BusinessFormState = {
  name: '',
  description: '',
  category: '',
  website: '',
  location: '',
};

const EMPTY_JOB_FORM: JobFormState = {
  title: '',
  employmentType: EMPLOYMENT_TYPES[0],
  location: '',
  summary: '',
  description: '',
};

const EMPTY_APPLICATION_FORM: ApplicationFormState = {
  message: '',
  file: null,
};

const DIRECTORY_MODAL_CLASSNAME = 'rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,15,23,0.98))] text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl';
const DIRECTORY_MODAL_TITLE_CLASSNAME = 'text-xl font-semibold text-white';
const DIRECTORY_MODAL_CONTENT_CLASSNAME = 'text-slate-100';
const DIRECTORY_MODAL_CLOSE_CLASSNAME = 'text-slate-400 hover:bg-white/10 hover:text-white focus:ring-emerald-400';
const DIRECTORY_LABEL_CLASSNAME = 'mb-1 block text-sm font-medium text-slate-200';
const DIRECTORY_FIELD_CLASSNAME = '!border-slate-200 !bg-slate-50 !text-slate-950 !placeholder:text-slate-400 caret-slate-950 [-webkit-text-fill-color:#0f172a] focus-visible:!ring-emerald-400 focus-visible:!ring-offset-slate-950';
const DIRECTORY_TEXTAREA_CLASSNAME = 'w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-950 placeholder:text-slate-400 caret-slate-950 [-webkit-text-fill-color:#0f172a] focus:outline-none focus:ring-1 focus:ring-emerald-400';
const DIRECTORY_SELECT_CLASSNAME = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-950 caret-slate-950 [-webkit-text-fill-color:#0f172a] focus:outline-none focus:ring-1 focus:ring-emerald-400';

function getErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const message = axiosError?.response?.data?.message;
  if (Array.isArray(message)) return message[0] || fallback;
  return message || fallback;
}

export default function BusinessDirectoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showListForm, setShowListForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [businessForm, setBusinessForm] = useState<BusinessFormState>(EMPTY_BUSINESS_FORM);
  const [jobForm, setJobForm] = useState<JobFormState>(EMPTY_JOB_FORM);
  const [applicationForm, setApplicationForm] = useState<ApplicationFormState>(EMPTY_APPLICATION_FORM);

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
    enabled: !!user?.id,
  });

  const canManageDirectory = user?.role === 'ADMIN' || user?.role === 'MODERATOR' || subData?.tier === 'BIA_PLUS';

  const { data, isLoading } = useQuery({
    queryKey: ['business-directory', selectedCategory],
    queryFn: () => api.getBusinessDirectory(selectedCategory === 'All' ? undefined : selectedCategory),
    enabled: !!user?.id,
  });

  const { data: myListing } = useQuery({
    queryKey: ['my-listing'],
    queryFn: () => api.getMyBusinessListing(),
    enabled: !!user?.id && canManageDirectory,
  });

  useEffect(() => {
    if (!myListing) {
      setBusinessForm(EMPTY_BUSINESS_FORM);
      return;
    }

    setBusinessForm({
      name: myListing.name ?? '',
      description: myListing.description ?? '',
      category: myListing.category ?? '',
      website: myListing.website ?? '',
      location: myListing.location ?? '',
    });
  }, [myListing]);

  const refreshDirectory = () => {
    queryClient.invalidateQueries({ queryKey: ['business-directory'] });
    queryClient.invalidateQueries({ queryKey: ['my-listing'] });
  };

  const createListingMutation = useMutation({
    mutationFn: () => api.createBusinessListing({
      name: businessForm.name.trim(),
      description: businessForm.description.trim(),
      category: businessForm.category,
      website: businessForm.website.trim() || undefined,
      location: businessForm.location.trim() || undefined,
    }),
    onSuccess: () => {
      refreshDirectory();
      toast.success(myListing ? 'Business listing updated and resubmitted for review.' : 'Listing submitted for review.');
      setShowListForm(false);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to submit listing')),
  });

  const createJobMutation = useMutation({
    mutationFn: () => api.createBusinessJobListing({
      title: jobForm.title.trim(),
      employmentType: jobForm.employmentType,
      location: jobForm.location.trim() || undefined,
      summary: jobForm.summary.trim() || undefined,
      description: jobForm.description.trim(),
    }),
    onSuccess: () => {
      refreshDirectory();
      toast.success('Job listing added to your business.');
      setJobForm(EMPTY_JOB_FORM);
      setShowJobForm(false);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to add job listing')),
  });

  const updateJobStatusMutation = useMutation({
    mutationFn: ({ jobId, isActive }: { jobId: string; isActive: boolean }) => api.updateBusinessJobListingStatus(jobId, isActive),
    onSuccess: (_, variables) => {
      refreshDirectory();
      toast.success(variables.isActive ? 'Job listing reopened.' : 'Job listing closed.');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to update job status')),
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      if (!selectedJob || !applicationForm.file) {
        throw new Error('Missing application details');
      }

      return api.applyToBusinessJobListing(selectedJob.id, {
        message: applicationForm.message,
        file: applicationForm.file,
      });
    },
    onSuccess: () => {
      toast.success('Application sent successfully.');
      setSelectedJob(null);
      setApplicationForm(EMPTY_APPLICATION_FORM);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to submit application')),
  });

  const listings = data?.listings || [];
  const totalJobs = useMemo(
    () => listings.reduce((count: number, listing: any) => count + (listing.jobs?.length || 0), 0),
    [listings],
  );

  return (
    <ForumStage>
      <ForumShell>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400/80">Community Directory</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Veterans Business Directory</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-300/80">
              Browse veteran-owned businesses and live roles across the community. BIA+ members can list a business and add job openings for applicants to submit CVs directly.
            </p>
          </div>
          {canManageDirectory ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowListForm(true)}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
              >
                <Building2 className="h-4 w-4" />
                {myListing ? 'Update Listing' : 'List My Business'}
              </button>
              {myListing && (
                <button
                  onClick={() => setShowJobForm(true)}
                  className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20"
                >
                  <Plus className="h-4 w-4" />
                  Add Job Listing
                </button>
              )}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <ForumPanel className="px-5 py-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Businesses</p>
                <p className="mt-3 text-3xl font-semibold text-white">{listings.length}</p>
                <p className="mt-1 text-sm text-slate-300/75">Approved listings visible to every signed-in member.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Open Roles</p>
                <p className="mt-3 text-3xl font-semibold text-white">{totalJobs}</p>
                <p className="mt-1 text-sm text-slate-300/75">Applicants can upload PDF, DOC, and DOCX CVs.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Listing Access</p>
                <p className="mt-3 text-lg font-semibold text-white">{canManageDirectory ? 'BIA+ enabled' : 'Upgrade required'}</p>
                <p className="mt-1 text-sm text-slate-300/75">Only BIA+ businesses can publish listings and jobs.</p>
              </div>
            </div>
          </ForumPanel>

          {!canManageDirectory ? (
            <ForumPanel className="px-5 py-4">
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <div>
                    <p className="text-sm font-semibold text-amber-200">Want to promote your business?</p>
                    <p className="mt-0.5 text-sm text-slate-300/80">
                      Upgrade to BIA+ to list your company, add roles, and review candidate CV submissions.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/app/premium')}
                  className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
                >
                  Upgrade to BIA+
                </button>
              </div>
            </ForumPanel>
          ) : (
            <ForumPanel className="px-5 py-4">
              <div className="flex h-full flex-col justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-emerald-200">Business owner tools</p>
                  <p className="mt-1 text-sm text-slate-300/80">
                    {myListing
                      ? 'Manage your approved listing, add live roles, and review uploaded CVs from applicants.'
                      : 'Create your listing first, then you can start adding job openings.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <BadgeCheck className="h-4 w-4 text-emerald-300" />
                  <span>{myListing?.isApproved ? 'Listing approved and live' : myListing ? 'Listing pending review' : 'No listing created yet'}</span>
                </div>
              </div>
            </ForumPanel>
          )}
        </div>

        {canManageDirectory && myListing && (
          <ForumPanel className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">Manage my business</h2>
                  <span className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                    myListing.isApproved
                      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                      : 'border-amber-400/20 bg-amber-400/10 text-amber-300',
                  )}>
                    {myListing.isApproved ? 'Approved' : 'Pending review'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-300/80">
                  {myListing.name} {myListing.location ? `| ${myListing.location}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowListForm(true)} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                  Edit Listing
                </Button>
                <Button onClick={() => setShowJobForm(true)} className="bg-emerald-500 font-semibold text-black hover:bg-emerald-400">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Job
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">My job listings</h3>
                {myListing.jobs?.length ? myListing.jobs.map((job: any) => (
                  <div key={job.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold text-white">{job.title}</h4>
                          <span className={cn(
                            'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            job.isActive
                              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                              : 'border-white/10 bg-white/5 text-slate-300',
                          )}>
                            {job.isActive ? 'Live' : 'Closed'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-300/80">
                          {job.employmentType}
                          {job.location ? ` | ${job.location}` : ''}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => updateJobStatusMutation.mutate({ jobId: job.id, isActive: !job.isActive })}
                        disabled={updateJobStatusMutation.isPending}
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                      >
                        {job.isActive ? 'Close role' : 'Reopen role'}
                      </Button>
                    </div>
                    <p className="mt-3 text-sm text-slate-300/80">{job.summary || job.description}</p>
                    <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-slate-400">
                      <Users className="h-4 w-4" />
                      <span>{job._count?.applications || job.applications?.length || 0} applications</span>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">
                    <Briefcase className="mx-auto mb-3 h-10 w-10 text-slate-500/40" />
                    <p className="text-sm text-slate-300/80">You have not added any job openings yet.</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Recent applications</h3>
                {myListing.jobs?.some((job: any) => job.applications?.length) ? myListing.jobs.flatMap((job: any) =>
                  (job.applications || []).map((application: any) => (
                    <div key={application.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{application.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{application.email}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{job.title}</p>
                        </div>
                        <a
                          href={application.cvDownloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-400/15"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {application.cvFileName}
                        </a>
                      </div>
                      {application.message ? (
                        <p className="mt-3 text-sm text-slate-300/80">{application.message}</p>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No message included.</p>
                      )}
                    </div>
                  )),
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">
                    <Send className="mx-auto mb-3 h-10 w-10 text-slate-500/40" />
                    <p className="text-sm text-slate-300/80">Applications will appear here when people apply to your roles.</p>
                  </div>
                )}
              </div>
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
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {listings.map((biz: any) => (
              <ForumPanel key={biz.id} className="p-5">
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
                      <div>
                        <h3 className="leading-tight font-semibold text-white">{biz.name}</h3>
                        <p className="mt-1 text-sm text-slate-300/80">{biz.description}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                        {biz.category}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400/70">
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
                        >
                          <Globe className="h-3 w-3" />
                          Website
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-white/8 pt-3">
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

                {biz.jobs?.length ? (
                  <div className="mt-5 space-y-3 border-t border-white/8 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Open roles</p>
                      <span className="text-xs text-slate-500">{biz.jobs.length} live</span>
                    </div>
                    {biz.jobs.map((job: any) => (
                      <div key={job.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-white">{job.title}</h4>
                            <p className="mt-1 text-xs text-slate-400">
                              {job.employmentType}
                              {job.location ? ` | ${job.location}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedJob({ ...job, businessName: biz.name });
                              setApplicationForm(EMPTY_APPLICATION_FORM);
                            }}
                            className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-emerald-400"
                          >
                            Apply with CV
                          </button>
                        </div>
                        {(job.summary || job.description) && (
                          <p className="mt-3 text-sm text-slate-300/80">{job.summary || job.description}</p>
                        )}
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{job._count?.applications || 0} applications so far</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </ForumPanel>
            ))}
          </div>
        )}

        <Modal
          isOpen={showListForm}
          onClose={() => setShowListForm(false)}
          title={myListing ? 'Update Your Listing' : 'List Your Business'}
          className={DIRECTORY_MODAL_CLASSNAME}
          contentClassName={DIRECTORY_MODAL_CONTENT_CLASSNAME}
          titleClassName={DIRECTORY_MODAL_TITLE_CLASSNAME}
          closeButtonClassName={DIRECTORY_MODAL_CLOSE_CLASSNAME}
        >
          <div className="space-y-4">
            {[
              { key: 'name', label: 'Business Name', placeholder: 'Your business name' },
              { key: 'location', label: 'Location', placeholder: 'e.g. Manchester, UK' },
              { key: 'website', label: 'Website (optional)', placeholder: 'https://' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className={DIRECTORY_LABEL_CLASSNAME}>{label}</label>
                <Input
                  value={businessForm[key as keyof BusinessFormState]}
                  onChange={(e) => setBusinessForm((form) => ({ ...form, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className={DIRECTORY_FIELD_CLASSNAME}
                />
              </div>
            ))}
            <div>
              <label className={DIRECTORY_LABEL_CLASSNAME}>Category</label>
              <select
                value={businessForm.category}
                onChange={(e) => setBusinessForm((form) => ({ ...form, category: e.target.value }))}
                className={DIRECTORY_SELECT_CLASSNAME}
              >
                <option value="">Select category...</option>
                {CATEGORIES.slice(1).map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label className={DIRECTORY_LABEL_CLASSNAME}>Description</label>
              <textarea
                value={businessForm.description}
                onChange={(e) => setBusinessForm((form) => ({ ...form, description: e.target.value }))}
                placeholder="Tell veterans what your business offers..."
                rows={4}
                className={DIRECTORY_TEXTAREA_CLASSNAME}
              />
            </div>
            <p className="text-xs text-slate-400/70">Listings are reviewed before going live. Edits go back into review.</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowListForm(false)} className="text-slate-300 hover:bg-white/10 hover:text-white">Cancel</Button>
              <Button
                onClick={() => createListingMutation.mutate()}
                disabled={!businessForm.name || !businessForm.description || !businessForm.category || createListingMutation.isPending}
                className="bg-emerald-500 font-semibold text-black hover:bg-emerald-400"
              >
                {createListingMutation.isPending ? <Spinner className="h-4 w-4" /> : 'Submit for Review'}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showJobForm}
          onClose={() => setShowJobForm(false)}
          title="Add Job Listing"
          className={DIRECTORY_MODAL_CLASSNAME}
          contentClassName={DIRECTORY_MODAL_CONTENT_CLASSNAME}
          titleClassName={DIRECTORY_MODAL_TITLE_CLASSNAME}
          closeButtonClassName={DIRECTORY_MODAL_CLOSE_CLASSNAME}
        >
          <div className="space-y-4">
            <div>
              <label className={DIRECTORY_LABEL_CLASSNAME}>Role title</label>
              <Input
                value={jobForm.title}
                onChange={(e) => setJobForm((form) => ({ ...form, title: e.target.value }))}
                placeholder="e.g. Operations Manager"
                className={DIRECTORY_FIELD_CLASSNAME}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={DIRECTORY_LABEL_CLASSNAME}>Employment type</label>
                <select
                  value={jobForm.employmentType}
                  onChange={(e) => setJobForm((form) => ({ ...form, employmentType: e.target.value }))}
                  className={DIRECTORY_SELECT_CLASSNAME}
                >
                  {EMPLOYMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className={DIRECTORY_LABEL_CLASSNAME}>Location</label>
                <Input
                  value={jobForm.location}
                  onChange={(e) => setJobForm((form) => ({ ...form, location: e.target.value }))}
                  placeholder="e.g. London / Remote"
                  className={DIRECTORY_FIELD_CLASSNAME}
                />
              </div>
            </div>
            <div>
              <label className={DIRECTORY_LABEL_CLASSNAME}>Short summary (optional)</label>
              <Input
                value={jobForm.summary}
                onChange={(e) => setJobForm((form) => ({ ...form, summary: e.target.value }))}
                placeholder="One-line overview for directory cards"
                className={DIRECTORY_FIELD_CLASSNAME}
              />
            </div>
            <div>
              <label className={DIRECTORY_LABEL_CLASSNAME}>Role description</label>
              <textarea
                value={jobForm.description}
                onChange={(e) => setJobForm((form) => ({ ...form, description: e.target.value }))}
                placeholder="Describe the role, expectations, and who it suits."
                rows={5}
                className={DIRECTORY_TEXTAREA_CLASSNAME}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowJobForm(false)} className="text-slate-300 hover:bg-white/10 hover:text-white">Cancel</Button>
              <Button
                onClick={() => createJobMutation.mutate()}
                disabled={!jobForm.title.trim() || !jobForm.employmentType || jobForm.description.trim().length < 20 || createJobMutation.isPending}
                className="bg-emerald-500 font-semibold text-black hover:bg-emerald-400"
              >
                {createJobMutation.isPending ? <Spinner className="h-4 w-4" /> : 'Publish Job'}
              </Button>
            </div>
            {jobForm.description.trim().length > 0 && jobForm.description.trim().length < 20 && (
              <p className="text-xs text-amber-300">Add a bit more detail. Role descriptions need at least 20 characters.</p>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={!!selectedJob}
          onClose={() => {
            setSelectedJob(null);
            setApplicationForm(EMPTY_APPLICATION_FORM);
          }}
          title={selectedJob ? `Apply for ${selectedJob.title}` : 'Apply'}
          className={DIRECTORY_MODAL_CLASSNAME}
          contentClassName={DIRECTORY_MODAL_CONTENT_CLASSNAME}
          titleClassName={DIRECTORY_MODAL_TITLE_CLASSNAME}
          closeButtonClassName={DIRECTORY_MODAL_CLOSE_CLASSNAME}
        >
          <div className="space-y-4">
            {selectedJob && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{selectedJob.businessName}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedJob.employmentType}
                  {selectedJob.location ? ` | ${selectedJob.location}` : ''}
                </p>
              </div>
            )}
            <div>
              <label className={DIRECTORY_LABEL_CLASSNAME}>Message (optional)</label>
              <textarea
                value={applicationForm.message}
                onChange={(e) => setApplicationForm((form) => ({ ...form, message: e.target.value }))}
                placeholder="Add a short introduction for the employer."
                rows={4}
                className={DIRECTORY_TEXTAREA_CLASSNAME}
              />
            </div>
            <div>
              <label className={DIRECTORY_LABEL_CLASSNAME}>Upload your CV</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setApplicationForm((form) => ({ ...form, file: e.target.files?.[0] ?? null }))}
                className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:font-semibold file:text-black hover:file:bg-emerald-400"
              />
              <p className="mt-2 text-xs text-slate-400">Accepted formats: PDF, DOC, DOCX. Max 10MB.</p>
              {applicationForm.file ? (
                <p className="mt-2 flex items-center gap-2 text-xs text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {applicationForm.file.name}
                </p>
              ) : (
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Lock className="h-3.5 w-3.5" />
                  Your CV is only visible to the business that owns this listing.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedJob(null);
                  setApplicationForm(EMPTY_APPLICATION_FORM);
                }}
                className="text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => applyMutation.mutate()}
                disabled={!applicationForm.file || applyMutation.isPending}
                className="bg-emerald-500 font-semibold text-black hover:bg-emerald-400"
              >
                {applyMutation.isPending ? <Spinner className="h-4 w-4" /> : 'Submit Application'}
              </Button>
            </div>
          </div>
        </Modal>
      </ForumShell>
    </ForumStage>
  );
}
