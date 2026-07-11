import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { IMetricCollector } from '../interfaces/metric-collector.interface';

export interface SystemResourceSnapshot {
  cpu: { loadAverage1m: number; loadAverage5m: number; loadAverage15m: number; coreCount: number };
  memory: { heapUsedMb: number; heapTotalMb: number; rssMb: number; systemFreeMb: number; systemTotalMb: number };
  process: { uptimeSeconds: number; pid: number };
}

/**
 * The one metrics category with no pre-existing equivalent anywhere
 * in the foundation (database/api/security/queue/performance metrics
 * all already exist — see metrics-registry.service.ts). Node has no
 * built-in per-process CPU percentage, so loadAverage (os-level, all
 * processes) is reported rather than a fabricated per-process CPU %.
 */
@Injectable()
export class SystemResourceMetricsService implements IMetricCollector<SystemResourceSnapshot> {
  readonly name = 'system';

  getSnapshot(): SystemResourceSnapshot {
    const usage = process.memoryUsage();
    const [load1, load5, load15] = os.loadavg();

    return {
      cpu: { loadAverage1m: load1, loadAverage5m: load5, loadAverage15m: load15, coreCount: os.cpus().length },
      memory: {
        heapUsedMb: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(usage.heapTotal / 1024 / 1024),
        rssMb: Math.round(usage.rss / 1024 / 1024),
        systemFreeMb: Math.round(os.freemem() / 1024 / 1024),
        systemTotalMb: Math.round(os.totalmem() / 1024 / 1024),
      },
      process: { uptimeSeconds: Math.round(process.uptime()), pid: process.pid },
    };
  }
}
