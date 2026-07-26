import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PhotographersModule } from './photographers/photographers.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { PackagesModule } from './packages/packages.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { ChatModule } from './chat/chat.module';
import { CancellationsModule } from './cancellations/cancellations.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { ReviewsModule } from './reviews/reviews.module';
import { DisputesModule } from './disputes/disputes.module';
import { ConsentsModule } from './consents/consents.module';
import { SettlementsModule } from './settlements/settlements.module';
import { AdminModule } from './admin/admin.module';
import { ShootCategoriesModule } from './shoot-categories/shoot-categories.module';
import { UploadsModule } from './uploads/uploads.module';
import { FavoritesModule } from './favorites/favorites.module';
import { PagesModule } from './pages/pages.module';
import { SupportModule } from './support/support.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    PhotographersModule,
    PortfoliosModule,
    PackagesModule,
    BookingsModule,
    PaymentsModule,
    ChatModule,
    CancellationsModule,
    DeliveriesModule,
    ReviewsModule,
    DisputesModule,
    ConsentsModule,
    SettlementsModule,
    AdminModule,
    ShootCategoriesModule,
    UploadsModule,
    FavoritesModule,
    PagesModule,
    SupportModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
