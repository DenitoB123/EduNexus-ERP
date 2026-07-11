import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { MetricsService } from './metrics.service';

/**
 * Exposes GET /metrics in Prometheus text format. Public (no JWT) because
 * Prometheus scrapers don't carry app session tokens — lock this down at
 * the network/ingress layer (internal-only route) rather than with app auth.
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain')
  async getMetrics(): Promise<string> {
    return this.metrics.getMetricsText();
  }
}
