import type { Prisma } from '@scenefinder/database';

export const photographerSummarySelect = {
  id: true,
  businessName: true,
  photographerType: true,
  verificationStatus: true,
  activeRegions: true,
  moodTags: true,
  categories: true,
  captureCapabilities: true,
  avgRating: true,
  completedBookingsCount: true,
  user: { select: { name: true } },
  portfolios: {
    take: 1,
    orderBy: { sortOrder: 'asc' },
    select: { imageUrl: true },
  },
  packages: {
    take: 1,
    orderBy: { basePrice: 'asc' },
    select: { basePrice: true, durationMin: true },
  },
  _count: {
    select: { bookings: { where: { review: { is: { isBlinded: false } } } } },
  },
} satisfies Prisma.PhotographerSelect;

type SummaryRecord = Prisma.PhotographerGetPayload<{
  select: typeof photographerSummarySelect;
}>;

export function toPhotographerSummary(record: SummaryRecord) {
  const { user, packages, _count, ...profile } = record;
  return {
    ...profile,
    displayName: record.businessName?.trim() || user.name.trim() || '사진작가',
    avgRating: record.avgRating === null ? null : Number(record.avgRating),
    startingPrice: packages[0]?.basePrice ?? null,
    startingDurationMin: packages[0]?.durationMin ?? null,
    reviewCount: _count.bookings,
  };
}
