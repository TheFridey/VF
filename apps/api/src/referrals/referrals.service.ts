import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { RecordReferralShareDto } from './dto/referrals.dto';

function formatRegimentLabel(regiment?: string | null) {
  if (!regiment) return null;

  return regiment
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditService: AuditService,
  ) {}

  async ensureCode(userId: string) {
    const referralCode = await this.subscriptionsService.ensureUserReferralCode(userId);
    return { referralCode };
  }

  async getReferralHub(userId: string) {
    const [summary, user, shareLogs] = await Promise.all([
      this.subscriptionsService.getReferralSummary(userId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          profile: { select: { displayName: true } },
          veteranDetails: { select: { regiment: true, branch: true } },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          userId,
          action: 'referral_invite_shared',
          resource: 'referral',
        },
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          metadata: true,
        },
      }),
    ]);

    const regimentLabel = formatRegimentLabel(user?.veteranDetails?.regiment) || 'your old unit';
    const inviterName = user?.profile?.displayName?.trim() || 'I';
    const remainingToReward = Math.max(0, 3 - summary.qualifiedCount);

    const shareStats = shareLogs.reduce(
      (acc, log) => {
        const channel =
          typeof log.metadata === 'object' && log.metadata && 'channel' in log.metadata
            ? String((log.metadata as Record<string, unknown>).channel || 'other')
            : 'other';
        acc.total += 1;
        acc.byChannel[channel] = (acc.byChannel[channel] || 0) + 1;
        if (!acc.lastSharedAt || log.createdAt > acc.lastSharedAt) {
          acc.lastSharedAt = log.createdAt;
        }
        return acc;
      },
      {
        total: 0,
        byChannel: {} as Record<string, number>,
        lastSharedAt: null as Date | null,
      },
    );

    const shareUrl = summary.shareUrl;
    const shareText = `${inviterName} is on VeteranFinder trying to reconnect with the people they served with. If you were in ${regimentLabel}, create your profile here: ${shareUrl}`;

    return {
      ...summary,
      regimentLabel,
      invitePrompt: `Who else from ${regimentLabel} should be here?`,
      rewardMessage:
        summary.nextMilestone === 3
          ? `${remainingToReward} more verified referral${remainingToReward === 1 ? '' : 's'} unlocks a free month of BIA Basic.`
          : 'Your free month of BIA Basic is unlocked.',
      shareStats: {
        totalShares: shareStats.total,
        byChannel: shareStats.byChannel,
        lastSharedAt: shareStats.lastSharedAt,
      },
      shareCopy: {
        whatsapp: `${shareText}`,
        copy: `${shareText}`,
        emailSubject: 'Come and find the people you served with',
        emailBody: `${shareText}`,
      },
    };
  }

  async recordShare(userId: string, dto: RecordReferralShareDto) {
    await this.auditService.log({
      userId,
      action: 'referral_invite_shared',
      resource: 'referral',
      metadata: {
        channel: dto.channel,
        surface: dto.surface || null,
        connectionId: dto.connectionId || null,
      },
    });

    return this.getReferralHub(userId);
  }
}
