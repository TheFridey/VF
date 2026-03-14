import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

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

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'VeteranFinder <noreply@veteranfinder.co.uk>';
    this.appUrl = process.env.APP_URL || 'https://veteranfinder.co.uk';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service initialised via Resend');
    } else {
      this.logger.warn('RESEND_API_KEY not set — email sending disabled (dev mode)');
    }
  }

  // ── Core send ────────────────────────────────────────────────────────────────

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.debug(`[DEV] Email to ${to}: ${subject}`);
      return;
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      if (error) {
        this.logger.error(`Resend error sending to ${to}: ${JSON.stringify(error)}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  // ── Template wrapper ─────────────────────────────────────────────────────────

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
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${title}</h1></div>
    <div class="body">${body}</div>
    <div class="footer">
      <p>VeteranFinder — Serving those who served. veteranfinder.co.uk</p>
      <p>This is an automated message. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
  }

  // ── Transactional emails ──────────────────────────────────────────────────────

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const link = `${this.appUrl}/auth/verify-email?token=${token}`;
    const body = `
      <p>Welcome to VeteranFinder. Please verify your email address to activate your account.</p>
      <p><a href="${link}" class="btn">Verify Email</a></p>
      <p>This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>`;
    await this.send(to, 'Verify your VeteranFinder email', this.wrap('Verify your email', body));
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.appUrl}/auth/reset-password?token=${token}`;
    const body = `
      <p>We received a request to reset your VeteranFinder password.</p>
      <p><a href="${link}" class="btn">Reset Password</a></p>
      <p>This link expires in 1 hour. If you didn't request a reset, no action is needed — your password hasn't changed.</p>`;
    await this.send(to, 'Reset your VeteranFinder password', this.wrap('Reset your password', body));
  }

  async sendVerificationApproved(to: string, displayName?: string): Promise<void> {
    const name = displayName ? `Hi ${displayName}` : 'Hi';
    const body = `
      <p>${name},</p>
      <p>Your veteran status has been verified. You now have full access to VeteranFinder, including Brothers in Arms search, messaging, and the BIA community features.</p>
      <p><a href="${this.appUrl}/app/brothers" class="btn">Find Brothers in Arms</a></p>
      <div class="alert-amber">
        <strong>Welcome to the brotherhood.</strong> If you have any questions about the platform, reply to any support email or use the in-app contact form.
      </div>`;
    await this.send(to, 'Your veteran status is verified — VeteranFinder', this.wrap('Verification approved ✓', body));
  }

  async sendVerificationRejected(to: string, reason: string, displayName?: string): Promise<void> {
    const name = displayName ? `Hi ${displayName}` : 'Hi';
    const body = `
      <p>${name},</p>
      <p>Unfortunately your verification request could not be approved at this time.</p>
      <div class="alert-red">
        <strong>Reason:</strong> ${reason}
      </div>
      <p>You can resubmit with additional documentation through the app. If you believe this is an error, please contact support.</p>
      <p><a href="${this.appUrl}/app/profile" class="btn">Resubmit Verification</a></p>`;
    await this.send(to, 'VeteranFinder verification — action required', this.wrap('Verification unsuccessful', body));
  }

  async sendNewConnectionNotification(to: string, connectedWith: string): Promise<void> {
    const body = `
      <p>${connectedWith} has connected with you on VeteranFinder.</p>
      <p><a href="${this.appUrl}/app/messages" class="btn">View Messages</a></p>`;
    await this.send(to, `${connectedWith} connected with you on VeteranFinder`, this.wrap('New connection', body));
  }

  // ── SLA breach alert (Part 20) ────────────────────────────────────────────────

  async sendSlaBreachAlert(to: string, data: SlaBreachAlertData): Promise<void> {
    const { requestId, veteranName, veteranEmail, submittedAt, hoursOverdue } = data;
    const adminLink = `${this.appUrl}/verification?highlight=${requestId}`;
    const submittedFormatted = submittedAt.toLocaleString('en-GB', { timeZone: 'Europe/London' });

    const body = `
      <p>A verification request has breached the 48-hour SLA and requires immediate attention.</p>
      <div class="alert-red">
        <strong>⚠ SLA BREACH — ${hoursOverdue} hours overdue</strong>
      </div>
      <p><strong>Veteran:</strong> ${veteranName} (${veteranEmail})</p>
      <p><strong>Request ID:</strong> <code>${requestId}</code></p>
      <p><strong>Submitted:</strong> ${submittedFormatted}</p>
      <p><strong>Overdue by:</strong> ${hoursOverdue} hour${hoursOverdue !== 1 ? 's' : ''}</p>
      <p><a href="${adminLink}" class="btn">Review Now in Admin Panel</a></p>
      <p style="color:#94a3b8;font-size:13px;">This alert was sent once and will not repeat for this request unless re-triggered.</p>`;

    await this.send(to, `⚠ SLA BREACH: Verification pending ${hoursOverdue}h overdue — ${veteranName}`, this.wrap('SLA Breach Alert', body));
  }
}
