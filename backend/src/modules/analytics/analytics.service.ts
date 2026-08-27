import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(year?: number, quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4') {
    const cards = await this.prisma.quarterCard.findMany({
      where: {
        quarter: quarter ? Number(quarter.slice(1)) : undefined,
        initiativeYear: { year },
      },
      include: {
        initiativeYear: { include: { initiative: true } },
        status: true,
        departments: true,
        scopeItems: { include: { executors: true } },
      },
    });
    const healthCounts: Record<string, number> = {};
    const scopeStatusCounts: Record<string, number> = {};
    const sizes: Record<string, number> = {};
    const duration = new Map<string, number>();
    const progressValues: number[] = [];
    const loads = new Map<string, number>();

    for (const card of cards) {
      healthCounts[card.status.code] = (healthCounts[card.status.code] ?? 0) + 1;
      const sizeName = card.sizeSnapshotName ?? 'Не визначено';
      sizes[sizeName] = (sizes[sizeName] ?? 0) + 1;
      duration.set(card.initiativeYear.initiativeId, (duration.get(card.initiativeYear.initiativeId) ?? 0) + 1);
      const progress = card.scopeItems.length
        ? Math.round(card.scopeItems.reduce((sum, item) => sum + (item.statusCode === 'GREEN' ? 1 : item.statusCode === 'YELLOW' ? 0.5 : 0), 0) / card.scopeItems.length * 100)
        : null;
      if (progress !== null) progressValues.push(progress);

      const allExecutors = new Set(card.scopeItems.flatMap((item) => item.executors.map((link) => link.departmentId)));
      for (const item of card.scopeItems) {
        scopeStatusCounts[item.statusCode] = (scopeStatusCounts[item.statusCode] ?? 0) + 1;
        const executorIds = unique(item.executors.map((link) => link.departmentId));
        const share = executorIds.length ? item.weightSnapshotValue.toNumber() / executorIds.length : 0;
        executorIds.forEach((id) => loads.set(id, (loads.get(id) ?? 0) + share));
      }
      const involved = card.departments.map((link) => link.departmentId).filter((id) => !allExecutors.has(id));
      if (card.scopeItems.length && involved.length) {
        const share = card.totalWeight.toNumber() / card.scopeItems.length / involved.length;
        involved.forEach((id) => loads.set(id, (loads.get(id) ?? 0) + share));
      }
    }
    const departments = await this.prisma.department.findMany();
    const countKind = (kind: string) => cards.filter((card) => card.initiativeYear.initiative.kind === kind).length;
    return {
      cards: cards.length,
      projects: countKind('PROJECT'),
      operational_tasks: countKind('OPERATIONAL_TASK'),
      health_counts: healthCounts,
      scope_status_counts: scopeStatusCounts,
      average_scope_progress: progressValues.length ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length) : 0,
      average_initiative_duration: duration.size ? round([...duration.values()].reduce((a, b) => a + b, 0) / duration.size) : 0,
      size_breakdown: Object.entries(sizes).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      department_capacity: departments.map((department) => {
        const load = round(loads.get(department.id) ?? 0);
        const limit = department.capacityLimitPoints.toNumber();
        return { departmentId: department.id, load, limit, isOverCapacity: load > limit };
      }),
    };
  }
}

const unique = <T>(values: T[]) => [...new Set(values)];
