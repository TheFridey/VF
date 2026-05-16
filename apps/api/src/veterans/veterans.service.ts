import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MilitaryBranch, Prisma, ServicePeriod } from '@prisma/client';
import {
  UpdateVeteranDetailsDto,
  CreateServicePeriodDto,
  UpdateServicePeriodDto,
} from './dto/veteran.dto';

const RANK_MAX_LENGTH = 100;
const REGIMENT_MAX_LENGTH = 200;
const TRADE_MAX_LENGTH = 100;
const MAX_LIST_ITEMS = 10;

function hasOwnProperty<T extends object>(value: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function sanitizeNullableString(
  value: string | null | undefined,
  fieldName: string,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return null;
  }

  if (trimmedValue.length > maxLength) {
    throw new BadRequestException(`${fieldName} must be ${maxLength} characters or fewer`);
  }

  return trimmedValue;
}

function sanitizeStringArray(values: string[] | undefined): string[] | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const value of values) {
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      continue;
    }

    const dedupeKey = trimmedValue.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    sanitized.push(trimmedValue);

    if (sanitized.length === MAX_LIST_ITEMS) {
      break;
    }
  }

  return sanitized;
}

function resolveServiceStartDate(dto: CreateServicePeriodDto | UpdateServicePeriodDto): Date | undefined {
  if (dto.startDate) {
    return new Date(dto.startDate);
  }

  if (dto.startYear != null) {
    return new Date(dto.startYear, (dto.startMonth ?? 1) - 1, 1);
  }

  return undefined;
}

function resolveServiceEndDate(dto: CreateServicePeriodDto | UpdateServicePeriodDto): Date | null | undefined {
  if (dto.endDate !== undefined) {
    return dto.endDate ? new Date(dto.endDate) : null;
  }

  if (dto.endYear != null) {
    return new Date(dto.endYear, (dto.endMonth ?? 1) - 1, 1);
  }

  return undefined;
}

