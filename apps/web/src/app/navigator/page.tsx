"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import type { ShootCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

const MOODS = [
  "밝고 화사",
  "자연스럽고 생생",
  "전문적이고 정돈",
  "따뜻하고 감성적",
  "고급스럽고 차분",
  "시네마틱",
];

type Step = "category" | "mood" | "conditions";
const STEPS: Step[] = ["category", "mood", "conditions"];

export default function NavigatorPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ShootCategory[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("category");
  const [categoryCode, setCategoryCode] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [region, setRegion] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [purpose, setPurpose] = useState("");

  useEffect(() => {
    apiFetch<ShootCategory[]>("/shoot-categories")
      .then(setCategories)
      .catch((err) =>
        setLoadError(
          err instanceof ApiError ? err.message : "촬영 종류를 불러오지 못했습니다.",
        ),
      );
  }, []);

  const stepIndex = STEPS.indexOf(step);

  function goToResults() {
    const params = new URLSearchParams();
    if (categoryCode) params.set("category", categoryCode);
    if (region) params.set("region", region);
    router.push(`/photographers?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
      <div className="mb-8 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              i <= stepIndex ? "bg-brand" : "bg-border"
            }`}
          />
        ))}
      </div>

      <Card className="p-8">
        {step === "category" && (
          <>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              1단계 · 촬영 종류
            </p>
            <h2 className="mb-6 text-xl font-bold text-foreground">
              어떤 촬영을 찾고 계신가요?
            </h2>
            {loadError && <p className="text-sm text-danger">{loadError}</p>}
            {!categories && !loadError && (
              <Spinner className="h-6 w-6 text-brand" />
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {categories?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryCode(c.code)}
                  className={`rounded-xl border p-4 text-sm font-medium transition-colors ${
                    categoryCode === c.code
                      ? "border-brand bg-brand-muted text-brand"
                      : "border-border bg-card text-foreground hover:border-brand/50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <Button disabled={!categoryCode} onClick={() => setStep("mood")}>
                다음
              </Button>
            </div>
          </>
        )}

        {step === "mood" && (
          <>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              2단계 · 분위기
            </p>
            <h2 className="mb-6 text-xl font-bold text-foreground">
              원하시는 촬영 분위기는요?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`rounded-xl border p-4 text-sm font-medium transition-colors ${
                    mood === m
                      ? "border-brand bg-brand-muted text-brand"
                      : "border-border bg-card text-foreground hover:border-brand/50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="secondary" onClick={() => setStep("category")}>
                이전
              </Button>
              <Button disabled={!mood} onClick={() => setStep("conditions")}>
                다음
              </Button>
            </div>
          </>
        )}

        {step === "conditions" && (
          <>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              3단계 · 촬영 조건
            </p>
            <h2 className="mb-6 text-xl font-bold text-foreground">
              촬영 조건을 알려주세요
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="region">활동 지역</Label>
                <Input
                  id="region"
                  placeholder="예: 서울"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="headcount">인원</Label>
                <Input
                  id="headcount"
                  type="number"
                  min={1}
                  value={headcount}
                  onChange={(e) => setHeadcount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="purpose">사용 목적</Label>
                <Input
                  id="purpose"
                  placeholder="예: 회사 창립기념 행사 스냅"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              최저가 순이 아닌 분야 적합도·분위기·일정·지역·후기를 종합한 적합도 순으로 추천해드려요.
            </p>
            <div className="mt-8 flex justify-between">
              <Button variant="secondary" onClick={() => setStep("mood")}>
                이전
              </Button>
              <Button onClick={goToResults}>작가 추천받기</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
