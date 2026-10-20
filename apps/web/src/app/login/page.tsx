"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { consumeAuthReturn } from "@/lib/auth-return";
import { KakaoLoginButton } from "@/components/auth/KakaoLoginButton";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isKakaoLink = searchParams.get("kakaoLink") === "1";
  const { requestLoginOtp, verifyOtp, linkKakaoAccount } = useAuth();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [kakaoTicket, setKakaoTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() => {
    if (searchParams.get("error") === "kakao_cancelled") {
      return "카카오 로그인을 취소했습니다.";
    }
    if (searchParams.get("error") === "kakao_failed") {
      return "카카오 로그인에 실패했습니다. 다시 시도해주세요.";
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isKakaoLink) return;
    const timer = window.setTimeout(() => {
      setKakaoTicket(window.sessionStorage.getItem("scenefinder.kakao-ticket"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isKakaoLink]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await requestLoginOtp(phone);
      setStep("otp");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "인증번호 요청에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isKakaoLink && !kakaoTicket) {
        setError(
          "카카오 연결 정보가 만료되었습니다. 카카오 로그인을 다시 시도해주세요.",
        );
        return;
      }
      const session = await verifyOtp(phone, code);
      if (isKakaoLink && kakaoTicket) {
        await linkKakaoAccount(kakaoTicket, session.accessToken);
        window.sessionStorage.removeItem("scenefinder.kakao-ticket");
      }
      router.push(consumeAuthReturn());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "인증에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold text-foreground">로그인</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {step === "phone"
          ? isKakaoLink
            ? "기존 계정과 카카오 계정을 연결하려면 휴대전화 인증으로 로그인해주세요."
            : "가입하신 휴대전화번호로 인증번호를 보내드려요."
          : `${phone}로 발송된 인증번호를 입력해주세요.`}
      </p>

      {isKakaoLink && (
        <p className="mb-4 rounded-lg bg-brand/5 p-3 text-sm text-muted-foreground">
          카카오 계정과 같은 이메일 또는 휴대전화번호로 가입한 계정이 있습니다.
          해당 계정으로 인증하면 카카오 로그인을 연결합니다.
        </p>
      )}

      <Card className="p-6">
        {step === "phone" ? (
          <form className="flex flex-col gap-4" onSubmit={handleRequestOtp}>
            <div>
              <Label htmlFor="phone">휴대전화번호</Label>
              <Input
                id="phone"
                required
                placeholder="01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "요청 중..." : "인증번호 받기"}
            </Button>
          </form>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleVerify}>
            <div>
              <Label htmlFor="code">인증번호 6자리</Label>
              <Input
                id="code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "확인 중..." : "로그인"}
            </Button>
          </form>
        )}
      </Card>

      {!isKakaoLink && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            또는
            <span className="h-px flex-1 bg-border" />
          </div>
          <KakaoLoginButton />
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        아직 계정이 없으신가요?{" "}
        <a href="/signup" className="font-medium text-brand hover:underline">
          회원가입
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="flex-1 py-16 text-center">불러오는 중...</div>}
    >
      <LoginForm />
    </Suspense>
  );
}
