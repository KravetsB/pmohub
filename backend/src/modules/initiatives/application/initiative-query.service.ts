import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { HttpStatus } from '@nestjs/common';
import { QuarterDto } from '../api/initiative.dto';
import { cardInclude, mapCard, mapYear, yearInclude } from '../infrastructure/initiative.mapper';

const ok = <T>(message: string, data: T) => ({ success: true as const, message, data });

@Injectable()
export class InitiativeQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listYears(query: { kind?: string; year?: number }) {
    const years = await this.prisma.initiativeYear.findMany({
      where: {
        year: query.year,
        initiative: query.kind ? { kind: this.kind(query.kind) } : undefined,
      },
      include: yearInclude,
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });
    return ok('Роки ініціатив завантажено', years.map(mapYear));
  }

  async listCards(query: { kind?: string; year?: number; quarter?: QuarterDto }) {
    const cards = await this.prisma.quarterCard.findMany({
      where: {
        quarter: query.quarter ? Number(query.quarter.slice(1)) : undefined,
        initiativeYear: {
          year: query.year,
          initiative: query.kind ? { kind: this.kind(query.kind) } : undefined,
        },
      },
      include: cardInclude,
      orderBy: [{ initiativeYear: { year: 'desc' } }, { quarter: 'asc' }, { createdAt: 'desc' }],
    });
    return ok('Квартальні картки завантажено', cards.map(mapCard));
  }

  async getYear(id: string) {
    const year = await this.prisma.initiativeYear.findUnique({ where: { id }, include: yearInclude });
    if (!year) throw new AppError('NOT_FOUND', 'Рік ініціативи не знайдено.', HttpStatus.NOT_FOUND);
    return ok('Рік ініціативи завантажено', mapYear(year));
  }

  async getCard(id: string) {
    const card = await this.prisma.quarterCard.findUnique({ where: { id }, include: cardInclude });
    if (!card) throw new AppError('NOT_FOUND', 'Картку не знайдено.', HttpStatus.NOT_FOUND);
    return ok('Картку завантажено', mapCard(card));
  }

  private kind(value: string) {
    const normalized = value.toUpperCase();
    if (!['PROJECT', 'OPERATIONAL_TASK'].includes(normalized)) throw new AppError('INVALID_KIND', 'Невідомий тип ініціативи.');
    return normalized;
  }
}
