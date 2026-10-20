"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function KakaoLoginButton({
  preferredRole,
}: {
  preferredRole?: "customer" | "photographer";
}) {
  const { startKakaoLogin } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setIsStarting(true);
    try {
      const authorizationUrl = await startKakaoLogin(preferredRole);
      window.location.assign(authorizationUrl);
    } catch {
      setError("카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.");
      setIsStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleLogin}
        disabled={isStarting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 text-sm font-semibold text-[#191919] transition-colors hover:bg-[#f5dc00] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M12 3C6.48 3 2 6.56 2 10.95c0 2.8 1.87 5.26 4.69 6.65l-.96 3.52a.35.35 0 0 0 .53.38l4.2-2.79c.5.07 1.02.1 1.54.1 5.52 0 10-3.56 10-7.96S17.52 3 12 3Z" />
        </svg>
        {isStarting ? "카카오로 이동 중..." : "카카오로 시작하기"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
