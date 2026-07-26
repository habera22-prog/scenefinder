import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingPaymentsController } from './booking-payments.controller';
import { PaymentsController } from './payments.controller';
import { TossWebhookController } from './webhooks.controller';
import { PaymentsService } from './payments.service';
import { TossPaymentsClient } from './toss-payments.client';

@Module({
  imports: [NotificationsModule],
  controllers: [
    BookingPaymentsController,
    PaymentsController,
    TossWebhookController,
  ],
  providers: [PaymentsService, TossPaymentsClient],
  exports: [TossPaymentsClient],
})
export class PaymentsModule {}
