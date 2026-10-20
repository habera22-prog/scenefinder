"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { NotificationBell } from "./NotificationBell";

const customerTabs: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/photographers", label: "작가 찾기", icon: "search" },
  { href: "/me/favorites", label: "찜한 작가", icon: "heart" },
  { href: "/me/bookings?role=customer", label: "내 예약", icon: "calendar" },
];

export function Header() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<{
    userId: string;
    mode: "customer" | "photographer";
  } | null>(null);
  const studioPage =
    pathname === "/photographers/apply" || pathname === "/me/settlements";
  const photographerMode =
    user?.role === "photographer" &&
    (studioPage ||
      (selectedMode?.userId === user.id &&
        selectedMode.mode === "photographer"));
  function toggleMode() {
    if (!user || user.role !== "photographer") return;
    const next = photographerMode ? "customer" : "photographer";
    setSelectedMode({ userId: user.id, mode: next });
    setMenuOpen(false);
    router.push(next === "customer" ? "/" : "/photographers/apply");
  }
  const accountLinks =
    user?.role === "admin"
      ? [{ href: "/admin", label: "관리자" }]
      : photographerMode
        ? [
            { href: "/me/bookings?role=photographer", label: "작가 예약 관리" },
            { href: "/photographers/apply", label: "작가 프로필 관리" },
            { href: "/me/settlements", label: "정산 내역" },
          ]
        : [
            { href: "/me/bookings?role=customer", label: "내 예약" },
            { href: "/me/favorites", label: "찜한 작가" },
            { href: "/me/photos", label: "받은 사진" },
          ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--card)] shadow-[0_1px_0_rgb(0_0_0/0.06)]">
        <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between gap-3 px-5">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex shrink-0 items-center gap-2 text-xl font-bold tracking-tight"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt=""
              className="h-8 w-8 object-contain"
            />
            씬파인더
          </Link>
          <nav
            aria-label="주 메뉴"
            className="hidden items-center gap-6 text-sm font-medium md:flex"
          >
            <Link
              href="/photographers"
              className="sf-tab"
              aria-current={pathname === "/photographers" ? "page" : undefined}
            >
              작가 둘러보기
            </Link>
            <Link
              href="/navigator"
              className="sf-tab"
              aria-current={pathname === "/navigator" ? "page" : undefined}
            >
              내 촬영에 맞게 찾기
            </Link>
            <Link href="/pages/how-to-use" className="sf-tab">
              이용 방법
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {user?.role === "photographer" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={toggleMode}
                className="hidden sm:inline-flex"
              >
                {photographerMode ? "고객으로 전환" : "작가 모드"}
              </Button>
            )}
            {user && <NotificationBell />}
            {!isLoading && !user && (
              <Link href="/login" className={buttonStyles("ghost", "sm")}>
                로그인
              </Link>
            )}
            <button
              type="button"
              aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={menuOpen}
              aria-controls="account-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              className="sf-button-ghost flex h-10 w-10 items-center justify-center rounded-xl"
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="account-menu"
            aria-label="전체 메뉴"
            onKeyDown={(e) => {
              if (e.key === "Escape") setMenuOpen(false);
            }}
            className="mx-auto max-w-[640px] space-y-1 px-5 pt-4 pb-5"
          >
            {user && (
              <p className="mb-4 text-lg font-bold">
                {user.name}님, 반가워요
                <span className="mt-1 block text-sm font-normal text-[var(--muted-foreground)]">
                  {photographerMode
                    ? "작가로 활동하고 있어요"
                    : "소중한 순간을 남겨보세요"}
                </span>
              </p>
            )}
            {[
              { href: "/photographers", label: "작가 둘러보기" },
              { href: "/navigator", label: "내 촬영에 맞게 찾기" },
              ...accountLinks,
              { href: "/me/support", label: "고객센터" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="sf-button-ghost flex items-center justify-between rounded-xl p-3 text-base font-medium"
              >
                {link.label}
                <Icon name="chevron" className="h-4 w-4" />
              </Link>
            ))}
            {user?.role === "photographer" ? (
              <Button
                className="mt-3 w-full"
                variant="secondary"
                onClick={toggleMode}
              >
                {photographerMode
                  ? "고객으로 전환하기"
                  : "작가 화면으로 전환하기"}
              </Button>
            ) : (
              <Link
                href="/signup?role=photographer"
                onClick={() => setMenuOpen(false)}
                className={`${buttonStyles("secondary")} mt-3 w-full`}
              >
                사진작가로 활동하기
              </Link>
            )}
            {user && (
              <Button
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => {
                  setSelectedMode(null);
                  setMenuOpen(false);
                  logout();
                  router.push("/");
                }}
              >
                로그아웃
              </Button>
            )}
          </nav>
        )}
      </header>
      {user?.role !== "admin" && !photographerMode && (
        <nav
          aria-label="고객 메뉴"
          className="sf-bottom-nav fixed right-0 bottom-0 left-0 z-40 bg-[var(--card)] shadow-[0_-1px_8px_rgb(25_31_40/0.06)] md:hidden"
        >
          <div className="mx-auto grid h-16 max-w-[640px] grid-cols-4">
            {customerTabs.map((tab) => {
              const base = tab.href.split("?")[0];
              const active =
                base === "/"
                  ? pathname === "/"
                  : pathname.startsWith(base) ||
                    (base === "/me/bookings" &&
                      pathname.startsWith("/bookings/")) ||
                    (base === "/photographers" && pathname === "/navigator");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className="sf-tab flex flex-col items-center justify-center gap-1 text-[11px] font-medium"
                >
                  <Icon name={tab.icon} className="h-[22px] w-[22px]" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
