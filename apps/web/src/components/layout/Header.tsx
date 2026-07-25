"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";

export function Header() {
  const { user, logout, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
            씬파인더
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link href="/navigator" className="hover:text-foreground">
              촬영 찾기
            </Link>
            <Link href="/photographers" className="hover:text-foreground">
              사진작가
            </Link>
            <Link href="/signup?role=photographer" className="hover:text-foreground">
              작가 지원
            </Link>
            <Link href="/pages/how-to-use" className="hover:text-foreground">
              이용방법
            </Link>
            <Link href="/pages/about" className="hover:text-foreground">
              회사소개
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? null : user ? (
            <>
              {user.role === "customer" && (
                <>
                  <Link
                    href="/me/bookings"
                    className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
                  >
                    내 예약
                  </Link>
                  <Link
                    href="/me/photos"
                    className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
                  >
                    받은 사진
                  </Link>
                  <Link
                    href="/me/favorites"
                    className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
                  >
                    찜한 작가
                  </Link>
                </>
              )}
              {user.role === "photographer" && (
                <Link
                  href="/me/settlements"
                  className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
                >
                  정산
                </Link>
              )}
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
                >
                  관리자
                </Link>
              )}
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.name}님
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                로그아웃
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  로그인
                </Button>
              </Link>
              <Link href="/navigator">
                <Button size="sm">나에게 맞는 작가 찾기</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
