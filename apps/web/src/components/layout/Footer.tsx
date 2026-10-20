import Link from "next/link";

const links = [
  { slug: "how-to-use", label: "이용 방법" },
  { slug: "terms-of-service", label: "이용약관" },
  { slug: "privacy-policy", label: "개인정보처리방침" },
  { slug: "cancellation-policy", label: "취소·환불 정책" },
  { slug: "photographer-terms", label: "작가 이용약관" },
  { slug: "intermediary-notice", label: "통신판매중개자 고지" },
];

export function Footer() {
  return (
    <footer className="sf-footer mt-auto bg-[var(--card)] px-5 pt-8 text-xs leading-relaxed text-[var(--muted-foreground)]">
      <div className="mx-auto max-w-[640px]">
        <p className="mb-4 text-base font-bold text-[var(--foreground)]">
          씬파인더
        </p>
        <nav
          aria-label="서비스 정보"
          className="mb-5 flex flex-wrap gap-x-4 gap-y-3"
        >
          {links.map((link) => (
            <Link
              key={link.slug}
              href={`/pages/${link.slug}`}
              className="sf-tab"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/pages/about" className="sf-tab">
            회사소개
          </Link>
          <Link href="/partnership" className="sf-tab">
            제휴 문의
          </Link>
        </nav>
        <p>
          씬파인더(SceneFinder)는 고객과 사진작가 간 촬영 서비스 거래를 연결하는
          통신판매중개 서비스입니다.
        </p>
        <p className="mt-2">
          촬영 서비스의 판매자 및 제공자는 각 상품 페이지에 표시된 사진작가이며,
          촬영 이행 책임은 해당 작가에게 있습니다.
        </p>
      </div>
    </footer>
  );
}
