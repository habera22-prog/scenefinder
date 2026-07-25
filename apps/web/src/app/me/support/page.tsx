"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SupportTicket, SupportTicketCategory } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const CATEGORY_OPTIONS: { value: SupportTicketCategory; label: string }[] = [
  { value: "general", label: "1:1 문의" },
  { value: "payment", label: "결제 문의" },
  { value: "booking_change", label: "예약 변경" },
  { value: "cancellation_refund", label: "취소·환불" },
  { value: "photographer_report", label: "작가 신고" },
  { value: "delivery_dispute", label: "결과물 분쟁" },
  { value: "photo_deletion", label: "사진 삭제 요청" },
  { value: "privacy", label: "개인정보 문의" },
  { value: "partnership", label: "제휴 문의" },
  { value: "other", label: "기타" },
];

const STATUS_LABEL: Record<SupportTicket["status"], string> = {
  open: "접수됨",
  answered: "답변 완료",
  closed: "종료",
};

export default function SupportPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [category, setCategory] = useState<SupportTicketCategory>("general");
  const [content, setContent] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function load() {
    apiFetch<SupportTicket[]>("/customers/me/support-tickets", { token })
      .then(setTickets)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "문의 내역을 불러오지 못했습니다."),
      );
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, token, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch(isEmergency ? "/support/emergency" : "/support/tickets", {
        method: "POST",
        token,
        body: { category, content },
      });
      setContent("");
      setIsEmergency(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "문의 접수에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || tickets === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-xl font-bold text-foreground">고객센터 문의</h1>

      <Card className="p-4">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              문의 유형
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
              className="w-full rounded-lg border border-border bg-card p-2 text-sm focus:border-brand focus:outline-none"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="문의하실 내용을 입력해주세요."
              className="w-full rounded-lg border border-border bg-card p-2 text-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
            />
            긴급 문의 (촬영 전날/당일 — 작가 미연락, 노쇼, 장소 급변경, 기상 문제 등)
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={isSubmitting || !content.trim()}>
            {isSubmitting ? "접수 중..." : "문의 접수하기"}
          </Button>
        </form>
      </Card>

      <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        내 문의 내역
      </h2>
      {tickets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          접수한 문의가 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {CATEGORY_OPTIONS.find((c) => c.value === t.category)?.label ?? t.category}
                  {t.isEmergency && <span className="ml-2 text-danger">긴급</span>}
                </p>
                <Badge>{STATUS_LABEL[t.status]}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.content}</p>
              {t.adminResponse && (
                <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    고객센터 답변
                  </p>
                  {t.adminResponse}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
