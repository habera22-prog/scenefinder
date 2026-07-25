"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Role = "customer" | "photographer";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, verifyOtp } = useAuth();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [role, setRole] = useState<Role>(
    searchParams.get("role") === "photographer" ? "photographer" : "customer",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signup({ role, name, email, phone });
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "가입 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await verifyOtp(phone, code);
      router.push(user.role === "photographer" ? "/photographers/apply" : "/");
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
