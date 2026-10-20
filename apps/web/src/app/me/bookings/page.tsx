"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function MyBookingsContent() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("role") === "photographer" ? "photographer" : "customer";
  const [result, setResult] = useState<{
    view: "customer" | "photographer";
    bookings: BookingListItem[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    let active = true;
    apiFetch<BookingListItem[]>(`/bookings?role=${view}`, { token })
      .then((bookings) => {
        if (active) {
          setError(null);
          setResult({ view, bookings });
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : "예약 목록을 불러오지 못했습니다.");
          setResult({ view, bookings: [] });
        }
      });
    return () => {
      active = false;
    };
  }, [authLoading, user, token, router, view]);

  const bookings = result?.view === view ? result.bookings : null;

  if (authLoading || bookings === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-xl font-bold text-foreground">
        {view === "customer" ? "내 예약" : "작가 예약 관리"}
      </h1>
      {user?.role === "photographer" && (
        <div className="mb-6 flex gap-2" role="group" aria-label="예약 종류 선택">
          <button
            type="button"
            onClick={() => router.push("/me/bookings?role=customer")}
            aria-pressed={view === "customer"}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${view === "customer" ? "bg-brand text-white" : "bg-muted text-foreground"}`}
          >
            고객으로 예약한 내역
          </button>
          <button
            type="button"
            onClick={() => router.push("/me/bookings?role=photographer")}
            aria-pressed={view === "photographer"}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${view === "photographer" ? "bg-brand text-white" : "bg-muted text-foreground"}`}
          >
            작가로 받은 예약
          </button>
        </div>
      )}
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

export default function MyBookingsPage() {
  return (
    <Suspense fallback={<div className="flex-1 py-24 text-center">불러오는 중...</div>}>
      <MyBookingsContent />
    </Suspense>
  );
}
