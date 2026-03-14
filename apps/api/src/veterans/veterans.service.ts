import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MilitaryBranch } from '@prisma/client';
import {
  UpdateVeteranDetailsDto,
  CreateServicePeriodDto,
  UpdateServicePeriodDto,
} from './dto/veteran.dto';

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
    let details = await this.prisma.veteranDetails.findUnique({ where: { userId } });
    if (!details) {
      details = await this.prisma.veteranDetails.create({ data: { userId } });
    }
    return this.prisma.veteranDetails.update({
      where: { userId },
      data: {
        ...(dto.branch && { branch: dto.branch as MilitaryBranch }),
        ...(dto.rank !== undefined && { rank: dto.rank }),
        ...(dto.regiment !== undefined && { regiment: dto.regiment }),
      },
      include: { servicePeriods: true },
    });
  }

  async addServicePeriod(userId: string, dto: CreateServicePeriodDto) {
    const details = await this.getVeteranDetails(userId);
    const startDate = new Date(dto.startYear, dto.startMonth - 1, 1);
    const endDate =
      dto.endYear != null
        ? new Date(dto.endYear, (dto.endMonth ?? 1) - 1, 1)
        : null;
    return this.prisma.servicePeriod.create({
      data: {
        veteranDetailsId: details.id,
        branch: dto.branch as MilitaryBranch,
        startDate,
        endDate,
        unit: dto.unit,
        dutyStation: dto.location,
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
    const startDate =
      dto.startYear != null
        ? new Date(dto.startYear, (dto.startMonth ?? 1) - 1, 1)
        : undefined;
    const endDate =
      dto.endYear != null
        ? new Date(dto.endYear, (dto.endMonth ?? 1) - 1, 1)
        : undefined;
    return this.prisma.servicePeriod.update({
      where: { id: periodId },
      data: { startDate, endDate, unit: dto.unit, dutyStation: dto.location },
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
