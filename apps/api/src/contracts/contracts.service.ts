import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const NOT_YET_STATUSES = ['inquiry', 'quoted'];

function buildContractContent(booking: {
  id: string;
  shootDatetime: Date | null;
  location: string | null;
  headcount: number | null;
  purpose: string | null;
  totalAmount: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
  customer: { name: string };
  photographer: {
    businessName: string;
    representativeName: string;
    businessRegNo: string;
  };
  package: { title: string; includedPhotos: number; rawIncluded: boolean; deliveryDays: number } | null;
}): string {
  const shootDate = booking.shootDatetime
    ? booking.shootDatetime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : '미정';

  return `# 촬영 서비스 계약서

## 1. 당사자
- 고객: ${booking.customer.name}
- 촬영 서비스 제공자(작가): ${booking.photographer.businessName} (대표자 ${booking.photographer.representativeName}, 사업자등록번호 ${booking.photographer.businessRegNo})

## 2. 촬영 정보
- 일시: ${shootDate}
- 장소: ${booking.location ?? '미정'}
- 인원: ${booking.headcount ?? '-'}명
- 목적: ${booking.purpose ?? '-'}
${booking.package ? `- 상품: ${booking.package.title} (보정 ${booking.package.includedPhotos}장+, 원본 ${booking.package.rawIncluded ? '제공' : '미제공'}, 납품 ${booking.package.deliveryDays}일 이내)` : '- 상품: 맞춤 견적'}

## 3. 금액
- 총 촬영금액: ${booking.totalAmount?.toLocaleString() ?? '-'}원
- 예약금(30%): ${booking.depositAmount?.toLocaleString() ?? '-'}원
- 잔금: ${booking.balanceAmount?.toLocaleString() ?? '-'}원

## 4. 취소·환불
플랫폼의 취소·환불 정책(결제 전 전액환불, D-7 이전 전액환불, 당일 취소·노쇼는 총액 10%+실비, 촬영 개시 후는 관리자 심사)을 따릅니다. 작가 귀책 취소 시 전액환불 및 총액 10% 보상이 적용됩니다.

## 5. 일정 변경
예약 소통방 내 "일정 변경 요청" 기능을 통해 상대방의 승인을 받은 경우에만 일정이 변경됩니다.

## 6. 지각·노쇼, 사고 대응
작가의 지각·노쇼·촬영본 멸실 등 귀책 사유 발생 시 전액환불 및 손해배상 심사가 진행되며, 세부 기준은 플랫폼 이용약관을 따릅니다.

## 7. 초상권·저작권
촬영 결과물의 저작권은 작가에게 귀속되며, 고객은 개인적 목적으로 이를 사용할 수 있습니다. 작가가 결과물을 포트폴리오에 게시하려면 별도의 초상권 동의 절차를 거쳐야 합니다.

## 8. 개인정보
본 계약과 관련하여 수집된 개인정보는 예약·결제·소통 목적 범위 내에서만 이용되며, 플랫폼 개인정보처리방침을 따릅니다.

---
본 계약서는 예약 ID ${booking.id} 기준으로 생성된 스냅샷이며, 양측의 전자 서명(확인)으로 효력이 발생합니다.`;
}

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { name: true } },
        photographer: {
          select: { businessName: true, representativeName: true, businessRegNo: true, userId: true },
        },
        package: {
          select: { title: true, includedPhotos: true, rawIncluded: true, deliveryDays: true },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    await this.assertParticipant(booking, userId);

    const existing = await this.prisma.contract.findUnique({ where: { bookingId } });
    if (existing) {
      return existing;
    }

    if (NOT_YET_STATUSES.includes(booking.status)) {
      throw new BadRequestException(
        '견적 수락 이후(예약금 대기 단계 이상)부터 계약서를 생성할 수 있습니다.',
      );
    }

    return this.prisma.contract.create({
      data: {
        bookingId,
        content: buildContractContent(booking),
      },
    });
  }

  async sign(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { photographer: { select: { userId: true } } },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    const side = await this.assertParticipant(booking, userId);

    const contract = await this.prisma.contract.findUnique({ where: { bookingId } });
    if (!contract) {
      throw new NotFoundException('계약서를 먼저 생성해주세요.');
    }

    return this.prisma.contract.update({
      where: { bookingId },
      data:
        side === 'customer'
          ? { customerSignedAt: new Date() }
          : { photographerSignedAt: new Date() },
    });
  }

  private async assertParticipant(
    booking: { customerId: string; photographer: { userId: string } },
    userId: string,
  ): Promise<'customer' | 'photographer'> {
    if (booking.customerId === userId) return 'customer';
    if (booking.photographer.userId === userId) return 'photographer';
    throw new ForbiddenException('예약 당사자만 접근할 수 있습니다.');
  }
}
