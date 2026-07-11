import { ReadOnlyRepository } from './read-only.repository';
import { PrismaReadDelegate } from './interfaces/prisma-read-delegate.interface';

interface ReportRow {
  id: string;
  tenantId: string;
  total: number;
}

class TestReadOnlyRepository extends ReadOnlyRepository<ReportRow> {
  protected readonly modelName = 'ReportRow';
  protected readonly allowedFilterFields = ['total'];
  protected readonly allowedSearchFields: string[] = [];
}

describe('ReadOnlyRepository', () => {
  let delegate: jest.Mocked<PrismaReadDelegate<ReportRow>>;
  let repo: TestReadOnlyRepository;

  beforeEach(() => {
    delegate = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    };
    repo = new TestReadOnlyRepository(delegate);
  });

  it('scopes findById by tenant', async () => {
    delegate.findFirst.mockResolvedValue({ id: '1', tenantId: 't1', total: 100 });
    await repo.findById('1', 't1');
    expect(delegate.findFirst).toHaveBeenCalledWith({ where: { id: '1', tenantId: 't1' } });
  });

  it('exposes no create/update/delete methods at all', () => {
    expect((repo as unknown as Record<string, unknown>).create).toBeUndefined();
    expect((repo as unknown as Record<string, unknown>).update).toBeUndefined();
    expect((repo as unknown as Record<string, unknown>).softDelete).toBeUndefined();
  });

  it('findMany applies tenant scoping and soft-delete exclusion', async () => {
    delegate.findMany.mockResolvedValue([]);
    delegate.count.mockResolvedValue(0);

    await repo.findMany({}, 't1');

    const call = delegate.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ tenantId: 't1', deletedAt: null });
  });
});
