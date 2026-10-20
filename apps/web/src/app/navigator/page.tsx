"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import type { CaptureMode, ShootCategory } from "@/lib/types";
import { CATEGORY_DETAILS, koreaToday } from "@/lib/discovery";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

export default function NavigatorPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ShootCategory[] | null>(null);
  const [captureModes, setCaptureModes] = useState<CaptureMode[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("");
  const [captureMode, setCaptureMode] = useState("");
  const [region, setRegion] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch<ShootCategory[]>("/shoot-categories")
      .then((data) => {
        if (active) {
          setCategories(data);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (active)
          setLoadError(
            err instanceof ApiError
              ? err.message
              : "촬영 종류를 불러오지 못했어요. 다시 시도해주세요.",
          );
      });
    apiFetch<CaptureMode[]>("/capture-modes")
      .then((data) => {
        if (active) setCaptureModes(data);
      })
      .catch(() => {});
    apiFetch<string[]>("/photographers/regions")
      .then((data) => {
        if (active) setRegions(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refresh]);

  function goToResults(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ category });
    if (captureMode) params.set("captureMode", captureMode);
    if (region) params.set("region", region);
    if (date) params.set("date", date);
    router.push(`/photographers?${params}`);
  }
  const selected = categories?.find((c) => c.code === category);

  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-9 pb-12">
      <Link
        href={step === 1 ? "/" : "#"}
        onClick={(e) => {
          if (step === 2) {
            e.preventDefault();
            setStep(1);
          }
        }}
        className="sf-tab mb-7 inline-flex items-center gap-1 text-sm"
      >
        <Icon name="back" className="h-4 w-4" />
        {step === 1 ? "홈으로" : "촬영 종류 다시 고르기"}
      </Link>
      <div className="mb-6 flex items-center justify-between text-sm">
        <span className="font-semibold text-[var(--brand-text)]">
          내 촬영에 맞게 찾기
        </span>
        <span className="text-[var(--muted-foreground)]">{step} / 2</span>
      </div>
      <div
        className="mb-8 grid grid-cols-2 gap-2"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={2}
        aria-valuenow={step}
        aria-label="작가 찾기 진행 단계"
      >
        <div className="h-1 rounded-full bg-[var(--brand)]" />
        <div
          className={`h-1 rounded-full ${step === 2 ? "bg-[var(--brand)]" : "bg-[var(--border)]"}`}
        />
      </div>

      {step === 1 ? (
        <section>
          <h1 className="text-[26px] leading-snug font-bold">
            어떤 순간을
            <br />
            사진으로 남기고 싶으세요?
          </h1>
          <p className="mt-3 text-[17px] text-[var(--muted-foreground)]">
            원하는 촬영을 하나 골라주세요.
          </p>
          {loadError && (
            <Card className="mt-6 p-5">
              <p role="alert" className="text-sm text-[var(--danger)]">
                {loadError}
              </p>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => setRefresh(refresh + 1)}
              >
                다시 불러오기
              </Button>
            </Card>
          )}
          {!categories && !loadError && (
            <div role="status" className="py-12">
              <Spinner className="h-7 w-7 text-[var(--brand)]" />
              <span className="sr-only">촬영 종류 불러오는 중</span>
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {categories?.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={category === item.code}
                onClick={() => setCategory(item.code)}
                className="sf-choice min-h-32 rounded-2xl p-5 text-left"
              >
                <Icon
                  name={CATEGORY_DETAILS[item.code]?.icon || "camera"}
                  className="mb-3 h-6 w-6 text-[var(--brand-text)]"
                />
                <span className="block text-[17px] font-semibold">
                  {item.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-[var(--muted-foreground)]">
                  {CATEGORY_DETAILS[item.code]?.description ||
                    "나에게 맞는 촬영 작가 찾기"}
                </span>
              </button>
            ))}
          </div>
          {categories?.length === 0 && (
            <p className="mt-6 text-[var(--muted-foreground)]">
              촬영 종류를 준비하고 있어요. 전체 작가를 먼저 둘러보세요.
            </p>
          )}
          <Button
            size="lg"
            className="mt-7 w-full"
            disabled={!category}
            onClick={() => {
              setStep(2);
              window.scrollTo({ top: 0 });
            }}
          >
            다음
            <Icon name="arrow" />
          </Button>
          <Link
            href="/photographers"
            className="sf-link mt-5 block text-center text-sm"
          >
            전체 작가 먼저 둘러보기
          </Link>
        </section>
      ) : (
        <form onSubmit={goToResults}>
          <h1 className="text-[26px] leading-snug font-bold">
            어디에서, 언제
            <br />
            촬영하고 싶으세요?
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-[var(--muted-foreground)]">
            아직 정하지 않았다면 비워두세요.
            <br />
            작가와 상담하면서 정해도 괜찮아요.
          </p>
          <Card className="mt-6 flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-muted)] text-[var(--brand-text)]">
              <Icon name={CATEGORY_DETAILS[category]?.icon || "camera"} />
            </span>
            <div className="flex-1">
              <p className="text-xs text-[var(--muted-foreground)]">
                선택한 촬영
              </p>
              <p className="font-semibold">{selected?.label}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              변경
            </Button>
          </Card>
          <div className="mt-6 space-y-6">
            <div>
              <Label htmlFor="region">촬영 지역</Label>
              <select
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="sf-input min-h-13 w-full rounded-xl px-4 py-3.5 text-base"
              >
                <option value="">전체 지역</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="date">희망 날짜</Label>
              <Input
                id="date"
                type="date"
                min={koreaToday()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                선택한 날짜가 휴무인 작가는 제외해요.
                <br />
                촬영 가능 시간은 작가와 상담 후 확정해요.
              </p>
            </div>
            {captureModes.length > 0 && (
              <div>
                <Label htmlFor="captureMode">촬영 방식</Label>
                <select
                  id="captureMode"
                  value={captureMode}
                  onChange={(e) => setCaptureMode(e.target.value)}
                  className="sf-input min-h-13 w-full rounded-xl px-4 py-3.5 text-base"
                >
                  <option value="">잘 모르겠어요 · 작가와 상담할게요</option>
                  {captureModes.map((m) => (
                    <option key={m.id} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <Button type="submit" size="lg" className="mt-8 w-full">
            이 조건으로 작가 보기
            <Icon name="search" />
          </Button>
          <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">
            작품과 기본 가격을 보고 자유롭게 비교하세요
          </p>
        </form>
      )}
    </div>
  );
}
