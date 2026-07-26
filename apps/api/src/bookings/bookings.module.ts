import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { HoldExpiryJob } from './hold-expiry.job';
import { BalanceDueReminderJob } from './balance-due-reminder.job';

@Module({
  imports: [NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService, HoldExpiryJob, BalanceDueReminderJob],
})
export class BookingsModule {}
