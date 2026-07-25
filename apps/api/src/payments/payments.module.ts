import { Module } from '@nestjs/common';
import { BookingPaymentsController } from './booking-payments.controller';
import { PaymentsController } from './payments.controller';
import { TossWebhookController } from './webhooks.controller';
import { PaymentsService } from './payments.service';
import { TossPaymentsClient } from './toss-payments.client';

@Module({
  controllers: [
    BookingPaymentsController,
    PaymentsController,
    TossWebhookController,
  ],
  providers: [PaymentsService, TossPaymentsClient],
  exports: [TossPaymentsClient],
})
export class PaymentsModule {}
