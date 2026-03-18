import { HttpException, HttpStatus, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Resend } from 'resend';
import { ContactMessageDto, type ContactSubject } from './dto/contact-message.dto';
import {
  PartnershipEnquiryDto,
  type PartnershipBudgetRange,
  type PartnershipOrganisationType,
  type PartnershipType,
} from './dto/partnership-enquiry.dto';
import { RedisService } from '../common/redis/redis.service';

interface SlaBreachAlertData {
  requestId: string;
  veteranName: string;
  veteranEmail: string;
  submittedAt: Date;
  hoursOverdue: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly appUrl: string;
  private readonly contactEmail: string;
  private readonly supportEmail: string;
  private readonly privacyEmail: string;
  private readonly legalEmail: string;
  private readonly partnershipsEmail: string;

  constructor(private readonly redisService: RedisService) {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'VeteranFinder <noreply@veteranfinder.co.uk>';
    this.appUrl = process.env.APP_URL || 'https://veteranfinder.co.uk';
    this.contactEmail = process.env.CONTACT_EMAIL || 'hello@veteranfinder.co.uk';
    this.supportEmail = process.env.SUPPORT_EMAIL || 'support@veteranfinder.co.uk';
    this.privacyEmail = process.env.PRIVACY_EMAIL || 'privacy@veteranfinder.co.uk';
    this.legalEmail = process.env.LEGAL_EMAIL || this.privacyEmail;
    this.partnershipsEmail = process.env.PARTNERSHIPS_EMAIL_TO || 'partnerships@veteranfinder.co.uk';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service initialised via Resend');
    } else {
      this.logger.warn('RESEND_API_KEY not set - email sending disabled (dev mode)');
    }
  }

  private async send(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
    if (!this.resend) {
      this.logger.debug(`[DEV] Email to ${to}: ${subject}`);
      return true;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      });

      if (error) {
        this.logger.error(`Resend error sending to ${to}: ${JSON.stringify(error)}`);
        return false;
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${to}: ${message}`);
      return false;
    }
  }

  private wrap(title: string, body: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0e1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e2e8f0; }
    .container { max-width: 600px; margin: 40px auto; background: #111827; border: 1px solid #1e3a5f; border-radius: 8px; overflow: hidden; }
    .header { background: #0d1f3c; padding: 32px 40px; border-bottom: 2px solid #c9a84c; }
    .header h1 { margin: 0; font-size: 22px; color: #c9a84c; letter-spacing: 0.05em; text-transform: uppercase; }
    .body { padding: 32px 40px; line-height: 1.6; }
    .body p { margin: 0 0 16px; color: #cbd5e1; }
    .btn { display: inline-block; padding: 12px 28px; background: #c9a84c; color: #0a0e1a !important; text-decoration: none; border-radius: 4px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; font-size: 13px; margin: 8px 0; }
    .footer { padding: 20px 40px; background: #0d1f3c; color: #64748b; font-size: 12px; border-top: 1px solid #1e3a5f; }
    .alert-red { background: #2d0a0a; border: 1px solid #dc2626; border-radius: 4px; padding: 12px 16px; margin: 16px 0; color: #fca5a5; }
    .alert-amber { background: #2d1a00; border: 1px solid #d97706; border-radius: 4px; padding: 12px 16px; margin: 16px 0; color: #fcd34d; }
    code { color: #f8fafc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${title}</h1></div>
    <div class="body">${body}</div>
    <div class="footer">
      <p>VeteranFinder - Serving those who served. veteranfinder.co.uk</p>
      <p>This is an automated message. Replies are monitored by the VeteranFinder team.</p>
    </div>
  </div>
</body>
</html>`;
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const link = `${this.appUrl}/auth/verify-email?token=${token}`;
    const body = `
      <p>Welcome to VeteranFinder. Please verify your email address to activate your account.</p>
      <p><a href="${link}" class="btn">Verify Email</a></p>
      <p>This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>`;
    await this.send(to, 'Verify your VeteranFinder email', this.wrap('Verify your email', body), this.supportEmail);
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.appUrl}/auth/reset-password?token=${token}`;
    const body = `
      <p>We received a request to reset your VeteranFinder password.</p>
      <p><a href="${link}" class="btn">Reset Password</a></p>
      <p>This link expires in 1 hour. If you did not request a reset, no action is needed and your password has not changed.</p>`;
    await this.send(to, 'Reset your VeteranFinder password', this.wrap('Reset your password', body), this.supportEmail);
  }

  async sendVerificationApproved(to: string, displayName?: string): Promise<void> {
    const name = displayName ? `Hi ${this.escapeHtml(displayName)}` : 'Hi';
    const body = `
      <p>${name},</p>
      <p>Your veteran status has been verified. You now have full access to VeteranFinder, including Brothers in Arms search, messaging, and the BIA community features.</p>
      <p><a href="${this.appUrl}/app/brothers" class="btn">Find Brothers in Arms</a></p>
      <div class="alert-amber">
        <strong>Welcome to the brotherhood.</strong> If you have any questions about the platform, reply to this email or use the contact page.
      </div>`;
    await this.send(to, 'Your veteran status is verified - VeteranFinder', this.wrap('Verification approved', body), this.supportEmail);
  }

  async sendVerificationRejected(to: string, reason: string, displayName?: string): Promise<void> {
    const name = displayName ? `Hi ${this.escapeHtml(displayName)}` : 'Hi';
    const body = `
      <p>${name},</p>
      <p>Unfortunately your verification request could not be approved at this time.</p>
      <div class="alert-red">
        <strong>Reason:</strong> ${this.escapeHtml(reason)}
      </div>
      <p>You can resubmit with additional documentation through the app. If you believe this is an error, please reply to this email or contact support.</p>
      <p><a href="${this.appUrl}/app/profile" class="btn">Resubmit Verification</a></p>`;
    await this.send(to, 'VeteranFinder verification - action required', this.wrap('Verification unsuccessful', body), this.supportEmail);
  }

  async sendNewConnectionNotification(to: string, connectedWith: string): Promise<void> {
    const body = `
      <p>${this.escapeHtml(connectedWith)} has connected with you on VeteranFinder.</p>
      <p><a href="${this.appUrl}/app/messages" class="btn">View Messages</a></p>`;
    await this.send(
      to,
      `${this.escapeHtml(connectedWith)} connected with you on VeteranFinder`,
      this.wrap('New connection', body),
      this.supportEmail,
    );
  }

  async sendContactFormSubmission(data: ContactMessageDto): Promise<void> {
    const recipient = this.getContactRecipient(data.subject);
    const subjectLabel = this.getContactSubjectLabel(data.subject);
    const safeName = this.escapeHtml(data.name.trim());
    const safeEmail = this.escapeHtml(data.email.trim().toLowerCase());
    const safeMessage = this.escapeHtml(data.message.trim()).replace(/\n/g, '<br />');

    const body = `
      <p>A new public contact form submission was received on veteranfinder.co.uk.</p>
      <p><strong>Route:</strong> ${subjectLabel}</p>
      <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
      <div class="alert-amber">
        <strong>Submitted message</strong><br />
        ${safeMessage}
      </div>
      <p>Reply directly to this email to continue the conversation with the sender.</p>`;

    const sent = await this.send(
      recipient,
      `[Website Contact] ${subjectLabel} - ${safeName}`,
      this.wrap(`Contact form - ${subjectLabel}`, body),
      data.email.trim(),
    );

    if (!sent) {
      throw new InternalServerErrorException('Unable to send your message right now. Please try again shortly.');
    }

    const confirmationBody = `
      <p>Hi ${safeName},</p>
      <p>We have received your message and routed it to the right VeteranFinder team.</p>
      <div class="alert-amber">
        <strong>Topic:</strong> ${subjectLabel}
      </div>
      <p>We aim to respond within 24 to 48 hours on business days.</p>
      <p>If you need to follow up, reply to this email and we will pick it up.</p>`;

    await this.send(
      data.email.trim(),
      'We received your VeteranFinder message',
      this.wrap('Message received', confirmationBody),
      recipient,
    );
  }

  async sendPartnershipEnquiry(data: PartnershipEnquiryDto): Promise<void> {
    const dedupeKey = await this.registerPartnershipSubmission(data);

    const submittedAt = new Date();
    const submittedAtLabel = submittedAt.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const organisationName = this.escapeHtml(data.organisationName);
    const contactName = this.escapeHtml(data.contactName);
    const email = this.escapeHtml(data.email.trim().toLowerCase());
    const phone = data.phoneNumber ? this.escapeHtml(data.phoneNumber) : 'Not provided';
    const websiteUrl = this.escapeHtml(data.websiteUrl);
    const organisationType = this.getOrganisationTypeLabel(data.organisationType);
    const budgetRange = data.budgetRange ? this.getBudgetRangeLabel(data.budgetRange) : 'Not specified';
    const partnershipTypes = data.partnershipTypes?.length
      ? data.partnershipTypes.map((type) => this.getPartnershipTypeLabel(type)).join(', ')
      : 'Open to discussion';
    const audienceServiceArea = data.audienceServiceArea ? this.escapeHtml(data.audienceServiceArea) : 'Not provided';
    const notes = data.notes ? this.escapeHtml(data.notes).replace(/\n/g, '<br />') : 'No additional notes supplied.';
    const description = this.escapeHtml(data.organisationDescription).replace(/\n/g, '<br />');
    const partnershipReason = this.escapeHtml(data.partnershipReason).replace(/\n/g, '<br />');
    const environment = this.escapeHtml(process.env.NODE_ENV || 'development');

    const body = `
      <p>A new partner enquiry has been submitted through the public VeteranFinder website.</p>
      <div class="alert-amber">
        <strong>Manual review required.</strong><br />
        This submission has been queued for the partnerships team to assess for relevance, fit, and placement options.
      </div>
      <p><strong>Organisation:</strong> ${organisationName}</p>
      <p><strong>Contact:</strong> ${contactName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Organisation type:</strong> ${organisationType}</p>
      <p><strong>Website:</strong> <a href="${websiteUrl}" target="_blank" rel="noreferrer">${websiteUrl}</a></p>
      <p><strong>Preferred partnership types:</strong> ${this.escapeHtml(partnershipTypes)}</p>
      <p><strong>Budget range:</strong> ${this.escapeHtml(budgetRange)}</p>
      <p><strong>Audience / service area:</strong> ${audienceServiceArea}</p>
      <p><strong>Submitted:</strong> ${submittedAtLabel}</p>
      <p><strong>Environment:</strong> ${environment}</p>
      <div class="alert-amber">
        <strong>Organisation description</strong><br />
        ${description}
      </div>
      <div class="alert-amber">
        <strong>Why they want to partner</strong><br />
        ${partnershipReason}
      </div>
      <div class="alert-amber">
        <strong>Additional notes</strong><br />
        ${notes}
      </div>
      <p>Reply directly to this email to continue the conversation with the sender.</p>`;

    const subject = `[Partnership Enquiry] ${data.organisationName} - ${data.contactName}`;
    const sent = await this.send(
      this.partnershipsEmail,
      subject,
      this.wrap('New partnership enquiry', body),
      data.email.trim(),
    );

    if (!sent) {
      await this.redisService.del(dedupeKey);
      throw new InternalServerErrorException('Unable to send your enquiry right now. Please try again shortly.');
    }

    const confirmationBody = `
      <p>Hi ${contactName},</p>
      <p>Thank you for your interest in partnering with VeteranFinder.</p>
      <div class="alert-amber">
        <strong>Your enquiry is now with our partnerships team.</strong><br />
        Every request is reviewed manually for audience fit, relevance, and placement suitability.
      </div>
      <p>If there is a suitable fit, we will reply with tailored options and quoted pricing rather than fixed public packages.</p>
      <p>You can reply to this email if there is anything else you would like us to consider before review.</p>`;

    await this.send(
      data.email.trim(),
      'We received your VeteranFinder partnership enquiry',
      this.wrap('Partnership enquiry received', confirmationBody),
      this.partnershipsEmail,
    );
  }

  async sendSlaBreachAlert(to: string, data: SlaBreachAlertData): Promise<void> {
    const { requestId, veteranName, veteranEmail, submittedAt, hoursOverdue } = data;
    const adminLink = `${this.appUrl}/verification?highlight=${requestId}`;
    const submittedFormatted = submittedAt.toLocaleString('en-GB', { timeZone: 'Europe/London' });

    const body = `
      <p>A verification request has breached the 48-hour SLA and requires immediate attention.</p>
      <div class="alert-red">
        <strong>SLA BREACH - ${hoursOverdue} hours overdue</strong>
      </div>
      <p><strong>Veteran:</strong> ${this.escapeHtml(veteranName)} (${this.escapeHtml(veteranEmail)})</p>
      <p><strong>Request ID:</strong> <code>${this.escapeHtml(requestId)}</code></p>
      <p><strong>Submitted:</strong> ${submittedFormatted}</p>
      <p><strong>Overdue by:</strong> ${hoursOverdue} hour${hoursOverdue !== 1 ? 's' : ''}</p>
      <p><a href="${adminLink}" class="btn">Review Now in Admin Panel</a></p>
      <p style="color:#94a3b8;font-size:13px;">This alert was sent once and will not repeat for this request unless re-triggered.</p>`;

    await this.send(
      to,
      `SLA BREACH: Verification pending ${hoursOverdue}h overdue - ${this.escapeHtml(veteranName)}`,
      this.wrap('SLA Breach Alert', body),
      this.legalEmail,
    );
  }

  private getContactRecipient(subject: ContactSubject) {
    switch (subject) {
      case 'general':
      case 'feedback':
      case 'business':
        return this.contactEmail;
      case 'support':
      case 'verification':
      case 'other':
        return this.supportEmail;
      case 'privacy':
        return this.privacyEmail;
      default:
        return this.contactEmail;
    }
  }

  private getContactSubjectLabel(subject: ContactSubject) {
    switch (subject) {
      case 'general':
        return 'General enquiry';
      case 'support':
        return 'Technical support';
      case 'verification':
        return 'Verification help';
      case 'privacy':
        return 'Privacy / data request';
      case 'feedback':
        return 'Feedback / suggestions';
      case 'business':
        return 'Business / partnership';
      case 'other':
      default:
        return 'Other';
    }
  }

  private async registerPartnershipSubmission(data: PartnershipEnquiryDto) {
    const dedupeSource = JSON.stringify({
      organisationName: data.organisationName.trim().toLowerCase(),
      contactName: data.contactName.trim().toLowerCase(),
      email: data.email.trim().toLowerCase(),
      websiteUrl: data.websiteUrl.trim().toLowerCase(),
      partnershipReason: data.partnershipReason.trim().toLowerCase(),
    });
    const key = `partnership-enquiry:${createHash('sha256').update(dedupeSource).digest('hex')}`;

    if (await this.redisService.exists(key)) {
      throw new HttpException(
        'We recently received this enquiry. Please wait a few minutes before sending it again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.redisService.set(key, '1', 600);
    return key;
  }

  private getOrganisationTypeLabel(value: PartnershipOrganisationType) {
    switch (value) {
      case 'charity':
        return 'Charity';
      case 'veteran_support':
        return 'Veteran support organisation';
      case 'mental_health':
        return 'Mental health organisation';
      case 'training_employment':
        return 'Training or employment provider';
      case 'housing_support':
        return 'Housing or welfare support organisation';
      case 'business':
        return 'Relevant business';
      case 'public_sector':
        return 'Public sector or institution';
      case 'other':
      default:
        return 'Other';
    }
  }

  private getBudgetRangeLabel(value: PartnershipBudgetRange) {
    switch (value) {
      case 'under_500':
        return 'Under GBP 500';
      case '500_1500':
        return 'GBP 500 to GBP 1,500';
      case '1500_3000':
        return 'GBP 1,500 to GBP 3,000';
      case '3000_plus':
        return 'GBP 3,000+';
      case 'unsure':
      default:
        return 'Unsure / open to guidance';
    }
  }

  private getPartnershipTypeLabel(value: PartnershipType) {
    switch (value) {
      case 'dashboard_placement':
        return 'Dashboard placement';
      case 'resource_listing':
        return 'Resource listing';
      case 'forum_visibility':
        return 'Forum visibility';
      case 'email_spotlight':
        return 'Email spotlight';
      case 'support_hub_feature':
        return 'Support hub feature';
      case 'other':
      default:
        return 'Other / custom';
    }
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
