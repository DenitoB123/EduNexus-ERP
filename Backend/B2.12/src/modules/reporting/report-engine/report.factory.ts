import { Injectable, Logger } from '@nestjs/common';
import { ReportDefinition } from '../interfaces/report-definition.interface';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';

/**
 * Registry + factory for ReportDefinitions. Feature modules register
 * their reports here (typically from `onModuleInit`), and
 * ReportEngineService resolves + validates parameters against them
 * at generation time.
 */
@Injectable()
export class ReportFactory {
  private readonly logger = new Logger(ReportFactory.name);
  private readonly definitions = new Map<string, ReportDefinition>();

  register(definition: ReportDefinition): void {
    if (this.definitions.has(definition.key)) {
      this.logger.warn(`Report definition "${definition.key}" is already registered; overwriting`);
    }
    this.definitions.set(definition.key, definition);
    this.logger.log(`Registered report definition "${definition.key}" (dataset: ${definition.datasetKey})`);
  }

  resolve(reportKey: string): ReportDefinition {
    const definition = this.definitions.get(reportKey);
    if (!definition) {
      throw new ResourceNotFoundException('ReportDefinition', reportKey);
    }
    return definition;
  }

  list(moduleKey?: string): ReportDefinition[] {
    const all = Array.from(this.definitions.values());
    return moduleKey ? all.filter((d) => d.moduleKey === moduleKey) : all;
  }

  /**
   * Validates supplied parameters against the definition's declared
   * ReportParameter[] and returns a fully-resolved parameter bag with
   * defaults applied for anything omitted.
   */
  resolveParameters(definition: ReportDefinition, supplied: Record<string, unknown> = {}): Record<string, unknown> {
    const resolved: Record<string, unknown> = { ...supplied };
    for (const param of definition.parameters ?? []) {
      if (resolved[param.name] === undefined || resolved[param.name] === null) {
        if (param.required && param.default === undefined) {
          throw new ValidationException(`Missing required report parameter "${param.name}"`);
        }
        if (param.default !== undefined) {
          resolved[param.name] = param.default;
        }
      }
    }
    return resolved;
  }
}
