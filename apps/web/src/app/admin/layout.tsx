"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui/Spinner";

const TABS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/bookings", label: "예약 조회" },
  { href: "/admin/users", label: "회원 관리" },
  { href: "/admin/photographers", label: "작가 승인" },
  { href: "/admin/payments", label: "결제/환불" },
  { href: "/admin/reviews", label: "후기 관리" },
  { href: "/admin/disputes", label: "분쟁 처리" },
  { href: "/admin/support", label: "고객센터" },
  { href: "/admin/categories", label: "카테고리 관리" },
  { href: "/admin/content", label: "콘텐츠 검수" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      router.push("/");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="mb-1 text-xl font-bold text-foreground">관리자</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        작가 승인, 결제, 후기, 분쟁, 카테고리 등 플랫폼 운영 전반을 관리해요.
      </p>
      <div className="mb-8 flex flex-wrap gap-1.5 border-b-2 border-border pb-0 text-sm font-semibold">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-0.5 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 transition-colors ${
              pathname === tab.href
                ? "border-brand bg-brand-muted text-brand"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
