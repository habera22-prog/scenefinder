"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { PhotographerUnavailableDate } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function AvailabilityManager({
  photographerId,
  token,
}: {
  photographerId: string;
  token: string | null;
}) {
  const [dates, setDates] = useState<PhotographerUnavailableDate[] | null>(null);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  function load() {
    apiFetch<PhotographerUnavailableDate[]>(`/photographers/${photographerId}/availability`)
      .then(setDates)
      .catch(() => setDates([]));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photographerId]);

  async function add() {
    if (!date) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch("/photographers/me/availability", {
        method: "POST",
        token,
        body: { date, reason: reason || undefined },
      });
      setDate("");
      setReason("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "휴무일 등록에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  async function remove(id: string) {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/photographers/me/availability/${id}`, { method: "DELETE", token });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        휴무일 관리
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        등록한 날짜에는 고객이 촬영 문의를 넣을 수 없어요.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="avail-date">날짜</Label>
          <Input
            id="avail-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="avail-reason">사유 (선택)</Label>
          <Input
            id="avail-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 개인 사정"
          />
        </div>
        <Button size="sm" disabled={isBusy || !date} onClick={add}>
          휴무일 추가
        </Button>
      </div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      {dates === null ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : dates.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 휴무일이 없어요.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {dates.map((d) => (
            <Badge key={d.id} className="flex items-center gap-2">
              {new Date(d.date).toLocaleDateString("ko-KR")}
              {d.reason ? ` · ${d.reason}` : ""}
              <button
                onClick={() => remove(d.id)}
                disabled={isBusy}
                className="text-brand hover:opacity-70"
                aria-label="삭제"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
