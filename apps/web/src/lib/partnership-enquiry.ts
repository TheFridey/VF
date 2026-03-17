import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const ORGANISATION_TYPE_OPTIONS = [
  { value: 'charity', label: 'Charity' },
  { value: 'veteran_support', label: 'Veteran support organisation' },
  { value: 'mental_health', label: 'Mental health organisation' },
  { value: 'training_employment', label: 'Training or employment provider' },
  { value: 'housing_support', label: 'Housing or welfare support organisation' },
  { value: 'business', label: 'Relevant business' },
  { value: 'public_sector', label: 'Public sector / institution' },
  { value: 'other', label: 'Other' },
] as const;

export const PARTNERSHIP_TYPE_OPTIONS = [
  { value: 'dashboard_placement', label: 'Dashboard placement' },
  { value: 'resource_listing', label: 'Resource listing' },
  { value: 'forum_visibility', label: 'Forum visibility' },
  { value: 'email_spotlight', label: 'Email spotlight' },
  { value: 'support_hub_feature', label: 'Support hub feature' },
  { value: 'other', label: 'Other / custom' },
] as const;

export const BUDGET_RANGE_OPTIONS = [
  { value: 'under_500', label: 'Under GBP 500' },
  { value: '500_1500', label: 'GBP 500 to GBP 1,500' },
  { value: '1500_3000', label: 'GBP 1,500 to GBP 3,000' },
  { value: '3000_plus', label: 'GBP 3,000+' },
  { value: 'unsure', label: 'Unsure / open to guidance' },
] as const;

export const organisationTypeValues = ORGANISATION_TYPE_OPTIONS.map((option) => option.value) as [
  (typeof ORGANISATION_TYPE_OPTIONS)[number]['value'],
  ...(typeof ORGANISATION_TYPE_OPTIONS)[number]['value'][],
];
export const partnershipTypeValues = PARTNERSHIP_TYPE_OPTIONS.map((option) => option.value) as [
  (typeof PARTNERSHIP_TYPE_OPTIONS)[number]['value'],
  ...(typeof PARTNERSHIP_TYPE_OPTIONS)[number]['value'][],
];
export const budgetRangeValues = BUDGET_RANGE_OPTIONS.map((option) => option.value) as [
  (typeof BUDGET_RANGE_OPTIONS)[number]['value'],
  ...(typeof BUDGET_RANGE_OPTIONS)[number]['value'][],
];

export const partnershipEnquirySchema = z.object({
  organisationName: z.string().trim().min(2, 'Enter your organisation name').max(120, 'Keep this under 120 characters'),
  contactName: z.string().trim().min(2, 'Enter the main contact name').max(80, 'Keep this under 80 characters'),
  email: z.string().trim().email('Enter a valid email address'),
  organisationType: z.enum(organisationTypeValues, {
    errorMap: () => ({ message: 'Select an organisation type' }),
  }),
  websiteUrl: z.string().trim().url('Enter a full website URL including https://'),
  organisationDescription: z.string()
    .trim()
    .min(20, 'Add a short description so we understand what your organisation does')
    .max(1500, 'Keep this under 1,500 characters'),
  partnershipReason: z.string()
    .trim()
    .min(20, 'Tell us why you want to partner with VeteranFinder')
    .max(2000, 'Keep this under 2,000 characters'),
  phoneNumber: z.preprocess(
    emptyToUndefined,
    z.string()
      .regex(/^[0-9+()\-\s]{7,32}$/, 'Enter a valid phone number')
      .optional(),
  ),
  budgetRange: z.preprocess(emptyToUndefined, z.enum(budgetRangeValues).optional()),
  partnershipTypes: z.array(z.enum(partnershipTypeValues)).max(6, 'Select up to 6 options').default([]),
  audienceServiceArea: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(2, 'Enter an audience or service area').max(160, 'Keep this under 160 characters').optional(),
  ),
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(1500, 'Keep this under 1,500 characters').optional(),
  ),
  officeLocation: z.string().max(0).default(''),
});

export type PartnershipEnquiryFormValues = z.infer<typeof partnershipEnquirySchema>;
export type PartnershipEnquiryPayload = PartnershipEnquiryFormValues;
