"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { consumeAuthReturn } from "@/lib/auth-return";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { KakaoLoginButton } from "@/components/auth/KakaoLoginButton";

type Role = "customer" | "photographer";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, signupWithKakao, verifyOtp } = useAuth();
  const isKakaoSignup = searchParams.get("kakao") === "1";

  const [step, setStep] = useState<"form" | "otp">("form");
  const [role, setRole] = useState<Role>(
    searchParams.get("role") === "photographer" ? "photographer" : "customer",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [kakaoTicket, setKakaoTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isKakaoSignup) return;
    const timer = window.setTimeout(() => {
      setKakaoTicket(window.sessionStorage.getItem("scenefinder.kakao-ticket"));
      const rawProfile = window.sessionStorage.getItem(
        "scenefinder.kakao-profile",
      );
      if (!rawProfile) return;
      try {
        const profile = JSON.parse(rawProfile) as {
          name?: string;
          email?: string | null;
        };
        if (profile.name) setName((current) => current || profile.name || "");
        if (profile.email)
          setEmail((current) => current || profile.email || "");
      } catch {
        window.sessionStorage.removeItem("scenefinder.kakao-profile");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isKakaoSignup]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isKakaoSignup && kakaoTicket) {
        await signupWithKakao({
          ticket: kakaoTicket,
          role,
          name,
          email,
          phone,
        });
      } else if (isKakaoSignup) {
        setError("카카오 로그인 정보가 만료되었습니다. 다시 로그인해주세요.");
        return;
      } else {
        await signup({ role, name, email, phone });
      }
      if (isKakaoSignup) {
        window.sessionStorage.removeItem("scenefinder.kakao-ticket");
        window.sessionStorage.removeItem("scenefinder.kakao-profile");
      }
      setStep("otp");
    } catch (err) {
      if (
        isKakaoSignup &&
        kakaoTicket &&
        err instanceof ApiError &&
        err.status === 409
      ) {
        router.push("/login?kakaoLink=1");
        return;
      }
      setError(
        err instanceof ApiError ? err.message : "가입 요청에 실패했습니다.",
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
      const { user } = await verifyOtp(phone, code);
      const returnTo = consumeAuthReturn();
      router.push(
        returnTo !== "/"
          ? returnTo
          : user.role === "photographer"
            ? "/photographers/apply"
            : "/",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "인증에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold text-foreground">회원가입</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {step === "form"
          ? "몇 가지 정보만 입력하면 바로 시작할 수 있어요."
          : `${phone}로 발송된 인증번호를 입력해주세요.`}
      </p>

      <Card className="p-6">
        {step === "form" ? (
          <form className="flex flex-col gap-4" onSubmit={handleSignup}>
            <div>
              <Label>가입 유형</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={role === "customer" ? "primary" : "secondary"}
                  onClick={() => setRole("customer")}
                >
                  고객
                </Button>
                <Button
                  type="button"
                  variant={role === "photographer" ? "primary" : "secondary"}
                  onClick={() => setRole("photographer")}
                >
                  작가
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
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
              {isSubmitting ? "확인 중..." : "인증 완료"}
            </Button>
          </form>
        )}
      </Card>

      {!isKakaoSignup && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            또는
            <span className="h-px flex-1 bg-border" />
          </div>
          <KakaoLoginButton preferredRole={role} />
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <a href="/login" className="font-medium text-brand hover:underline">
          로그인
        </a>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
