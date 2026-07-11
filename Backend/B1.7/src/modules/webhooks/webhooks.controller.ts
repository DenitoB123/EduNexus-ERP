import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../rbac/decorators/roles.decorator';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookSubscriptionDto, UpdateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks/subscriptions')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Register an outbound webhook subscription. Secret is returned once.' })
  create(@Req() req: any, @Body() dto: CreateWebhookSubscriptionDto) {
    return this.webhooks.createSubscription(req.user?.schoolId, dto, req.user?.id);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'List webhook subscriptions for the current tenant' })
  list(@Req() req: any) {
    return this.webhooks.list(req.user?.schoolId);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateWebhookSubscriptionDto, @Req() req: any) {
    return this.webhooks.update(id, dto, req.user?.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.webhooks.remove(id, req.user?.id);
  }

  @Get(':id/deliveries')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Delivery history for a subscription (status, attempts, response codes)' })
  deliveries(@Param('id') id: string) {
    return this.webhooks.listDeliveries(id);
  }
}
