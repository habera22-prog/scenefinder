import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ConfirmPaymentResult {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  approvedAt?: string;
  raw: Record<string, unknown>;
}

export interface CancelPaymentResult {
  status: string;
  raw: Record<string, unknown>;
}

@Injectable()
export class TossPaymentsClient {
  private readonly logger = new Logger(TossPaymentsClient.name);
  private readonly secretKey?: string;

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('TOSS_SECRET_KEY');
  }

  async confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number,
  ): Promise<ConfirmPaymentResult> {
    if (!this.secretKey) {
      // TODO: 사업자등록 완료 후 토스페이먼츠 테스트/라이브 시크릿 키 연동 (PRD 3-5, 이 대화에서 확인된 미결정 사항)
      // 키 미설정 시 개발 편의를 위해 모의 승인 처리
      this.logger.warn(
        `[TossPayments MOCK] confirm orderId=${orderId} amount=${amount} — TOSS_SECRET_KEY 미설정으로 모의 승인 처리`,
      );
      return {
        paymentKey,
        orderId,
        status: 'DONE',
        totalAmount: amount,
        approvedAt: new Date().toISOString(),
        raw: { mock: true },
      };
    }

    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');
    const response = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      },
    );

    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      this.logger.error(`토스페이먼츠 결제 승인 실패: ${JSON.stringify(body)}`);
      throw new Error((body.message as string) ?? '결제 승인에 실패했습니다.');
    }

    return {
      paymentKey: body.paymentKey as string,
      orderId: body.orderId as string,
      status: body.status as string,
      totalAmount: body.totalAmount as number,
      approvedAt: body.approvedAt as string | undefined,
      raw: body,
    };
  }

  async cancelPayment(
    paymentKey: string,
    cancelReason: string,
    cancelAmount?: number,
  ): Promise<CancelPaymentResult> {
    if (!this.secretKey) {
      this.logger.warn(
        `[TossPayments MOCK] cancel paymentKey=${paymentKey} amount=${cancelAmount} reason=${cancelReason} — TOSS_SECRET_KEY 미설정으로 모의 환불 처리`,
      );
      return { status: 'CANCELED', raw: { mock: true } };
    }

    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');
    const response = await fetch(
      `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancelReason, cancelAmount }),
      },
    );

    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      this.logger.error(`토스페이먼츠 결제 취소 실패: ${JSON.stringify(body)}`);
      throw new Error((body.message as string) ?? '결제 취소에 실패했습니다.');
    }

    return { status: body.status as string, raw: body };
  }
}
