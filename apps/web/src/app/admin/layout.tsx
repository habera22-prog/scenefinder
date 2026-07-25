"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui/Spinner";

const TABS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/photographers", label: "작가 승인" },
  { href: "/admin/payments", label: "결제/환불" },
  { href: "/admin/reviews", label: "후기 관리" },
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
      <h1 className="mb-6 text-xl font-bold text-foreground">관리자</h1>
      <div className="mb-8 flex gap-1 border-b border-border text-sm font-medium">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-3 py-2 ${
              pathname === tab.href
                ? "border-brand text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
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
