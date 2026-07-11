export interface PrismaReadDelegate<T> {
  findUnique(args: { where: Record<string, unknown> }): Promise<T | null>;
  findFirst(args: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(args: {
    where: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>[];
    skip?: number;
    take?: number;
  }): Promise<T[]>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
}
