"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { BookingListItem, PhotographerUnavailableDate } from "@/lib/types";
import { bookingDate } from "@/lib/studio";
import { koreaToday } from "@/lib/discovery";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateKey(value: string) {
  return value.slice(0, 10);
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const [year, month, day] = getDateKey(value).split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR", options).format(
    new Date(year, month - 1, day),
  );
}

export function AvailabilityManager({
  photographerId,
  token,
  bookings = [],
}: {
  photographerId: string;
  token: string | null;
  bookings?: BookingListItem[];
}) {
  const [dates, setDates] = useState<PhotographerUnavailableDate[] | null>(
    null,
  );
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [year, month] = koreaToday().split("-").map(Number);
    return new Date(year, month - 1, 1);
  });
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<PhotographerUnavailableDate[]>(
        `/photographers/${photographerId}/availability`,
      );
      setDates(result);
      setLoadError(false);
    } catch {
      setDates([]);
      setLoadError(true);
    }
  }, [photographerId]);

  useEffect(() => {
    let active = true;
    apiFetch<PhotographerUnavailableDate[]>(
      `/photographers/${photographerId}/availability`,
    )
      .then((result) => {
        if (!active) return;
        setDates(result);
        setLoadError(false);
      })
      .catch(() => {
        if (!active) return;
        setDates([]);
        setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [photographerId]);

  const todayKey = koreaToday();
  const bookedKeys = new Map<string, number>();
  for (const booking of bookings) {
    const date = bookingDate(booking);
    if (date) bookedKeys.set(date, (bookedKeys.get(date) || 0) + 1);
  }
  const registeredKeys = new Set(
    (dates ?? []).map((item) => getDateKey(item.date)),
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const monthLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(visibleMonth);

  function toggleDate(dateKey: string) {
    setError(null);
    setSuccess(null);
    setSelectedDates((current) =>
      current.includes(dateKey)
        ? current.filter((value) => value !== dateKey)
        : [...current, dateKey].sort(),
    );
  }

  async function saveSelectedDates() {
    if (selectedDates.length === 0) return;
    const datesToSave = selectedDates
      .filter((date) => !bookedKeys.has(date))
      .sort();
    if (!datesToSave.length) {
      setError("예약이 있는 날짜는 휴무일로 저장할 수 없어요.");
      return;
    }
    const saved: string[] = [];
    const failed: string[] = [];
    const failureMessages: string[] = [];
    setIsBusy(true);
    setError(null);
    setSuccess(null);

    for (let index = 0; index < datesToSave.length; index += 1) {
      const date = datesToSave[index];
      setSaveProgress(`저장 중이에요 (${index + 1}/${datesToSave.length})`);
      try {
        await apiFetch("/photographers/me/availability", {
          method: "POST",
          token,
          body: { date, reason: reason.trim() || undefined },
        });
        saved.push(date);
      } catch (err) {
        if (err instanceof ApiError) failureMessages.push(err.message);
        failed.push(date);
      }
    }

    await load();
    setSelectedDates((current) =>
      current.filter((date) => !saved.includes(date)),
    );
    if (saved.length > 0) {
      setSuccess(`${saved.length}일 휴무일을 저장했어요.`);
      setReason("");
    }
    if (failed.length > 0) {
      setError(
        `${failed.map((date) => formatDate(date, { month: "long", day: "numeric" })).join(", ")} 저장에 실패했어요. ${[...new Set(failureMessages)].join(" ") || "다시 시도해주세요."}`,
      );
    }
    setSaveProgress(null);
    setIsBusy(false);
  }

  async function remove(id: string) {
    setIsBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/photographers/me/availability/${id}`, {
        method: "DELETE",
        token,
      });
      await load();
      setSuccess("휴무일을 삭제했어요.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-1 text-base font-semibold text-foreground">
        촬영 일정과 휴무일
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        예약된 촬영을 확인하고, 쉬는 날을 골라 저장하세요. 예약이 있는 날짜는
        선택할 수 없어요.
      </p>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
        <div className="rounded-2xl bg-[var(--muted)] p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
              aria-label="이전 달"
            >
              이전 달
            </button>
            <h3 className="text-base font-semibold text-foreground">
              {monthLabel}
            </h3>
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
              aria-label="다음 달"
            >
              다음 달
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="py-2 text-xs font-medium text-muted-foreground"
              >
                {weekday}
              </div>
            ))}
            {calendarCells.map((day, index) => {
              if (day === null) return <div key={`empty-${index}`} />;
              const dateKey = toDateKey(new Date(year, month, day));
              const isRegistered = registeredKeys.has(dateKey);
              const isSelected = selectedDates.includes(dateKey);
              const isPast = dateKey < todayKey;
              const booked = bookedKeys.get(dateKey) || 0;
              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={
                    isPast ||
                    isRegistered ||
                    booked > 0 ||
                    isBusy ||
                    loadError ||
                    dates === null
                  }
                  aria-pressed={isSelected}
                  aria-label={`${formatDate(dateKey, { month: "long", day: "numeric" })}${isRegistered ? " 휴무 등록됨" : booked ? ` 촬영 예약 ${booked}건` : isSelected ? " 선택됨" : ""}`}
                  onClick={() => toggleDate(dateKey)}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-lg border text-sm transition-colors disabled:cursor-not-allowed sm:min-h-16 ${
                    isSelected
                      ? "border-brand bg-brand text-brand-foreground"
                      : booked
                        ? "border-brand bg-brand-muted text-brand"
                        : isRegistered
                          ? "border-border bg-muted text-muted-foreground line-through"
                          : isPast
                            ? "border-transparent text-muted-foreground/50"
                            : dateKey === todayKey
                              ? "border-brand text-brand hover:bg-brand-muted"
                              : "border-transparent text-foreground hover:bg-muted"
                  }`}
                  title={
                    booked
                      ? `촬영 예약 ${booked}건`
                      : isRegistered
                        ? "이미 등록한 휴무일"
                        : undefined
                  }
                >
                  <span>{day}</span>
                  {booked > 0 && (
                    <span className="mt-1 text-[10px]">예약 {booked}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-[var(--brand-muted)] ring-1 ring-[var(--brand)]" />
              촬영 예약
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-brand bg-brand" />{" "}
              선택한 날짜
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-border bg-muted" />{" "}
              이미 등록됨
            </span>
          </div>
        </div>

        <div className="mt-5 lg:mt-0">
          <p className="mb-2 text-sm font-medium text-foreground">
            선택한 날짜 {selectedDates.length}일
          </p>
          {selectedDates.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {selectedDates.map((date) => (
                <button
                  key={date}
                  type="button"
                  disabled={isBusy}
                  onClick={() => toggleDate(date)}
                  className="rounded-full bg-brand-muted px-3 py-1.5 text-sm text-brand hover:opacity-80 disabled:opacity-50"
                  aria-label={`${formatDate(date, { month: "long", day: "numeric" })} 선택 취소`}
                >
                  {formatDate(date, { month: "long", day: "numeric" })} ×
                </button>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">
              달력에서 날짜를 눌러 선택하세요.
            </p>
          )}

          <div className="mb-4">
            <Label htmlFor="avail-reason">휴무 사유 (선택)</Label>
            <Input
              id="avail-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="예: 개인 일정"
              disabled={isBusy}
            />
          </div>
          <Button
            type="button"
            disabled={isBusy || selectedDates.length === 0 || loadError}
            onClick={saveSelectedDates}
            className="w-full sm:w-auto"
          >
            {saveProgress ?? `선택한 날짜 ${selectedDates.length}일 저장`}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 text-sm text-brand" role="status">
          {success}
        </p>
      )}
      {loadError && (
        <p className="mt-3 text-sm text-danger" role="alert">
          등록된 휴무일을 불러오지 못했어요.{" "}
          <button
            type="button"
            className="sf-link font-semibold"
            onClick={load}
          >
            다시 불러오기
          </button>
        </p>
      )}

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          등록된 휴무일
        </h3>
        {dates === null ? (
          <p className="text-sm text-muted-foreground">불러오는 중이에요.</p>
        ) : dates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            등록된 휴무일이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...dates]
              .sort((a, b) =>
                getDateKey(a.date).localeCompare(getDateKey(b.date)),
              )
              .map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2"
                >
                  <span className="text-sm text-foreground">
                    {formatDate(item.date, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                    {item.reason ? ` · ${item.reason}` : ""}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isBusy}
                    onClick={() => remove(item.id)}
                    aria-label={`${formatDate(item.date, { month: "long", day: "numeric" })} 휴무 삭제`}
                  >
                    삭제
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
