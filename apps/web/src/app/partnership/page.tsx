"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const COMPANY_TYPES = [
  "여행사",
  "행사대행사",
  "호텔",
  "웨딩업체",
  "스튜디오",
  "드론업체",
  "촬영업체",
  "광고/마케팅 업체",
  "기타",
];

export default function PartnershipPage() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [collaborationType, setCollaborationType] = useState("");
  const [proposal, setProposal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/inquiries/partnership", {
        method: "POST",
        body: {
          companyName,
          contactName,
          phone,
          email,
          companyType,
          collaborationType: collaborationType || undefined,
          proposal,
        },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "문의 접수에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-16 sm:px-6">
        <Card className="p-8 text-center">
          <h1 className="mb-2 text-xl font-bold text-foreground">제휴 제안이 접수됐어요</h1>
          <p className="text-sm text-muted-foreground">
            담당자가 검토 후 입력하신 연락처로 안내드릴게요.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-16 sm:px-6">
      <Card className="p-6">
        <h1 className="mb-1 text-xl font-bold text-foreground">제휴 문의</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          여행사·행사대행사·호텔·웨딩업체 등 외부 업체의 제휴 제안을 받고 있어요.
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="companyName">업체명</Label>
              <Input id="companyName" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="contactName">담당자</Label>
              <Input id="contactName" required value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">전화번호</Label>
              <Input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="companyType">업체 유형</Label>
            <select
              id="companyType"
              required
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">선택하세요</option>
              {COMPANY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="collaborationType">협업 희망 형태</Label>
            <Input
              id="collaborationType"
              placeholder="예: 패키지 공동 판매, 상시 촬영팀 연계"
              value={collaborationType}
              onChange={(e) => setCollaborationType(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="proposal">제안 내용</Label>
            <Textarea
              id="proposal"
              required
              rows={5}
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "제출 중..." : "제휴 제안하기"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
