"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { RescheduleRequest } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

export function RescheduleAction({
  bookingId,
  token,
  side,
  pending,
  onDone,
}: {
  bookingId: string;
  token: string | null;
  side: "customer" | "photographer";
  pending: RescheduleRequest | null;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [newShootDatetime, setNewShootDatetime] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/bookings/${bookingId}/reschedule-request`, {
        method: "POST",
        token,
        body: {
          newShootDatetime: newShootDatetime
            ? new Date(newShootDatetime).toISOString()
            : undefined,
          newLocation: newLocation || undefined,
          reason: reason || undefined,
        },
      });
      setOpen(false);
      setNewShootDatetime("");
      setNewLocation("");
      setReason("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "일정 변경 요청에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  async function respond(approve: boolean) {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/bookings/${bookingId}/reschedule-response`, {
        method: "POST",
        token,
        body: { approve },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "응답 처리에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  if (pending) {
    const isRequester = pending.requestedBy === side;
    return (
      <Card className="mt-3 p-4">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          일정 변경 요청
        </h4>
        <div className="text-sm">
          {pending.newShootDatetime && (
            <p>변경 희망 일시: {new Date(pending.newShootDatetime).toLocaleString("ko-KR")}</p>
          )}
          {pending.newLocation && <p>변경 희망 장소: {pending.newLocation}</p>}
          {pending.reason && <p className="text-muted-foreground">사유: {pending.reason}</p>}
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        {isRequester ? (
          <p className="mt-3 text-sm text-muted-foreground">
            상대방의 승인을 기다리고 있어요.
          </p>
        ) : (
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" disabled={isBusy} onClick={() => respond(false)}>
              거절
            </Button>
            <Button size="sm" disabled={isBusy} onClick={() => respond(true)}>
              승인
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-xs text-muted-foreground underline hover:text-foreground"
      >
        일정 변경 요청
      </button>
    );
  }

  return (
    <Card className="mt-3 p-4">
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        일정 변경 요청
      </h4>
      <form onSubmit={submitRequest} className="flex flex-col gap-2">
        <div>
          <Label htmlFor="new-shoot-datetime">변경 희망 일시 (선택)</Label>
          <Input
            id="new-shoot-datetime"
            type="datetime-local"
            value={newShootDatetime}
            onChange={(e) => setNewShootDatetime(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="new-location">변경 희망 장소 (선택)</Label>
          <Input
            id="new-location"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="reschedule-reason">사유 (선택)</Label>
          <Input
            id="reschedule-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="mt-1 flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button type="submit" size="sm" disabled={isBusy}>
            {isBusy ? "요청 중..." : "요청 보내기"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
