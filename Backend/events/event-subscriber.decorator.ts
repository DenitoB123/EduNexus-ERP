import { SetMetadata } from '@nestjs/common';

export const ON_EVENT_METADATA_KEY = 'edunexus:on-event';

export const OnEvent = (eventName: string): MethodDecorator => SetMetadata(ON_EVENT_METADATA_KEY, eventName);
