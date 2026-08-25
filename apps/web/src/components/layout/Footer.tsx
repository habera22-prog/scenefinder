import Link from "next/link";

const FOOTER_LINKS: { slug: string; label: string }[] = [
  { slug: "how-to-use", label: "이용방법" },
  { slug: "about", label: "회사소개" },
  { slug: "terms-of-service", label: "서비스 이용약관" },
  { slug: "photographer-terms", label: "작가 이용약관" },
  { slug: "privacy-policy", label: "개인정보처리방침" },
  { slug: "cancellation-policy", label: "취소·환불 정책" },
  { slug: "intermediary-notice", label: "통신판매중개자 고지" },
];

export function Footer() {
  return (
    <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
      <nav className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {FOOTER_LINKS.map((l) => (
          <Link key={l.slug} href={`/pages/${l.slug}`} className="hover:text-foreground">
            {l.label}
          </Link>
        ))}
        <Link href="/business-inquiry" className="hover:text-foreground">
          기업 촬영 문의
        </Link>
        <Link href="/partnership" className="hover:text-foreground">
          제휴 문의
        </Link>
      </nav>
      <p>씬파인더(SceneFinder)는 고객과 사진작가 간 촬영 서비스 거래를 연결하는 통신판매중개 서비스입니다.</p>
      <p className="mt-1">촬영 서비스의 판매자 및 제공자는 각 상품 페이지에 표시된 사진작가이며, 촬영 이행 책임은 해당 작가에게 있습니다.</p>
    </footer>
  );
}
