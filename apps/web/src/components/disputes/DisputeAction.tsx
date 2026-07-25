"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Dispute, DisputeType } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const TYPE_OPTIONS: { value: DisputeType; label: string }[] = [
  { value: "quality", label: "사진 품질 문제" },
  { value: "noshow", label: "노쇼·지각" },
  { value: "delay", label: "납품 지연" },
  { value: "other", label: "기타" },
];

const STEPS = [
  { key: "open", label: "① 접수완료" },
  { key: "fact_check_requested", label: "② 작가 사실확인 요청 (24h 내 응답)" },
  { key: "resolved_pending", label: "③ 관리자 조정" },
  { key: "resolved", label: "④ 해결(환불/보상/재촬영)" },
] as const;

function stepIndex(status: Dispute["status"]) {
  if (status === "resolved") return 3;
  if (status === "fact_check_requested") return 1;
  if (status === "escalated") return 2;
  return 0;
}

function DisputeProgress({ dispute }: { dispute: Dispute }) {
  const current = stepIndex(dispute.status);
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="mb-2 text-xs font-medium text-foreground">
        {TYPE_OPTIONS.find((t) => t.value === dispute.type)?.label ?? dispute.type}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              i <= current
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>
      {dispute.status !== "resolved" && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          해당 예약 건 정산은 분쟁 해결 전까지 자동 보류됩니다.
        </p>
      )}
      {dispute.resolution && (
        <p className="mt-2 text-xs text-foreground">조정 결과: {dispute.resolution}</p>
      )}
    </div>
  );
}

export function DisputeAction({
  bookingId,
  token,
  onReported,
}: {
  bookingId: string;
  token: string | null;
  onReported: () => void;
}) {
  const [disputes, setDisputes] = useState<Dispute[] | null>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DisputeType>("quality");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  function load() {
    apiFetch<Dispute[]>(`/bookings/${bookingId}/disputes`, { token })
      .then(setDisputes)
      .catch(() => setDisputes([]));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, token]);

  async function submit() {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/bookings/${bookingId}/disputes`, {
        method: "POST",
        token,
        body: { type },
      });
      setOpen(false);
      load();
      onReported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "분쟁 접수에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  const hasActiveDispute = (disputes ?? []).some((d) => d.status !== "resolved");

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        분쟁 신고
      </h3>

      {disputes && disputes.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {disputes.map((d) => (
            <DisputeProgress key={d.id} dispute={d} />
          ))}
        </div>
      )}

      {!hasActiveDispute && !open && (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-muted-foreground underline hover:text-danger"
        >
          촬영 결과물·이행 문제 신고하기
        </button>
      )}

      {open && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">신고 유형을 선택해주세요.</p>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  type === opt.value
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            소통방 대화 내역은 자동으로 첨부되어 관리자가 함께 확인합니다.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="mt-1 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
              닫기
            </Button>
            <Button size="sm" variant="danger" disabled={isBusy} onClick={submit}>
              {isBusy ? "접수 중..." : "분쟁 접수하기"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
