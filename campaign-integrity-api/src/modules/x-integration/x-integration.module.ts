import { Module } from '@nestjs/common';
import { XApiClient } from './x-api.client';

@Module({
  providers: [XApiClient],
  exports: [XApiClient],
})
export class XIntegrationModule {}
