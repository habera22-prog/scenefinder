"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { rememberAuthReturn } from "@/lib/auth-return";
import { useAuth } from "@/lib/auth-context";
import {
  bookingDate,
  RESERVED_STATUSES,
  STUDIO_NEXT_ACTION,
} from "@/lib/studio";
import { koreaToday } from "@/lib/discovery";
import type { BookingListItem, BookingStatus } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const STATUS_LABEL: Record<BookingStatus, string> = {
  inquiry: "문의 중",
  quoted: "견적 도착",
  held: "예약금 대기",
  deposit_paid: "예약금 결제 완료",
  confirmed: "촬영 예정",
  completed: "사진 준비 중",
  delivered: "사진 도착",
  closed: "촬영 완료",
  cancelled: "취소됨",
  disputed: "문제 해결 중",
};
const NEXT_STEP: Record<BookingStatus, string> = {
  inquiry: "작가에게 메시지를 보내고 촬영을 상담하세요.",
  quoted: "도착한 견적과 촬영 조건을 확인해주세요.",
  held: "견적을 수락했어요. 예약금을 결제해주세요.",
  deposit_paid: "촬영 전 잔금과 최종 조건을 확인해주세요.",
  confirmed: "정해진 날짜에 작가와 만나요.",
  completed: "작가가 촬영한 사진을 준비하고 있어요.",
  delivered: "도착한 사진을 확인해주세요.",
  closed: "사진을 확인하고 촬영 후기를 남겨보세요.",
  cancelled: "취소 내역은 예약 상세에서 확인할 수 있어요.",
  disputed: "예약 상세에서 처리 내용을 확인해주세요.",
};

