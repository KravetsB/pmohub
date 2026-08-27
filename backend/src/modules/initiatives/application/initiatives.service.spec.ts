import { describe, expect, it, vi } from 'vitest';
import { InitiativesService } from './initiatives.service';

const actor = { id: '00000000-0000-4000-8000-000000000099', name: 'Admin', email: 'admin@example.com', role: 'SUPER_ADMIN' as const, must_change_password: false };

describe('InitiativesService transactional rules', () => {
  it('creates a card from the nearest previous card and copies only effective involved departments', async () => {
    const create = vi.fn(async ({ data }) => ({ id: 'card-new', revision: 1, ...data, departments: [] }));
    const tx: any = {
      initiativeYear: {
        findUnique: vi.fn(async () => ({
          id: 'year',
          year: 2027,
          preparationStage: { managerId: 'prep-manager', priorityId: 'prep-priority', departments: [{ departmentId: 'prep-dept' }] },
          quarterCards: [{
            managerId: 'previous-manager',
            priorityId: 'previous-priority',
            departments: [{ departmentId: 'involved' }, { departmentId: 'executor' }],
            scopeItems: [{ executors: [{ departmentId: 'executor' }] }],
          }],
        })),
      },
      quarterCard: { findUnique: vi.fn(async () => null), create },
      initiativeStatus: { findUnique: vi.fn(async () => ({ id: 'default-status', isActive: true })) },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ isReadOnly: false, canCreateEditProjects: true })) },
      $transaction: (callback: (client: any) => unknown) => callback(tx),
    };

    await new InitiativesService(prisma).createQuarterCard('year', { quarter: 'Q2' }, actor);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        managerId: 'previous-manager',
        priorityId: 'previous-priority',
        departments: { createMany: { data: [{ departmentId: 'involved' }] } },
      }),
    }));
  });

  it('copies a non-green scope item with the same lineage and resets status and weight', async () => {
    const scopeCreate = vi.fn(async () => ({ id: 'copy' }));
    const source = {
      id: 'source-card',
      revision: 3,
      managerId: null,
      priorityId: null,
      initiativeYearId: 'source-year',
      initiativeYear: { year: 2027, initiativeId: 'initiative', initiative: { id: 'initiative' } },
      departments: [{ departmentId: 'dept-a' }],
      customFieldValues: [],
      scopeItems: [{
        id: 'scope-source',
        lineageId: '00000000-0000-4000-8000-000000000010',
        text: 'Scope',
        statusCode: 'YELLOW',
        revision: 2,
        executors: [{ departmentId: 'dept-b' }],
      }],
    };
    const target = { id: 'target-card', revision: 5, createdAt: new Date(), updatedAt: new Date(), departments: [{ departmentId: 'dept-a' }] };
    const tx: any = {
      quarterCard: {
        findUnique: vi.fn(async (args: any) => args.where.id ? source : target),
        findMany: vi.fn(async () => []),
        updateMany: vi.fn(async () => ({ count: 1 })),
        update: vi.fn(async () => ({})),
      },
      initiativeYear: { findUnique: vi.fn(async () => ({ id: 'target-year' })) },
      scopeItem: {
        findUnique: vi.fn(async () => null),
        create: scopeCreate,
        findMany: vi.fn(async () => []),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      taskWeight: { findFirst: vi.fn(async () => ({ id: 'default-weight', name: 'Не визначено', weight: 0 })) },
      quarterCardDepartment: {
        deleteMany: vi.fn(async () => ({})),
        findMany: vi.fn(async () => [{ departmentId: 'dept-a' }]),
        createMany: vi.fn(async () => ({})),
      },
      initiativeSize: { findMany: vi.fn(async () => []) },
      department: { findMany: vi.fn(async () => []) },
      auditEvent: { create: vi.fn(async () => ({})) },
    };
    const prisma: any = {
      rolePermission: { findUnique: vi.fn(async () => ({ isReadOnly: false, canCreateEditProjects: true })) },
      $transaction: (callback: (client: any) => unknown) => callback(tx),
    };

    await new InitiativesService(prisma).copyScope('source-card', 'scope-source', {
      revision: 3,
      target_revision: 5,
      to_year: 2027,
      to_quarter: 'Q4',
    }, actor);

    expect(scopeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lineageId: source.scopeItems[0].lineageId,
        copiedFromItemId: 'scope-source',
        statusCode: 'DEFAULT',
        weightDefinitionId: 'default-weight',
        weightSnapshotValue: 0,
      }),
    });
  });
});
