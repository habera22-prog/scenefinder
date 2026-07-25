"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { requestLoginOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await verifyOtp(phone, code);
      router.push("/");
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
          ? "가입하신 휴대전화번호로 인증번호를 보내드려요."
          : `${phone}로 발송된 인증번호를 입력해주세요.`}
      </p>

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

      <p className="mt-6 text-center text-sm text-muted-foreground">
        아직 계정이 없으신가요?{" "}
        <a href="/signup" className="font-medium text-brand hover:underline">
          회원가입
        </a>
      </p>
    </div>
  );
}