function assertValidDate(value: Date | null | undefined, fieldName: string): void {
  if (value && Number.isNaN(value.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date`);
  }
}

@Injectable()
export class VeteransService {
  constructor(private prisma: PrismaService) {}

  async getVeteranDetails(userId: string) {
    const details = await this.prisma.veteranDetails.findUnique({
      where: { userId },
      include: { servicePeriods: true },
    });
    if (!details) {
      return this.prisma.veteranDetails.create({
        data: { userId },
        include: { servicePeriods: true },
      });
    }
    return details;
  }

  async updateVeteranDetails(userId: string, dto: UpdateVeteranDetailsDto) {
    let details = await this.prisma.veteranDetails.findUnique({
      where: { userId },
      include: { servicePeriods: true },
    });
    if (!details) {
      details = await this.prisma.veteranDetails.create({
        data: { userId },
        include: { servicePeriods: true },
      });
    }

    const data: Prisma.VeteranDetailsUpdateInput = {};

    if (hasOwnProperty(dto, 'branch')) {
      data.branch = dto.branch ?? null;
    }

    if (hasOwnProperty(dto, 'rank')) {
      data.rank = sanitizeNullableString(dto.rank, 'rank', RANK_MAX_LENGTH);
    }

    if (hasOwnProperty(dto, 'regiment')) {
      data.regiment = sanitizeNullableString(dto.regiment, 'regiment', REGIMENT_MAX_LENGTH);
    }

    if (hasOwnProperty(dto, 'trade')) {
      data.mos = sanitizeNullableString(dto.trade, 'trade', TRADE_MAX_LENGTH);
    }

    if (hasOwnProperty(dto, 'deployments')) {
      data.deployments = sanitizeStringArray(dto.deployments) ?? [];
    }

    if (hasOwnProperty(dto, 'dutyStations')) {
      data.dutyStations = sanitizeStringArray(dto.dutyStations) ?? [];
    }

    const updatedDetails = await this.prisma.veteranDetails.update({
      where: { userId },
      data,
      include: { servicePeriods: true },
    });

    const shouldSyncPrimaryPeriod =
      dto.startDate !== undefined
      || dto.endDate !== undefined
      || dto.regiment !== undefined
      || dto.branch !== undefined;
    if (!shouldSyncPrimaryPeriod) {
      return updatedDetails;
    }

    const primaryServicePeriod = updatedDetails.servicePeriods[0] ?? null;
    const nextStartDate = dto.startDate !== undefined
      ? (dto.startDate ? new Date(dto.startDate) : undefined)
      : primaryServicePeriod?.startDate;
    const nextEndDate = dto.endDate !== undefined
      ? (dto.endDate ? new Date(dto.endDate) : null)
      : (primaryServicePeriod?.endDate ?? undefined);

    assertValidDate(nextStartDate, 'startDate');
    assertValidDate(nextEndDate ?? undefined, 'endDate');

    if (!nextStartDate) {
      return updatedDetails;
    }

    const periodBranch = updatedDetails.branch ?? primaryServicePeriod?.branch;
    if (!periodBranch) {
      throw new BadRequestException('branch is required before saving service dates');
    }

    if (primaryServicePeriod) {
      await this.prisma.servicePeriod.update({
        where: { id: primaryServicePeriod.id },
        data: {
          branch: periodBranch,
          startDate: nextStartDate,
          endDate: nextEndDate ?? null,
          unit: updatedDetails.regiment ?? null,
        },
      });
    } else {
      await this.prisma.servicePeriod.create({
        data: {
          veteranDetailsId: updatedDetails.id,
          branch: periodBranch,
          startDate: nextStartDate,
          endDate: nextEndDate ?? null,
          unit: updatedDetails.regiment ?? null,
        },
      });
    }

    return this.prisma.veteranDetails.findUniqueOrThrow({
      where: { userId },
      include: { servicePeriods: true },
    });
  }

  async addServicePeriod(userId: string, dto: CreateServicePeriodDto) {
    const details = await this.getVeteranDetails(userId);
    const startDate = resolveServiceStartDate(dto);
    const endDate = resolveServiceEndDate(dto);

    if (!startDate) {
      throw new BadRequestException('startDate or startYear is required');
    }

    assertValidDate(startDate, 'startDate');
    assertValidDate(endDate ?? undefined, 'endDate');

    return this.prisma.servicePeriod.create({
      data: {
        veteranDetailsId: details.id,
        branch: dto.branch as MilitaryBranch,
        startDate,
        endDate: endDate ?? null,
        unit: sanitizeNullableString(dto.unit, 'unit', REGIMENT_MAX_LENGTH),
        dutyStation: sanitizeNullableString(dto.location, 'location', REGIMENT_MAX_LENGTH),
      },
    });
  }

  async updateServicePeriod(
    userId: string,
    periodId: string,
    dto: UpdateServicePeriodDto,
  ) {
    const period = await this.prisma.servicePeriod.findUnique({
      where: { id: periodId },
      include: { veteranDetails: true },
    });
    if (!period || period.veteranDetails.userId !== userId) {
      throw new NotFoundException('Service period not found');
    }

    const startDate = resolveServiceStartDate(dto);
    const endDate = resolveServiceEndDate(dto);

    assertValidDate(startDate, 'startDate');
    assertValidDate(endDate ?? undefined, 'endDate');

    return this.prisma.servicePeriod.update({
      where: { id: periodId },
      data: {
        ...(startDate && { startDate }),
        ...(dto.endDate !== undefined || dto.endYear !== undefined ? { endDate: endDate ?? null } : {}),
        ...(dto.unit !== undefined && {
          unit: sanitizeNullableString(dto.unit, 'unit', REGIMENT_MAX_LENGTH),
        }),
        ...(dto.location !== undefined && {
          dutyStation: sanitizeNullableString(dto.location, 'location', REGIMENT_MAX_LENGTH),
        }),
      },
    });
  }

  async deleteServicePeriod(userId: string, periodId: string) {
    const period = await this.prisma.servicePeriod.findUnique({
      where: { id: periodId },
      include: { veteranDetails: true },
    });
    if (!period || period.veteranDetails.userId !== userId) {
      throw new NotFoundException('Service period not found');
    }
    return this.prisma.servicePeriod.delete({ where: { id: periodId } });
  }
}