function MyBookingsContent() {
  const { user, token, isLoading, setWorkspaceMode } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const view =
    params.get("role") === "photographer" ? "photographer" : "customer";
  const [result, setResult] = useState<{
    key: string;
    bookings: BookingListItem[];
    error: string | null;
  } | null>(null);
  const filter = params.get("status") || "all";
  function setFilter(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("role", view);
    if (value === "all") next.delete("status");
    else next.set("status", value);
    router.replace(`/me/bookings?${next}`, { scroll: false });
  }
  const [refresh, setRefresh] = useState(0);
  const key = `${user?.id}:${view}:${refresh}`;
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      rememberAuthReturn(`/me/bookings?role=${view}`);
      router.replace("/login");
      return;
    }
    let active = true;
    apiFetch<BookingListItem[]>(`/bookings?role=${view}`, { token })
      .then((bookings) => {
        if (active) {
          setResult({ key, bookings, error: null });
          setWorkspaceMode(view);
        }
      })
      .catch((err) => {
        if (active)
          setResult({
            key,
            bookings: [],
            error:
              err instanceof ApiError
                ? err.message
                : "예약 내역을 불러오지 못했어요.",
          });
      });
    return () => {
      active = false;
    };
  }, [isLoading, user, token, router, view, key, setWorkspaceMode]);
  const loaded = result?.key === key ? result : null;
  const bookings = loaded?.bookings.filter(
    (b) =>
      filter === "all" ||
      (filter === "ongoing"
        ? !["closed", "cancelled"].includes(b.status)
        : filter === "finished"
          ? ["closed", "cancelled"].includes(b.status)
          : filter === "today"
            ? RESERVED_STATUSES.includes(b.status) &&
              bookingDate(b) === koreaToday()
            : filter === "upcoming"
              ? RESERVED_STATUSES.includes(b.status) &&
                bookingDate(b) >= koreaToday()
              : b.status === filter),
  );
  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-9 pb-12 lg:max-w-[1200px] lg:px-8 lg:pt-12">
      <p className="mb-2 text-sm font-semibold text-[var(--brand-text)]">
        {view === "customer"
          ? "문의부터 사진 받기까지 한곳에서"
          : "고객과 함께하는 촬영"}
      </p>
      <h1 className="text-[26px] font-bold">
        {view === "customer" ? "내 예약" : "작가 예약 관리"}
      </h1>
      {user?.role === "photographer" && view === "customer" && (
        <div className="mt-5" role="group" aria-label="예약 종류">
          <button
            type="button"
            aria-label="작가 예약 보기"
            onClick={() => router.push("/me/bookings?role=photographer")}
            className="sf-button-secondary rounded-xl px-4 py-3 text-sm font-semibold"
          >
            작가 문의·예약 보기
          </button>
        </div>
      )}
      <div
        className="mt-6 mb-5 flex flex-wrap gap-2"
        role="group"
        aria-label="예약 상태"
      >
        {[
          { code: "all", label: "전체" },
          ...(view === "photographer"
            ? [
                { code: "inquiry", label: "답변할 문의" },
                { code: "quoted", label: "보낸 견적" },
                { code: "today", label: "오늘 촬영" },
                { code: "completed", label: "사진 전달 대기" },
              ]
            : []),
          { code: "ongoing", label: "진행 중" },
          { code: "finished", label: "완료·취소" },
        ].map((f) => (
          <button
            key={f.code}
            type="button"
            aria-pressed={filter === f.code}
            onClick={() => setFilter(f.code)}
            className="sf-choice rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            {f.label}
          </button>
        ))}
      </div>
      {!loaded ? (
        <div
          className="h-48 animate-pulse rounded-2xl bg-[var(--card)]"
          role="status"
          aria-label="예약 내역을 불러오는 중"
        />
      ) : loaded.error ? (
        <Card className="p-6">
          <p role="alert" className="text-sm text-[var(--danger)]">
            {loaded.error}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => setRefresh(refresh + 1)}
          >
            다시 불러오기
          </Button>
        </Card>
      ) : bookings?.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon
            name="calendar"
            className="mx-auto mb-4 h-10 w-10 text-[var(--brand-text)]"
          />
          <h2 className="text-lg font-bold">
            {filter === "all"
              ? view === "photographer"
                ? "아직 받은 촬영 문의가 없어요"
                : "아직 예약한 촬영이 없어요"
              : "이 상태의 예약이 없어요"}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {view === "customer"
              ? "마음에 드는 작가에게 촬영을 문의해보세요."
              : "새로운 촬영 문의가 오면 여기에 표시돼요."}
          </p>
          {view === "customer" && (
            <Link
              href="/photographers"
              className={`${buttonStyles("primary")} mt-5 w-full`}
            >
              내 촬영 작가 찾기
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-5">
          {bookings?.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}?role=${view}`}
              className="sf-card sf-card-hover block rounded-2xl bg-[var(--card)] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge>{STATUS_LABEL[b.status]}</Badge>
                <Icon
                  name="chevron"
                  className="h-4 w-4 text-[var(--muted-foreground)]"
                />
              </div>
              <h2 className="mt-3 text-lg font-bold">
                {view === "customer"
                  ? b.photographer?.businessName ||
                    b.photographer?.user.name ||
                    "사진작가"
                  : b.customer?.name || "고객"}
                {b.shootCategory ? ` · ${b.shootCategory.label} 촬영` : ""}
              </h2>
              <p className="mt-2 flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                <Icon name="calendar" className="h-4 w-4 shrink-0" />
                {b.shootDatetime
                  ? new Date(b.shootDatetime).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "일정 미정"}
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                <Icon name="pin" className="h-4 w-4 shrink-0" />
                {b.location || "장소 미정"}
              </p>
              {b.totalAmount !== null && (
                <p className="mt-3 font-semibold">
                  {b.totalAmount.toLocaleString()}원
                </p>
              )}
              <p className="mt-4 rounded-xl bg-[var(--muted)] p-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {view === "customer"
                  ? NEXT_STEP[b.status]
                  : STUDIO_NEXT_ACTION[b.status]}
              </p>
              {view === "photographer" && b.status === "inquiry" && (
                <span className="sf-link mt-3 inline-flex items-center gap-1 text-sm font-semibold">
                  문의 열고 견적 작성하기
                  <Icon name="chevron" className="h-4 w-4" />
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center">예약 내역을 준비하고 있어요</p>
      }
    >
      <MyBookingsContent />
    </Suspense>
  );
}
