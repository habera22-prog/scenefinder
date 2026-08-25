"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { CaptureMode } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function BusinessInquiryPage() {
  const [captureModes, setCaptureModes] = useState<CaptureMode[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [location, setLocation] = useState("");
  const [purpose, setPurpose] = useState("");
  const [captureModeCode, setCaptureModeCode] = useState("");
  const [expectedDurationMin, setExpectedDurationMin] = useState("");
  const [expectedHeadcount, setExpectedHeadcount] = useState("");
  const [deliverableUsage, setDeliverableUsage] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [taxInvoiceRequired, setTaxInvoiceRequired] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    apiFetch<CaptureMode[]>("/capture-modes").then(setCaptureModes).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/inquiries/corporate", {
        method: "POST",
        body: {
          companyName,
          contactName,
          phone,
          email,
          shootDate: shootDate || undefined,
          location: location || undefined,
          purpose: purpose || undefined,
          captureModeCode: captureModeCode || undefined,
          expectedDurationMin: expectedDurationMin ? Number(expectedDurationMin) : undefined,
          expectedHeadcount: expectedHeadcount ? Number(expectedHeadcount) : undefined,
          deliverableUsage: deliverableUsage || undefined,
          budgetRange: budgetRange || undefined,
          taxInvoiceRequired,
          notes: notes || undefined,
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
          <h1 className="mb-2 text-xl font-bold text-foreground">문의가 접수됐어요</h1>
          <p className="text-sm text-muted-foreground">
            담당자가 확인 후 입력하신 이메일 또는 연락처로 안내드릴게요.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-16 sm:px-6">
      <Card className="p-6">
        <h1 className="mb-1 text-xl font-bold text-foreground">기업·기관 맞춤촬영 문의</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          일반 예약과 별도로 접수되며, 담당자가 확인 후 별도로 연락드려요. 세금계산서 발행이
          필요한 경우 사업자 인증 작가로 배정됩니다.
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="companyName">회사/기관명</Label>
              <Input id="companyName" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="contactName">담당자명</Label>
              <Input id="contactName" required value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">연락처</Label>
              <Input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="shootDate">촬영일</Label>
              <Input id="shootDate" type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="location">촬영 장소</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="purpose">촬영 목적</Label>
            <Input id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="captureMode">촬영 방식</Label>
            <select
              id="captureMode"
              value={captureModeCode}
              onChange={(e) => setCaptureModeCode(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">선택 안 함</option>
              {captureModes.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="expectedDurationMin">촬영 예상 시간(분)</Label>
              <Input
                id="expectedDurationMin"
                type="number"
                value={expectedDurationMin}
                onChange={(e) => setExpectedDurationMin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="expectedHeadcount">예상 인원</Label>
              <Input
                id="expectedHeadcount"
                type="number"
                value={expectedHeadcount}
                onChange={(e) => setExpectedHeadcount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="deliverableUsage">결과물 용도</Label>
            <Input id="deliverableUsage" value={deliverableUsage} onChange={(e) => setDeliverableUsage(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="budgetRange">예산 범위</Label>
            <Input
              id="budgetRange"
              placeholder="예: 100~200만원"
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={taxInvoiceRequired}
              onChange={(e) => setTaxInvoiceRequired(e.target.checked)}
            />
            세금계산서 발행이 필요해요
          </label>
          <div>
            <Label htmlFor="notes">기타 요청사항</Label>
            <Textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "제출 중..." : "문의 접수하기"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
