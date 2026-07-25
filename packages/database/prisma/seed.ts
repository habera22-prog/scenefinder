import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DB스키마_API명세.md 2-3절 예시 코드 기준 (신규 분야는 이 목록에 row 추가만으로 확장)
const categories = [
  { code: 'event', label: '행사', sortOrder: 1 },
  { code: 'family', label: '가족', sortOrder: 2 },
  { code: 'couple', label: '커플', sortOrder: 3 },
  { code: 'travel', label: '여행', sortOrder: 4 },
  { code: 'sports', label: '공연·스포츠', sortOrder: 5 },
  { code: 'profile', label: '프로필', sortOrder: 6 },
  { code: 'brand', label: '브랜드', sortOrder: 7 },
  { code: 'senior_tour', label: '시니어 투어', sortOrder: 8 },
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
