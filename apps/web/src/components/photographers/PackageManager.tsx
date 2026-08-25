"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { CaptureMode, PackageItem, ShootCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

interface Props {
  photographerId: string;
  token: string | null;
  verified: boolean;
  packages: PackageItem[];
  categories: ShootCategory[];
  captureModes: CaptureMode[];
  onChange: (packages: PackageItem[]) => void;
}

export function PackageManager({
  photographerId,
  token,
  verified,
  packages,
  categories,
  captureModes,
  onChange,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [captureModeCode, setCaptureModeCode] = useState("");
  const [durationMin, setDurationMin] = useState("60");
  const [basePrice, setBasePrice] = useState("");
  const [includedPhotos, setIncludedPhotos] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("7");
  const [rawIncluded, setRawIncluded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCategory = categories.find((c) => c.code === category);
  const durationMinNumber = Number(durationMin) || 0;
  const minAmount = selectedCategory?.minHourlyRate
    ? Math.ceil((selectedCategory.minHourlyRate * durationMinNumber) / 60)
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (minAmount > 0 && Number(basePrice) < minAmount) {
      setError(
        `이 분야는 시간당 최저가가 적용돼요. ${durationMinNumber}분 상품이면 최소 ${minAmount.toLocaleString()}원 이상으로 등록해야 합니다.`,
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const pkg = await apiFetch<PackageItem>(
        `/photographers/${photographerId}/packages`,
        {
          method: "POST",
          token,
          body: {
            title,
            category,
            captureModeCode: captureModeCode || undefined,
            durationMin: Number(durationMin),
            basePrice: Number(basePrice),
            includedPhotos: Number(includedPhotos),
            rawIncluded,
            deliveryDays: Number(deliveryDays),
          },
        },
      );
      onChange([...packages, pkg]);
      setShowForm(false);
      setTitle("");
      setCategory("");
      setCaptureModeCode("");
      setBasePrice("");
      setIncludedPhotos("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "상품 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          촬영 상품
        </h2>
        {verified && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "취소" : "상품 추가"}
          </Button>
        )}
      </div>

      {!verified && (
        <p className="mb-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          사업자 인증이 완료되어야 유료 촬영 상품을 등록할 수 있어요.
        </p>
      )}

      {showForm && (
        <form className="mb-6 flex flex-col gap-3 rounded-xl border border-border p-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="pkg-title">상품명</Label>
            <Input id="pkg-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pkg-category">분야</Label>
            <select
              id="pkg-category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">선택하세요</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            {selectedCategory?.minHourlyRate ? (
              <p className="mt-1 text-xs text-muted-foreground">
                이 분야 시간당 최저가 {selectedCategory.minHourlyRate.toLocaleString()}원
                {durationMinNumber > 0 &&
                  ` · ${durationMinNumber}분이면 최소 ${minAmount.toLocaleString()}원 이상`}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="pkg-capture-mode">촬영 방식</Label>
            <select
              id="pkg-capture-mode"
              value={captureModeCode}
              onChange={(e) => setCaptureModeCode(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">선택 안 함</option>
              {captureModes.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pkg-duration">촬영 시간(분)</Label>
              <Input
                id="pkg-duration"
                type="number"
                required
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pkg-delivery">납품 기한(일)</Label>
              <Input
                id="pkg-delivery"
                type="number"
                required
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pkg-price">기본가(원)</Label>
              <Input
                id="pkg-price"
                type="number"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pkg-photos">제공 사진 수</Label>
              <Input
                id="pkg-photos"
                type="number"
                required
                value={includedPhotos}
                onChange={(e) => setIncludedPhotos(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={rawIncluded}
              onChange={(e) => setRawIncluded(e.target.checked)}
            />
            원본 제공
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "등록 중..." : "상품 등록"}
          </Button>
        </form>
      )}

      {packages.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 상품이 없습니다.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {packages.map((pkg) => {
            const modeLabel = captureModes.find((m) => m.code === pkg.captureModeCode)?.label;
            return (
            <div key={pkg.id} className="rounded-xl border border-border p-4">
              <p className="font-semibold text-foreground">{pkg.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {pkg.durationMin}분 · 보정 {pkg.includedPhotos}장+{modeLabel ? ` · ${modeLabel}` : ""}
              </p>
              <p className="mt-2 font-medium text-brand">
                {pkg.basePrice.toLocaleString()}원~
              </p>
            </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
