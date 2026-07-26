"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Booking } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function CouponApply({
  booking,
  token,
  onDone,
}: {
  booking: Booking;
  token: string | null;
  onDone: () => void;
}) {
  const [code, setCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applied = booking.couponRedemption;

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/bookings/${booking.id}/coupon`, {
        method: "POST",
        token,
        body: { code: code.trim() },
      });
      setCode("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "쿠폰 적용에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  async function cancel() {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/bookings/${booking.id}/coupon`, { method: "DELETE", token });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "쿠폰 취소에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  if (applied) {
    return (
      <div className="rounded-lg bg-brand-muted p-3 text-sm text-brand">
        <p>
          쿠폰 할인 -{applied.discountAmount.toLocaleString()}원 적용됨
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={isBusy}
          onClick={cancel}
          className="mt-2"
        >
          쿠폰 취소
        </Button>
        {error && <p className="mt-2 text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={apply} className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="쿠폰 코드 입력"
        className="min-w-0 flex-1"
      />
      <Button type="submit" size="sm" variant="secondary" disabled={isBusy} className="shrink-0">
        적용
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </form>
  );
}
