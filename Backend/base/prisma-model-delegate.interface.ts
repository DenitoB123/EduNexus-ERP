export interface PrismaModelDelegate<T> {
  findUnique(args: { where: Record<string, unknown> }): Promise<T | null>;
  findFirst(args: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(args: {
    where: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>[];
    skip?: number;
    take?: number;
  }): Promise<T[]>;
  create(args: { data: Record<string, unknown> }): Promise<T>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<T>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
}
