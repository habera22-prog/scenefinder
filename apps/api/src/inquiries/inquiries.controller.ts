import { Body, Controller, Post } from '@nestjs/common';
import { InquiriesService } from './inquiries.service';
import { CreateCorporateInquiryDto } from './dto/create-corporate-inquiry.dto';
import { CreatePartnershipInquiryDto } from './dto/create-partnership-inquiry.dto';

// 기업/제휴 문의는 플랫폼 회원이 아닌 외부 담당자도 제출해야 하므로 인증 없이 공개(public)
@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post('corporate')
  createCorporate(@Body() dto: CreateCorporateInquiryDto) {
    return this.inquiriesService.createCorporate(dto);
  }

  @Post('partnership')
  createPartnership(@Body() dto: CreatePartnershipInquiryDto) {
    return this.inquiriesService.createPartnership(dto);
  }
}
