import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 기업/기관 맞춤촬영·제휴 문의 담당자가 직접 연락할 수 있는 운영 채널 — 실제 사업자 연락처는 대표님이 추후 입력
const BUSINESS_CONTACT = `## 기업·제휴 문의 연락처
- 담당 부서: 씬파인더 사업개발팀 (준비중)
- 대표 이메일: business@scenefinder.co.kr (준비중 — 실제 운영 메일 등록 필요)
- 담당자 연락처: 등록 준비중

아래 문의 폼을 통해 접수해주시면 담당자가 순차적으로 연락드립니다.`;

const INTERMEDIARY_NOTICE = `본 플랫폼은 고객과 사진작가 사이의 촬영 서비스 거래를 연결하는 통신판매중개 서비스입니다. 촬영 서비스의 실제 판매자 및 제공자는 각 상품과 결제화면에 표시된 사진작가이며, 촬영 일정 준수, 현장 촬영, 결과물의 품질, 보정 및 납품 등 촬영계약의 이행 책임은 해당 사진작가에게 있습니다. 플랫폼은 작가 탐색, 예약, 결제, 정산, 일정관리, 고객과 작가 간 소통, 고객 문의 및 분쟁처리 서비스를 제공합니다. 고객은 모든 문의와 불만을 플랫폼 고객센터를 통해 접수할 수 있으며, 플랫폼은 운영정책에 따라 사실관계를 확인하고 작가 정산 보류, 환불, 재촬영, 부분 보상 또는 기타 필요한 조치를 중재합니다. 플랫폼의 고의 또는 과실로 발생한 손해 및 관계 법령에 따라 플랫폼이 부담해야 하는 책임은 제한되지 않습니다.`;

const HOW_TO_USE = `## 1. 촬영 네비게이터로 찾기
촬영 종류·상황·분위기·조건(날짜, 지역, 예산 등)을 순서대로 선택하면, 적합도 기준으로 작가를 추천해드려요. 최저가 순이 아니라 분야 적합도·포트폴리오 분위기·일정·지역·후기를 종합한 점수로 정렬됩니다.

## 2. 작가에게 문의하고 견적 받기
마음에 드는 작가의 프로필에서 문의를 남기면 예약별 전용 소통방이 열립니다. 작가가 견적을 제시하면 확인 후 수락할 수 있어요.

## 3. 예약금 결제
견적 수락 후 총 촬영금액의 30%를 예약금으로 결제합니다. 결제 전까지는 서로의 연락처가 비공개이며, 플랫폼 채팅으로만 소통합니다.

## 4. 촬영 정보 확정 및 잔금 결제
촬영일시·장소·금액 등 중요 내용은 소통방에서 양측이 확정하며, 촬영일 3일 전까지 잔금을 결제합니다.

## 5. 촬영 및 사진 전달
촬영이 끝나면 작가가 사진을 업로드하고, 마이페이지 "받은 사진"에서 확인할 수 있습니다. 확인 후 후기를 남겨주세요.

## 6. 문제가 생겼다면
촬영 전 일정 변경이나 취소는 예약 상세의 "취소" 기능을, 촬영 후 결과물·이행 문제는 "분쟁 신고" 기능을 이용해주세요. 두 기능은 진입점이 분리되어 있습니다.`;

const ABOUT = `## 씬파인더 소개
고객이 촬영 목적과 상황에 맞는 사진작가를 질문형 네비게이터로 찾고, 예약부터 결제·소통·결과물 전달까지 플랫폼 안에서 완결하는 프리미엄 사진 촬영 매칭 서비스입니다.

## 우리가 다르게 하는 것
- **씬파인더가 엄선한 작가만 활동** — 사업자등록 인증과 관리자의 포트폴리오 검토를 통과한 작가만 활동할 수 있어요. 아무나 등록해서 파는 마켓플레이스가 아닙니다.
- **분야별 최저가 하한선** — 저가 신고로 수수료를 회피하려는 시도를 막기 위해, 관리자가 촬영 분야별 시간당 최저가를 관리합니다.
- 최저가 순이 아닌 적합도 기반 추천
- 예약 생성 시점부터 전용 소통방으로 모든 대화·합의를 기록
- 결제 전 연락처 비공개, 예약금 결제 후 공개
- 결과물 전달, 수정 요청, 후기까지 플랫폼 안에서 종결

## 거래 구조 안내
씬파인더는 고객과 사진작가 사이의 거래를 연결하는 통신판매중개자이며, 촬영 서비스의 실제 판매자 및 제공자는 각 작가입니다. 자세한 내용은 통신판매중개자 고지를 확인해주세요.`;

const PRIVACY_POLICY_DRAFT = `> ⚠️ 본 페이지는 서비스 준비 과정에서 작성된 초안이며, 실제 게시 전 반드시 개인정보보호 법령 및 전문가 검토를 거쳐야 합니다.

씬파인더는 회원가입, 예약·결제, 소통방 이용, 고객센터 문의 처리를 위해 필요한 최소한의 개인정보(성명, 휴대전화, 이메일, 결제정보, 정산계좌 등)를 수집·이용합니다. 수집한 정보는 서비스 제공 목적 범위 내에서만 사용되며, 관련 법령에 따른 보유기간 경과 또는 회원 탈퇴 시 파기됩니다. 결제 대행 및 클라우드 스토리지 등 외부 서비스에 처리를 위탁하는 경우 위탁 현황을 별도로 고지할 예정입니다.`;

export interface PageContent {
  slug: string;
  title: string;
  content: string;
}

@Injectable()
export class PagesService {
  private readonly termsSource: string;

  constructor() {
    const path = join(process.cwd(), '../../docs/이용약관_초안.md');
    this.termsSource = readFileSync(path, 'utf-8');
  }

  getBySlug(slug: string): PageContent {
    const page = this.build(slug);
    if (!page) {
      throw new NotFoundException('페이지를 찾을 수 없습니다.');
    }
    return page;
  }

  private build(slug: string): PageContent | null {
    switch (slug) {
      case 'how-to-use':
        return { slug, title: '이용방법', content: HOW_TO_USE };
      case 'about':
        return { slug, title: '회사소개', content: ABOUT };
      case 'terms-of-service':
        return {
          slug,
          title: '서비스 이용약관',
          content: this.extractBetween('# 1부.', '# 2부.'),
        };
      case 'photographer-terms':
        return {
          slug,
          title: '작가 이용약관',
          content: this.extractBetween('# 2부.', null),
        };
      case 'cancellation-policy':
        return {
          slug,
          title: '취소·환불 정책',
          content: this.extractBetween(
            '## 제5장 취소 및 환불',
            '## 제6장 지식재산권 및 초상권',
          ),
        };
      case 'privacy-policy':
        return {
          slug,
          title: '개인정보처리방침',
          content: PRIVACY_POLICY_DRAFT,
        };
      case 'intermediary-notice':
        return {
          slug,
          title: '통신판매중개자 고지',
          content: INTERMEDIARY_NOTICE,
        };
      case 'business-contact':
        return {
          slug,
          title: '기업·제휴 문의 연락처',
          content: BUSINESS_CONTACT,
        };
      default:
        return null;
    }
  }

  private extractBetween(startMarker: string, endMarker: string | null) {
    const start = this.termsSource.indexOf(startMarker);
    if (start === -1) return '';
    const end = endMarker
      ? this.termsSource.indexOf(endMarker, start + startMarker.length)
      : -1;
    const slice =
      end === -1
        ? this.termsSource.slice(start)
        : this.termsSource.slice(start, end);
    return slice.trim();
  }
}
