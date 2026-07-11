import { Body, Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { IntegrationsService } from '../integrations/integrations.service';

/**
 * Inbound webhook receiver — the other half of "Support outbound and
 * inbound webhooks" from the brief. Generic by provider key so the same
 * route serves M-Pesa STK push callbacks, Africa's Talking delivery
 * reports, etc. without a bespoke controller per provider.
 *
 * @Public() because the caller is a third party, not an EduNexus user — it
 * cannot present a JWT. Authenticity instead comes from
 * IntegrationsService.verifyInboundSignature, which checks the provider's
 * configured secret (IntegrationConfig.encryptedCredentials) against the
 * request signature/headers, provider-specific.
 */
@ApiTags('Webhooks')
@Controller('api/v1/webhooks/inbound')
export class WebhooksInboundController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly integrations: IntegrationsService,
  ) {}

  @Post(':providerKey')
  @Public()
  @ApiExcludeEndpoint()
  async receive(
    @Param('providerKey') providerKey: string,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
    @Req() req: any,
  ) {
    const signatureValid = await this.integrations.verifyInboundSignature(
      providerKey,
      JSON.stringify(body),
      headers,
    );

    await this.prisma.inboundWebhookEvent.create({
      data: {
        providerKey,
        headers: headers as object,
        payload: body,
        signatureValid,
      },
    });

    if (signatureValid) {
      await this.eventBus.publish({
        name: `webhook.inbound.${providerKey}`,
        payload: body,
      });
    }

    // Always 200 — most providers (M-Pesa, Africa's Talking) retry
    // aggressively on non-2xx, which we don't want for a rejected/invalid
    // signature; we just don't act on it.
    return { received: true };
  }
}
