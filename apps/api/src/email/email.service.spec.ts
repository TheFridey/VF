import { HttpException, HttpStatus } from '@nestjs/common';
import { EmailService } from './email.service';
import { PartnershipEnquiryDto } from './dto/partnership-enquiry.dto';

class RedisServiceStub {
  private readonly store = new Map<string, string>();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
  }

  async exists(key: string) {
    return this.store.has(key);
  }

  async del(key: string) {
    this.store.delete(key);
  }
}

describe('EmailService partnership enquiries', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalResendApiKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.RESEND_API_KEY = originalResendApiKey;
    jest.restoreAllMocks();
  });

  it('blocks duplicate rapid partnership submissions', async () => {
    const service = new EmailService(new RedisServiceStub() as any);
    const payload: PartnershipEnquiryDto = {
      organisationName: 'Veteran Support Trust',
      contactName: 'Jordan Lee',
      email: 'jordan@example.org',
      organisationType: 'charity',
      websiteUrl: 'https://example.org',
      organisationDescription: 'We provide structured welfare and transition support for veterans and their families.',
      partnershipReason: 'We want to explore a curated support hub listing and limited spotlight opportunities.',
      phoneNumber: '+44 7700 900123',
      budgetRange: 'unsure',
      partnershipTypes: ['support_hub_feature'],
      audienceServiceArea: 'United Kingdom',
      notes: 'Manual review is welcome.',
      officeLocation: '',
    };

    await expect(service.sendPartnershipEnquiry(payload)).resolves.toBeUndefined();
    await expect(service.sendPartnershipEnquiry(payload)).rejects.toMatchObject({
      getStatus: expect.any(Function),
    });

    await service.sendPartnershipEnquiry(payload).catch((error: HttpException) => {
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });
  });
});
