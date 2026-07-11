import { SoftDeleteRepository } from './soft-delete.repository';
import { PrismaFullModelDelegate } from './interfaces/prisma-full-delegate.interface';

interface TestEntity {
  id: string;
  tenantId: string;
  name: string;
  version: number;
}

class TestRepository extends SoftDeleteRepository<TestEntity> {
  protected readonly modelName = 'TestEntity';
  protected readonly allowedFilterFields = ['name'];
  protected readonly allowedSearchFields = ['name'];
}

class TestRepositoryWithHardDelete extends SoftDeleteRepository<TestEntity> {
  protected readonly modelName = 'TestEntity';
  protected readonly allowedFilterFields = ['name'];
  protected readonly allowedSearchFields = ['name'];

  constructor(delegate: PrismaFullModelDelegate<TestEntity>) {
    super(delegate);
    this.allowHardDelete = true;
  }
}

function createMockDelegate(): jest.Mocked<PrismaFullModelDelegate<TestEntity>> {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    createMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    delete: jest.fn(),
  };
}

describe('TenantRepository (via SoftDeleteRepository)', () => {
  let delegate: jest.Mocked<PrismaFullModelDelegate<TestEntity>>;
  let repo: TestRepository;

  beforeEach(() => {
    delegate = createMockDelegate();
    repo = new TestRepository(delegate);
  });

  it('findById scopes the query by tenantId', async () => {
    delegate.findFirst.mockResolvedValue({ id: '1', tenantId: 't1', name: 'x', version: 1 });
    await repo.findById('1', 't1');
    expect(delegate.findFirst).toHaveBeenCalledWith({ where: { id: '1', tenantId: 't1' } });
  });

  it('findMany excludes soft-deleted rows by default and scopes by tenant', async () => {
    delegate.findMany.mockResolvedValue([]);
    delegate.count.mockResolvedValue(0);

    await repo.findMany({}, 't1');

    const call = delegate.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ tenantId: 't1', deletedAt: null });
  });

  it('exists() checks scoped-by-tenant presence', async () => {
    delegate.findFirst.mockResolvedValue(null);
    const result = await repo.exists('1', 't1');
    expect(result).toBe(false);
  });

  it('create() injects tenantId and createdBy/updatedBy from actorId', async () => {
    delegate.create.mockResolvedValue({ id: '1', tenantId: 't1', name: 'x', version: 1 });
    await repo.create({ name: 'x' }, 't1', 'actor-1');

    expect(delegate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'x',
        tenantId: 't1',
        createdBy: 'actor-1',
        updatedBy: 'actor-1',
      }),
    });
  });

  it('update() throws when the record does not belong to the tenant', async () => {
    delegate.findFirst.mockResolvedValue(null);
    await expect(repo.update('1', { name: 'y' }, 't1', 'actor-1')).rejects.toThrow();
    expect(delegate.update).not.toHaveBeenCalled();
  });

  it('update() succeeds and stamps updatedBy when the record belongs to the tenant', async () => {
    delegate.findFirst.mockResolvedValue({ id: '1', tenantId: 't1', name: 'old', version: 1 });
    delegate.update.mockResolvedValue({ id: '1', tenantId: 't1', name: 'new', version: 2 });

    await repo.update('1', { name: 'new' }, 't1', 'actor-1');

    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: '1', tenantId: 't1' },
      data: expect.objectContaining({ name: 'new', updatedBy: 'actor-1' }),
    });
  });

  it('batchCreate injects tenantId and actor into every item', async () => {
    delegate.createMany.mockResolvedValue({ count: 2 });
    const result = await repo.batchCreate([{ name: 'a' }, { name: 'b' }], 't1', 'actor-1');

    expect(result).toBe(2);
    expect(delegate.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ name: 'a', tenantId: 't1', createdBy: 'actor-1' }),
        expect.objectContaining({ name: 'b', tenantId: 't1', createdBy: 'actor-1' }),
      ],
    });
  });

  it('batchDelete scopes the deleteMany where clause by tenant and id list', async () => {
    delegate.deleteMany.mockResolvedValue({ count: 3 });
    const result = await repo.batchDelete(['1', '2', '3'], 't1');

    expect(result).toBe(3);
    expect(delegate.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['1', '2', '3'] }, tenantId: 't1' },
    });
  });
});

describe('SoftDeleteRepository', () => {
  let delegate: jest.Mocked<PrismaFullModelDelegate<TestEntity>>;
  let repo: TestRepository;

  beforeEach(() => {
    delegate = createMockDelegate();
    repo = new TestRepository(delegate);
  });

  it('softDelete sets deletedAt/deletedBy after confirming tenant ownership', async () => {
    delegate.findFirst.mockResolvedValue({ id: '1', tenantId: 't1', name: 'x', version: 1 });
    delegate.update.mockResolvedValue({ id: '1', tenantId: 't1', name: 'x', version: 1 });

    await repo.softDelete('1', 't1', 'actor-1');

    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: '1', tenantId: 't1' },
      data: expect.objectContaining({ deletedBy: 'actor-1', updatedBy: 'actor-1' }),
    });
  });

  it('restore clears deletedAt/deletedBy', async () => {
    delegate.findFirst.mockResolvedValue({ id: '1', tenantId: 't1', name: 'x', version: 1 });
    delegate.update.mockResolvedValue({ id: '1', tenantId: 't1', name: 'x', version: 1 });

    await repo.restore('1', 't1', 'actor-1');

    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: '1', tenantId: 't1' },
      data: { deletedAt: null, deletedBy: null, updatedBy: 'actor-1' },
    });
  });

  it('permanentDelete throws by default (allowHardDelete = false)', async () => {
    await expect(repo.permanentDelete('1', 't1')).rejects.toThrow(/disabled/);
    expect(delegate.delete).not.toHaveBeenCalled();
  });

  it('permanentDelete works once the subclass opts in via allowHardDelete', async () => {
    const hardDeleteRepo = new TestRepositoryWithHardDelete(delegate);
    delegate.findFirst.mockResolvedValue({ id: '1', tenantId: 't1', name: 'x', version: 1 });
    delegate.delete.mockResolvedValue({ id: '1', tenantId: 't1', name: 'x', version: 1 });

    await hardDeleteRepo.permanentDelete('1', 't1');

    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: '1', tenantId: 't1' } });
  });
});
