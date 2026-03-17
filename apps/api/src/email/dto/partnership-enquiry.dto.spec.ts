import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PartnershipEnquiryDto } from './partnership-enquiry.dto';

describe('PartnershipEnquiryDto', () => {
  const validPayload = {
    organisationName: 'Forces Employment Network',
    contactName: 'Alex Carter',
    email: 'alex@example.org',
    organisationType: 'training_employment',
    websiteUrl: 'https://example.org',
    organisationDescription: 'We help veterans move into long-term civilian employment with tailored training and support.',
    partnershipReason: 'We would like to discuss a curated listing and occasional spotlight placement for relevant veterans.',
    phoneNumber: '+44 7700 900123',
    budgetRange: '500_1500',
    partnershipTypes: ['dashboard_placement', 'email_spotlight'],
    audienceServiceArea: 'UK-wide',
    notes: 'Happy to share existing materials after an initial review.',
    officeLocation: '',
  };

  it('accepts a valid partnership enquiry', async () => {
    const instance = plainToInstance(PartnershipEnquiryDto, validPayload);
    const errors = await validate(instance);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid payloads and honeypot spam', async () => {
    const instance = plainToInstance(PartnershipEnquiryDto, {
      ...validPayload,
      email: 'not-an-email',
      websiteUrl: 'example.org',
      organisationDescription: 'Too short',
      partnershipTypes: ['invalid-option'],
      officeLocation: 'bot-filled',
    });

    const errors = await validate(instance);
    const invalidFields = errors.map((error) => error.property);

    expect(invalidFields).toEqual(
      expect.arrayContaining(['email', 'websiteUrl', 'organisationDescription', 'partnershipTypes', 'officeLocation']),
    );
  });
});
