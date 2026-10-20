import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DB스키마_API명세.md 2-3절 예시 코드 기준 (신규 분야는 이 목록에 row 추가만으로 확장)
const categories = [
  { code: 'event', label: '행사', sortOrder: 1 },
  { code: 'anniversary', label: '기념일', sortOrder: 2 },
  { code: 'family', label: '가족', sortOrder: 3 },
  { code: 'couple', label: '커플', sortOrder: 4 },
  { code: 'travel', label: '여행', sortOrder: 5 },
  { code: 'sports', label: '공연·스포츠', sortOrder: 6 },
  { code: 'profile', label: '프로필', sortOrder: 7 },
  { code: 'corporate', label: '기업', sortOrder: 8 },
  { code: 'brand', label: '브랜드', sortOrder: 9 },
  { code: 'senior_tour', label: '시니어 투어', sortOrder: 10 },
];

// 촬영 방식 — 촬영 종류와 별도 축으로 관리 (본 요청 1번)
const captureModes = [
  { code: 'photo', label: '사진 촬영', sortOrder: 1 },
  { code: 'drone', label: '드론 촬영', sortOrder: 2 },
  { code: 'video', label: '영상 촬영', sortOrder: 3 },
  { code: 'photo_drone', label: '사진 + 드론', sortOrder: 4 },
  { code: 'photo_video', label: '사진 + 영상', sortOrder: 5 },
  { code: 'drone_video', label: '드론 + 영상', sortOrder: 6 },
  { code: 'all', label: '사진 + 영상 + 드론', sortOrder: 7 },
];

async function main() {
  for (const category of categories) {
    await prisma.shootCategory.upsert({
      where: { code: category.code },
      update: { label: category.label, sortOrder: category.sortOrder },
      create: category,
    });
  }
  console.log(`Seeded ${categories.length} shoot categories.`);

  for (const mode of captureModes) {
    await prisma.captureMode.upsert({
      where: { code: mode.code },
      update: { label: mode.label, sortOrder: mode.sortOrder },
      create: mode,
    });
  }
  console.log(`Seeded ${captureModes.length} capture modes.`);

  // Development-only admin account. It is opt-in so normal and production seeds
  // never create a privileged account by default.
  if (process.env.SEED_LOCAL_ADMIN === 'true') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SEED_LOCAL_ADMIN cannot be used in production.');
    }

    const phone = '01099998888';
    const email = 'admin@scenefinder.local';
    const adminByEmail = await prisma.user.findUnique({ where: { email } });
    const existingByPhone = await prisma.user.findFirst({ where: { phone } });

    if (existingByPhone && existingByPhone.id !== adminByEmail?.id) {
      throw new Error(
        'The local admin test phone is already assigned to another account.',
      );
    }

    await prisma.user.upsert({
      where: { email },
      update: {
        role: 'admin',
        name: 'SceneFinder 관리자',
        phone,
        status: 'active',
      },
      create: {
        role: 'admin',
        name: 'SceneFinder 관리자',
        email,
        phone,
        status: 'active',
      },
    });
    console.log(`Seeded local admin account for ${phone}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
