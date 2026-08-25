import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCorporateInquiryDto } from './dto/create-corporate-inquiry.dto';
import { CreatePartnershipInquiryDto } from './dto/create-partnership-inquiry.dto';

@Injectable()
export class InquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  createCorporate(dto: CreateCorporateInquiryDto) {
    return this.prisma.corporateInquiry.create({
      data: {
        companyName: dto.companyName,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        shootDate: dto.shootDate ? new Date(dto.shootDate) : undefined,
        location: dto.location,
        purpose: dto.purpose,
        captureModeCode: dto.captureModeCode,
        expectedDurationMin: dto.expectedDurationMin,
        expectedHeadcount: dto.expectedHeadcount,
        deliverableUsage: dto.deliverableUsage,
        budgetRange: dto.budgetRange,
        taxInvoiceRequired: dto.taxInvoiceRequired ?? false,
        notes: dto.notes,
      },
    });
  }

  createPartnership(dto: CreatePartnershipInquiryDto) {
    return this.prisma.partnershipInquiry.create({
      data: {
        companyName: dto.companyName,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        companyType: dto.companyType,
        collaborationType: dto.collaborationType,
        proposal: dto.proposal,
      },
    });
  }
}
