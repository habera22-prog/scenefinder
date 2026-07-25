"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminSupportTicket, SupportTicketCategory } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const CATEGORY_LABEL: Record<SupportTicketCategory, string> = {
  general: "1:1 문의",
  payment: "결제 문의",
  booking_change: "예약 변경",
  cancellation_refund: "취소·환불",
  photographer_report: "작가 신고",
  delivery_dispute: "결과물 분쟁",
  photo_deletion: "사진 삭제 요청",
  privacy: "개인정보 문의",
  partnership: "제휴 문의",
  other: "기타",
};

const STATUS_LABEL: Record<AdminSupportTicket["status"], string> = {
  open: "접수됨",
  answered: "답변 완료",
  closed: "종료",
};

function RespondForm({
  ticket,
  token,
  onDone,
}: {
  ticket: AdminSupportTicket;
  token: string | null;
  onDone: () => void;
}) {
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function submit() {
    if (!response.trim()) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/support-tickets/${ticket.id}/respond`, {
        method: "POST",
        token,
        body: { response },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "답변 등록에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={2}
        placeholder="답변 내용을 입력해주세요."
        className="rounded-lg border border-border bg-card p-2 text-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button size="sm" disabled={isBusy || !response.trim()} onClick={submit}>
        {isBusy ? "등록 중..." : "답변 등록"}
      </Button>
    </div>
  );
}

export default function AdminSupportPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AdminSupportTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<AdminSupportTicket[]>("/admin/support-tickets", { token })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "문의 목록을 불러오지 못했습니다."),
      );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (items === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          접수된 문의가 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {t.user.name} ({t.user.role === "photographer" ? "작가" : "고객"})
                    {t.isEmergency && (
                      <span className="ml-2 text-sm text-danger">긴급</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {CATEGORY_LABEL[t.category]} ·{" "}
                    {new Date(t.createdAt).toLocaleString("ko-KR")}
                  </p>
                </div>
                <Badge>{STATUS_LABEL[t.status]}</Badge>
              </div>
              <p className="mt-2 text-sm text-foreground">{t.content}</p>
              {t.status === "open" ? (
                <RespondForm ticket={t} token={token} onDone={load} />
              ) : (
                t.adminResponse && (
                  <p className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">
                    답변: {t.adminResponse}
                  </p>
                )
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
