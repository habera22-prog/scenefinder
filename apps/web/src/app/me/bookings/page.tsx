"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BookingListItem, BookingStatus } from "@/lib/types";
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

export default function MyBookingsPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    const role = user.role === "photographer" ? "photographer" : "customer";
    apiFetch<BookingListItem[]>(`/bookings?role=${role}`, { token })
      .then(setBookings)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "예약 목록을 불러오지 못했습니다."),
      );
  }, [authLoading, user, token, router]);

  if (authLoading || bookings === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-xl font-bold text-foreground">내 예약</h1>
      {error && <p className="text-sm text-danger">{error}</p>}
      {bookings.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          아직 예약 내역이 없어요.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <a key={b.id} href={`/bookings/${b.id}`}>
            <Card className="flex items-center justify-between p-4 hover:shadow-md">
              <div>
                <p className="font-medium text-foreground">
                  {b.location ?? "장소 미정"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {b.shootDatetime
                    ? new Date(b.shootDatetime).toLocaleString("ko-KR")
                    : "일정 미정"}
                </p>
              </div>
              <div className="text-right">
                <Badge>{STATUS_LABEL[b.status] ?? b.status}</Badge>
                {b.totalAmount !== null && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {b.totalAmount.toLocaleString()}원
                  </p>
                )}
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
