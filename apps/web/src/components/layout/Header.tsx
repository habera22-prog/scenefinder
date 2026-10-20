"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { resolveWorkspaceMode } from "@/lib/workspace-mode";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { NotificationBell } from "./NotificationBell";

const customerTabs: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/photographers", label: "작가 찾기", icon: "search" },
  { href: "/me/favorites", label: "찜한 작가", icon: "heart" },
  { href: "/me/bookings?role=customer", label: "내 예약", icon: "calendar" },
];
const studioTabs: { href: string; label: string; icon: IconName }[] = [
  { href: "/studio", label: "작가 홈", icon: "home" },
  {
    href: "/me/bookings?role=photographer",
    label: "문의·예약",
    icon: "message",
  },
  { href: "/studio/schedule", label: "일정", icon: "calendar" },
  { href: "/photographers/apply", label: "프로필·상품", icon: "camera" },
  { href: "/me/settlements", label: "정산", icon: "briefcase" },
];
const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function Header() {
  // Suspense may hydrate this header after the provider restores the session.
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientReady,
    serverReady,
  );
  const auth = useAuth();
  const { logout, workspaceMode, setWorkspaceMode } = auth;
  const user = hydrated ? auth.user : null;
  const isLoading = !hydrated || auth.isLoading;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const resolvedMode = resolveWorkspaceMode(
    pathname,
    params.get("role"),
    workspaceMode,
    user?.role,
  );
  useEffect(() => {
    if (user?.role === "photographer" && resolvedMode !== workspaceMode) {
      setWorkspaceMode(resolvedMode);
    }
  }, [resolvedMode, setWorkspaceMode, user?.role, workspaceMode]);
  const photographerMode = resolvedMode === "photographer";
  const tabs = photographerMode ? studioTabs : customerTabs;
  const primary = photographerMode
    ? studioTabs
    : [
        { href: "/photographers", label: "작가 둘러보기" },
        { href: "/navigator", label: "내 촬영에 맞게 찾기" },
        { href: "/pages/how-to-use", label: "이용 방법" },
      ];
  const accountLinks =
    user?.role === "admin"
      ? [{ href: "/admin", label: "관리자" }]
      : photographerMode
        ? studioTabs
        : [
            { href: "/me/bookings?role=customer", label: "내 예약" },
            { href: "/me/favorites", label: "찜한 작가" },
            { href: "/me/photos", label: "받은 사진" },
          ];
  function toggleMode() {
    if (user?.role !== "photographer") return;
    setWorkspaceMode(photographerMode ? "customer" : "photographer");
    setMenuOpen(false);
    router.push(photographerMode ? "/" : "/studio");
  }
  function active(href: string) {
    const base = href.split("?")[0];
    if (base === "/studio") return pathname === "/studio";
    if (base === "/") return pathname === "/";
    if (base === "/me/bookings")
      return pathname === base || pathname.startsWith("/bookings/");
    return (
      pathname === base ||
      (base === "/photographers" &&
        (pathname.startsWith("/photographers/") || pathname === "/navigator"))
    );
  }
  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--card)] shadow-[0_1px_0_rgb(0_0_0/0.06)]">
        <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between gap-3 px-5 lg:h-18 lg:max-w-[1200px] lg:px-8">
          <Link
            href={photographerMode ? "/studio" : "/"}
            onClick={() => setMenuOpen(false)}
            className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight sm:text-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt=""
              className="h-8 w-8 object-contain"
            />
            씬파인더
            {photographerMode && (
              <span className="rounded-lg bg-[var(--brand-muted)] px-2 py-1 text-xs text-[var(--brand-text)]">
                작가
              </span>
            )}
          </Link>
          <nav
            aria-label={photographerMode ? "작가 주 메뉴" : "주 메뉴"}
            className={`hidden items-center gap-5 text-sm font-medium ${photographerMode ? "lg:flex" : "md:flex"}`}
          >
            {primary.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="sf-tab"
                aria-current={active(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {user?.role === "photographer" && (
              <div className="hidden lg:block">
                <Button size="sm" variant="secondary" onClick={toggleMode}>
                  {photographerMode ? "고객으로 전환" : "작가 모드"}
                </Button>
              </div>
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
                    ? "작가 작업실에서 촬영을 관리하세요"
                    : "소중한 순간을 남겨보세요"}
                </span>
              </p>
            )}
            {[
              ...(!photographerMode
                ? [
                    { href: "/photographers", label: "작가 둘러보기" },
                    { href: "/navigator", label: "내 촬영에 맞게 찾기" },
                  ]
                : []),
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
                variant="secondary"
                className="mt-3 w-full"
                onClick={toggleMode}
              >
                {photographerMode
                  ? "고객으로 전환하기"
                  : "작가 화면으로 전환하기"}
              </Button>
            ) : (
              user?.role !== "admin" && (
                <Link
                  href="/signup?role=photographer"
                  onClick={() => setMenuOpen(false)}
                  className={`${buttonStyles("secondary")} mt-3 w-full`}
                >
                  사진작가로 활동하기
                </Link>
              )
            )}
            {user && (
              <Button
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => {
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
      {user?.role !== "admin" && (
        <nav
          aria-label={photographerMode ? "작가 메뉴" : "고객 메뉴"}
          className="sf-bottom-nav fixed right-0 bottom-0 left-0 z-40 bg-[var(--card)] shadow-[0_-1px_8px_rgb(25_31_40/0.06)] md:hidden"
        >
          <div
            className={`mx-auto grid h-16 max-w-[640px] ${photographerMode ? "grid-cols-5" : "grid-cols-4"}`}
          >
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active(tab.href) ? "page" : undefined}
                className="sf-tab flex flex-col items-center justify-center gap-1 text-[11px] font-medium"
              >
                <Icon name={tab.icon} className="h-[22px] w-[22px]" />
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
