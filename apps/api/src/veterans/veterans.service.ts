import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MilitaryBranch } from '@prisma/client';

@Injectable()
export class VeteransService {
  constructor(private prisma: PrismaService) {}

  async getVeteranDetails(userId: string) {
    const details = await this.prisma.veteranDetails.findUnique({
      where: { userId },
      include: { servicePeriods: true },
    });

    if (!details) {
      // Create empty veteran details if not exists
      return this.prisma.veteranDetails.create({
        data: { userId },
        include: { servicePeriods: true },
      });
    }

    return details;
  }

  async updateVeteranDetails(userId: string, dto: any) {
    let details = await this.prisma.veteranDetails.findUnique({
      where: { userId },
    });

    if (!details) {
      details = await this.prisma.veteranDetails.create({
        data: { userId },
      });
    }

    return this.prisma.veteranDetails.update({
      where: { userId },
      data: {
        branch: dto.branch as MilitaryBranch,
        rank: dto.rank,
        mos: dto.mos,
        dutyStations: dto.dutyStations || [],
        deployments: dto.deployments || [],
      },
      include: { servicePeriods: true },
    });
  }

  async addServicePeriod(userId: string, dto: any) {
    const details = await this.getVeteranDetails(userId);

    return this.prisma.servicePeriod.create({
      data: {
        veteranDetailsId: details.id,
        branch: dto.branch as MilitaryBranch,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        unit: dto.unit,
        dutyStation: dto.dutyStation,
      },
    });
  }

  async updateServicePeriod(userId: string, periodId: string, dto: any) {
    // Verify ownership
    const period = await this.prisma.servicePeriod.findUnique({
      where: { id: periodId },
      include: { veteranDetails: true },
    });

    if (!period || period.veteranDetails.userId !== userId) {
      throw new NotFoundException('Service period not found');
    }

    return this.prisma.servicePeriod.update({
      where: { id: periodId },
      data: {
        branch: dto.branch as MilitaryBranch,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        unit: dto.unit,
        dutyStation: dto.dutyStation,
      },
    });
  }

  async deleteServicePeriod(userId: string, periodId: string) {
    // Verify ownership
    const period = await this.prisma.servicePeriod.findUnique({
      where: { id: periodId },
      include: { veteranDetails: true },
    });

    if (!period || period.veteranDetails.userId !== userId) {
      throw new NotFoundException('Service period not found');
    }

    return this.prisma.servicePeriod.delete({
      where: { id: periodId },
    });
  }
}
