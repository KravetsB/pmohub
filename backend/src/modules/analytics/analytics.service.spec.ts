import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from './analytics.service';

const decimal = (value: number) => ({ toNumber: () => value });
const card = (quarter: number, status: string, id = `card-${quarter}`, scopeStatus = 'YELLOW') => ({
  id, quarter, managerId: 'manager', priorityId: 'priority', totalWeight: decimal(4), sizeSnapshotName: 'M', createdAt: new Date(),
  manager: { name: 'Manager' }, priority: { name: 'Priority' }, status: { code: status }, departments: [{ departmentId: 'department' }],
  initiativeYear: { year: 2027, initiativeId: 'initiative', initiative: { id: 'initiative', kind: 'PROJECT', name: 'Project' } },
  scopeItems: [{ statusCode: scopeStatus, weightSnapshotValue: decimal(4), executors: [{ departmentId: 'department' }] }],
});

describe('AnalyticsService aggregation contracts', () => {
  it('applies kind, year, quarter, department and manager to the quarterly query', async () => {
    const prisma: any = { quarterCard: { findMany: vi.fn(async () => []) }, department: { findMany: vi.fn(async () => []) }, initiativeYear: { findMany: vi.fn(async () => []) } };
    await new AnalyticsService(prisma).quarterly({ year: 2027, quarter: 'Q2', kind: 'PROJECT', department_id: 'department', manager_id: 'manager' });
    expect(prisma.quarterCard.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      quarter: 2, managerId: 'manager', departments: { some: { departmentId: 'department' } }, initiativeYear: { year: 2027, initiative: { kind: 'PROJECT' } },
    } }));
    expect(prisma.department.findMany).toHaveBeenCalledWith({ where: { id: 'department' } });
  });

  it('counts annual initiatives once and takes status from their latest card', async () => {
    const cards = [card(1, 'YELLOW', 'card-1', 'RED'), card(2, 'GREEN', 'card-2', 'GREEN')];
    const prisma: any = {
      quarterCard: { findMany: vi.fn(async () => cards) },
      initiativeYear: { findMany: vi.fn(async () => []) },
      department: { findMany: vi.fn(async () => [{ id: 'department', name: 'Department', capacityLimitPoints: decimal(10) }]) },
    };
    const result = await new AnalyticsService(prisma).annual({ year: 2027 });
    expect(result.summary).toMatchObject({ cards: 2, initiatives: 1, average_duration: 2, average_progress: 100, total_weight: 8 });
    expect(result.status_counts).toMatchObject({ GREEN: 1, YELLOW: 0 });
    expect(result.quarter_trend.find((item) => item.quarter === 'Q1')).toMatchObject({ cards: 1, initiatives: 1 });
  });
});
