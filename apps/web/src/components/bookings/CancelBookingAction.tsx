"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface CancellationOutcome {
  fault: "customer" | "photographer";
  ruleApplied: string;
  refundAmount: number;
  compensationAmount: number | null;
  requiresAdminReview: boolean;
}

export function CancelBookingAction({
  bookingId,
  token,
  initiatedBy,
  onCancelled,
}: {
  bookingId: string;
  token: string | null;
  initiatedBy: "customer" | "photographer";
  onCancelled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<CancellationOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function loadPreview() {
    setError(null);
    setIsBusy(true);
    try {
      const data = await apiFetch<CancellationOutcome>(
        `/bookings/${bookingId}/cancellation-preview?initiatedBy=${initiatedBy}`,
        { token },
      );
      setPreview(data);
      setOpen(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "취소 조건을 불러오지 못했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  async function confirmCancel() {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/bookings/${bookingId}/cancel`, {
        method: "POST",
        token,
        body: { initiatedBy },
      });
      onCancelled();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "취소 처리에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-3">
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <button
          onClick={loadPreview}
          disabled={isBusy}
          className="text-xs text-muted-foreground underline hover:text-danger"
        >
          예약 취소하기
        </button>
      </div>
    );
  }

  return (
    <Card className="mt-3 p-4">
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        취소 시 예상 결과
      </h4>
      {preview && (
        <div className="text-sm">
          <p className="text-muted-foreground">{preview.ruleApplied}</p>
          <p className="mt-2">환불 예정액: {preview.refundAmount.toLocaleString()}원</p>
          {preview.compensationAmount !== null && (
            <p>고객 보상액: {preview.compensationAmount.toLocaleString()}원</p>
          )}
          {preview.requiresAdminReview && (
            <p className="mt-2 text-danger">
              촬영 개시 이후 건은 자동 취소가 불가해요. 분쟁 접수를 이용해주세요.
            </p>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
          닫기
        </Button>
        {!preview?.requiresAdminReview && (
          <Button size="sm" variant="danger" disabled={isBusy} onClick={confirmCancel}>
            {isBusy ? "처리 중..." : "취소 확정하기"}
          </Button>
        )}
      </div>
    </Card>
  );
}
