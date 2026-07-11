import { BaseModel } from '../../database/interfaces/base-model.interface';
import { BaseService } from './base.service';

export abstract class BaseCrudService<T extends BaseModel> extends BaseService<T> {
  async bulkCreate(items: Partial<T>[]): Promise<T[]> {
    const results: T[] = [];
    for (const item of items) {
      results.push(await this.create(item));
    }
    return results;
  }

  async bulkUpdate(updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    const results: T[] = [];
    for (const { id, data } of updates) {
      results.push(await this.update(id, data));
    }
    return results;
  }

  async bulkRemove(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.remove(id);
    }
  }
}
