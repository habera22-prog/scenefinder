# 씬파인더 (SceneFinder)

사진 촬영 매칭 플랫폼. 모노레포(pnpm + Turborepo) 구성: `apps/web`(Next.js), `apps/api`(NestJS), `packages/database`(Prisma).

## 문서 찾기

| 문서 | 내용 |
|---|---|
| [docs/사진촬영플랫폼_PRD.md](docs/사진촬영플랫폼_PRD.md) | 제품 요구사항 정의서 — 서비스 정책, 기능 요구사항, 법적 요건 |
| [docs/DB스키마_API명세.md](docs/DB스키마_API명세.md) | DB 테이블 정의, API 명세 |
| [docs/wireframe.html](docs/wireframe.html) | 화면 와이어프레임 (브라우저로 열기) |
| [docs/이용약관_초안.md](docs/이용약관_초안.md) | 이용약관 초안 (서비스/작가 이용약관) |
| **[docs/개발문서.md](docs/개발문서.md)** | **PRD·DB문서에 없는 내용** — 기술 스택, 로컬 실행법, 실제 API 전체 목록, mock fallback 동작, PRD 대비 미구현 갭 목록, 향후 기능 설계 |

PRD/DB문서에 안 나오는 "왜 이렇게 만들었는지", "실제로 뭐가 되고 안 되는지"가 궁금하면 **개발문서.md**부터 보세요.

## 실행 방법

```bash
docker-compose up -d       # PostgreSQL, Redis
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev                   # web :3000, api :4000
```

자세한 환경변수·인증/결제 mock 동작 등은 [docs/개발문서.md](docs/개발문서.md) 참고.
