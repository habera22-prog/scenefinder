import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { HoldExpiryJob } from './hold-expiry.job';
import { BalanceDueReminderJob } from './balance-due-reminder.job';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, HoldExpiryJob, BalanceDueReminderJob],
})
export class BookingsModule {}
