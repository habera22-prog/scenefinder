import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('webhooks/tosspayments')
export class TossWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  handle(@Body() payload: Record<string, unknown>) {
    return this.paymentsService.handleWebhook(payload);
  }
}
