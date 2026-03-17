'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CONTACT_EMAILS, toMailto } from '@/lib/contact-emails';
import {
  BUDGET_RANGE_OPTIONS,
  ORGANISATION_TYPE_OPTIONS,
  PARTNERSHIP_TYPE_OPTIONS,
  partnershipEnquirySchema,
  type PartnershipEnquiryFormValues,
} from '@/lib/partnership-enquiry';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const defaultValues: PartnershipEnquiryFormValues = {
  organisationName: '',
  contactName: '',
  email: '',
  organisationType: 'charity',
  websiteUrl: '',
  organisationDescription: '',
  partnershipReason: '',
  phoneNumber: undefined,
  budgetRange: undefined,
  partnershipTypes: [],
  audienceServiceArea: undefined,
  notes: undefined,
  officeLocation: '',
};

type SubmissionState =
  | { status: 'idle' }
  | {
    status: 'success';
    organisationName: string;
    contactName: string;
  };

type PartnershipTypeValue = PartnershipEnquiryFormValues['partnershipTypes'][number];

function formatApiError(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data
  ) {
    const message = (error.response.data as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return message[0] ?? 'Unable to send your enquiry right now.';
    }
    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Unable to send your enquiry right now. Please try again or email the partnerships team directly.';
}

export function PartnerEnquiryForm() {
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ status: 'idle' });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PartnershipEnquiryFormValues>({
    resolver: zodResolver(partnershipEnquirySchema),
    defaultValues,
  });

  const selectedPartnershipTypes = watch('partnershipTypes');
  const typeError = errors.partnershipTypes?.message;
  const formDisabled = isSubmitting || submissionState.status === 'success';

  const selectedCountLabel = useMemo(() => {
    if (selectedPartnershipTypes.length === 0) {
      return 'Select any areas you would like to discuss';
    }

    return `${selectedPartnershipTypes.length} option${selectedPartnershipTypes.length === 1 ? '' : 's'} selected`;
  }, [selectedPartnershipTypes]);

  const togglePartnershipType = (value: PartnershipTypeValue) => {
    const nextValues = selectedPartnershipTypes.includes(value)
      ? selectedPartnershipTypes.filter((entry) => entry !== value)
      : [...selectedPartnershipTypes, value];

    setValue('partnershipTypes', nextValues, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: PartnershipEnquiryFormValues) => {
    try {
      await api.submitPartnershipEnquiry(values);
      setSubmissionState({
        status: 'success',
        organisationName: values.organisationName,
        contactName: values.contactName,
      });
      toast.success('Partnership enquiry sent. Our team will review it manually.');
      reset(defaultValues);
    } catch (error) {
      toast.error(formatApiError(error));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-slate-200 bg-white/90 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.32)]">
        <CardHeader className="pb-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Reviewed manually
          </div>
          <CardTitle className="text-2xl text-slate-950">Tell us about the fit</CardTitle>
          <CardDescription className="text-sm leading-7 text-slate-600">
            We review every enquiry by hand and come back with relevant options, availability, and quoted pricing where appropriate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm text-slate-600">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">What to expect</p>
            <div className="mt-4 space-y-3">
              {[
                'Your enquiry is reviewed for relevance, audience fit, and placement suitability.',
                'We reply with appropriate options rather than fixed off-the-shelf packages.',
                'Placements are limited and reserved for organisations that genuinely add value.',
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(240,249,255,0.92)_0%,rgba(255,255,255,0.96)_100%)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Need to send supporting material?</p>
            <p className="mt-3 leading-7">
              You can mention it in the notes below, or email the partnerships desk directly at{' '}
              <a href={toMailto(CONTACT_EMAILS.partnerships)} className="font-medium text-sky-700 hover:text-sky-800 hover:underline">
                {CONTACT_EMAILS.partnerships}
              </a>.
            </p>
          </div>

          {submissionState.status === 'success' && (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-700" />
                <div>
                  <p className="font-semibold">
                    Enquiry received for {submissionState.organisationName}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-emerald-900/90">
                    Thank you, {submissionState.contactName}. We have passed your details to the partnerships inbox and sent a confirmation email.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 h-auto px-0 text-sm font-semibold text-emerald-800 hover:bg-transparent hover:text-emerald-900"
                    onClick={() => setSubmissionState({ status: 'idle' })}
                  >
                    Send another enquiry
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 bg-white/92 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.28)]">
        <CardHeader className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92)_0%,rgba(255,255,255,0.92)_100%)] pb-5">
          <CardTitle className="text-2xl text-slate-950">Partnership enquiry</CardTitle>
          <CardDescription className="leading-7 text-slate-600">
            Suitable for charities, support providers, veteran organisations, and aligned businesses that want to reach the right audience responsibly.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Organisation name"
                placeholder="Royal Signals Association"
                error={errors.organisationName?.message}
                disabled={formDisabled}
                {...register('organisationName')}
              />
              <Input
                label="Contact name"
                placeholder="Jane Smith"
                error={errors.contactName?.message}
                disabled={formDisabled}
                {...register('contactName')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Email address"
                type="email"
                placeholder="jane@example.org"
                error={errors.email?.message}
                disabled={formDisabled}
                {...register('email')}
              />
              <Input
                label="Phone number"
                type="tel"
                placeholder="+44 7700 900123"
                hint="Optional"
                error={errors.phoneNumber?.message}
                disabled={formDisabled}
                {...register('phoneNumber')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="organisationType"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Organisation type"
                    options={[...ORGANISATION_TYPE_OPTIONS]}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.organisationType?.message}
                    disabled={formDisabled}
                  />
                )}
              />
              <Input
                label="Website URL"
                type="url"
                placeholder="https://example.org"
                error={errors.websiteUrl?.message}
                disabled={formDisabled}
                {...register('websiteUrl')}
              />
            </div>

            <Textarea
              label="Short description of your organisation"
              placeholder="What do you provide, who do you support, and where do you operate?"
              rows={5}
              error={errors.organisationDescription?.message}
              disabled={formDisabled}
              {...register('organisationDescription')}
            />

            <Textarea
              label="Why do you want to partner with VeteranFinder?"
              placeholder="Tell us what kind of fit you have in mind and why it would be useful for our community."
              rows={5}
              error={errors.partnershipReason?.message}
              disabled={formDisabled}
              {...register('partnershipReason')}
            />

            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-950">Preferred partnership types</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedCountLabel}</p>
                </div>
                {typeError && <p className="text-sm text-destructive">{typeError}</p>}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {PARTNERSHIP_TYPE_OPTIONS.map((option) => {
                  const checked = selectedPartnershipTypes.includes(option.value);

                  return (
                    <label
                      key={option.value}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors',
                        checked
                          ? 'border-sky-300 bg-sky-50/80 text-slate-950'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                        formDisabled && 'cursor-not-allowed opacity-70',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        checked={checked}
                        disabled={formDisabled}
                        onChange={() => togglePartnershipType(option.value)}
                      />
                      <span className="leading-6">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="budgetRange"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Budget range / package interest"
                    placeholder="Optional"
                    options={[...BUDGET_RANGE_OPTIONS]}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={errors.budgetRange?.message}
                    disabled={formDisabled}
                  />
                )}
              />
              <Input
                label="Audience / service area"
                placeholder="UK-wide, Scotland, online only, etc."
                hint="Optional"
                error={errors.audienceServiceArea?.message}
                disabled={formDisabled}
                {...register('audienceServiceArea')}
              />
            </div>

            <Textarea
              label="Notes"
              placeholder="Anything else the team should know before review."
              rows={4}
              hint="Optional"
              error={errors.notes?.message}
              disabled={formDisabled}
              {...register('notes')}
            />

            <div className="hidden" aria-hidden="true">
              <Input
                tabIndex={-1}
                autoComplete="off"
                label="Office location"
                error={errors.officeLocation?.message}
                disabled={formDisabled}
                {...register('officeLocation')}
              />
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 text-sm text-slate-500">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600" />
                <p className="leading-6">
                  Submissions go to the partnerships desk via Resend and are reviewed manually before any options or pricing are shared.
                </p>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-sky-600 shadow-[0_18px_42px_-24px_rgba(14,165,233,0.45)] hover:bg-sky-700 sm:w-auto"
                disabled={formDisabled}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending enquiry...
                  </>
                ) : (
                  <>
                    Submit enquiry
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
