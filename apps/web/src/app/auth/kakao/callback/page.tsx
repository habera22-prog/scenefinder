"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function KakaoCallback() {
  const router = useRouter();
  const { completeKakaoLogin } = useAuth();
  const started = useRef(false);
  const [ticket] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.hash.slice(1)).get("ticket");
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );

    if (!ticket) {
      const timer = window.setTimeout(() => {
        setError("카카오 로그인 정보를 확인할 수 없습니다.");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    void completeKakaoLogin(ticket)
      .then((result) => {
        if (result.requiresSignup) {
          window.sessionStorage.setItem(
            "scenefinder.kakao-ticket",
            result.ticket,
          );
          window.sessionStorage.setItem(
            "scenefinder.kakao-profile",
            JSON.stringify(result.profile),
          );
          const signupUrl = new URL("/signup", window.location.origin);
          signupUrl.searchParams.set("kakao", "1");
          if (result.profile.role) {
            signupUrl.searchParams.set("role", result.profile.role);
          }
          router.replace(`${signupUrl.pathname}${signupUrl.search}`);
          return;
        }
        router.replace("/");
      })
      .catch(() => {
        setError("카카오 로그인에 실패했습니다. 다시 시도해주세요.");
      });
  }, [completeKakaoLogin, router, ticket]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">
        {error ?? "카카오 계정을 확인하고 있어요..."}
      </p>
      {error && (
        <a
          href="/login"
          className="mt-4 text-sm font-medium text-brand hover:underline"
        >
          로그인으로 돌아가기
        </a>
      )}
    </div>
  );
}

export default function KakaoCallbackPage() {
  return <KakaoCallback />;
}
