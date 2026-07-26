"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminBookingListItem, BookingStatus } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

const STATUS_LABEL: Record<BookingStatus, string> = {
  inquiry: "문의 접수",
  quoted: "견적 제시됨",
  held: "예약금 대기",
  deposit_paid: "예약금 완료",
  confirmed: "잔금 완료",
  completed: "촬영 완료",
  delivered: "사진 전달됨",
  closed: "종료",
  cancelled: "취소됨",
  disputed: "분쟁 중",
};

const STATUS_OPTIONS: { value: BookingStatus | ""; label: string }[] = [
  { value: "", label: "전체" },
  { value: "inquiry", label: "문의 접수" },
  { value: "quoted", label: "견적 제시됨" },
  { value: "held", label: "예약금 대기" },
  { value: "deposit_paid", label: "예약금 완료" },
  { value: "confirmed", label: "잔금 완료" },
  { value: "completed", label: "촬영 완료" },
  { value: "delivered", label: "사진 전달됨" },
  { value: "closed", label: "종료" },
  { value: "cancelled", label: "취소됨" },
  { value: "disputed", label: "분쟁 중" },
];

export default function AdminBookingsPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [items, setItems] = useState<AdminBookingListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    const qs = status ? `?status=${status}` : "";
    apiFetch<AdminBookingListItem[]>(`/admin/bookings${qs}`, { token })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "예약 목록을 불러오지 못했습니다."),
      );
  }, [status, token]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {STATUS_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setStatus(o.value)}
            className={`rounded-full px-3 py-1 font-medium ${
              status === o.value
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {items === null ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-brand" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          해당하는 예약이 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((b) => (
            <Link key={b.id} href={`/admin/bookings/${b.id}`}>
              <Card className="flex items-center justify-between p-4 hover:shadow-md">
                <div>
                  <p className="font-medium text-foreground">
                    {b.customer.name} → {b.photographer.businessName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {b.location ?? "장소 미정"} ·{" "}
                    {b.shootDatetime
                      ? new Date(b.shootDatetime).toLocaleString("ko-KR")
                      : "일정 미정"}
                  </p>
                </div>
                <div className="text-right">
                  <Badge>{STATUS_LABEL[b.status]}</Badge>
                  {b.totalAmount !== null && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {b.totalAmount.toLocaleString()}원
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
