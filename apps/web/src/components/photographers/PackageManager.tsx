"use client";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { CaptureMode, PackageItem, ShootCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Textarea } from "@/components/ui/Input";

const empty = {
  title: "",
  category: "",
  captureModeCode: "",
  duration: "60",
  price: "",
  photos: "",
  delivery: "7",
  raw: false,
  retouch: "",
};
export function PackageManager({
  photographerId,
  token,
  verified,
  packages = [],
  categories,
  captureModes,
  onChange,
}: {
  photographerId: string;
  token: string | null;
  verified: boolean;
  packages: PackageItem[];
  categories: ShootCategory[];
  captureModes: CaptureMode[];
  onChange: (packages: PackageItem[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const chosen = categories.find((c) => c.code === form.category);
  const minimum = chosen?.minHourlyRate
    ? Math.ceil((chosen.minHourlyRate * Number(form.duration)) / 60)
    : 0;
  function change(next: Partial<typeof empty>) {
    setForm((prev) => ({ ...prev, ...next }));
  }
  function edit(pkg: PackageItem) {
    setEditing(pkg.id);
    setForm({
      title: pkg.title,
      category: pkg.category,
      captureModeCode: pkg.captureModeCode || "",
      duration: String(pkg.durationMin),
      price: String(pkg.basePrice),
      photos: String(pkg.includedPhotos),
      delivery: String(pkg.deliveryDays),
      raw: pkg.rawIncluded,
      retouch: pkg.retouchScope || "",
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.title.trim() || !form.category) {
      setError("상품명과 촬영 분야를 입력해주세요.");
      return;
    }
    if (Number(form.price) < minimum) {
      setError(
        `이 촬영 시간의 최소 상품 가격은 ${minimum.toLocaleString()}원이에요.`,
      );
      return;
    }
    setBusy(true);
    try {
      const original = packages.find((p) => p.id === editing);
      const saved = await apiFetch<PackageItem>(
        `/photographers/${photographerId}/packages${editing ? `/${editing}` : ""}`,
        {
          method: editing ? "PATCH" : "POST",
          token,
          body: {
            title: form.title.trim(),
            category: form.category,
            captureModeCode: form.captureModeCode || undefined,
            durationMin: Number(form.duration),
            basePrice: Number(form.price),
            includedPhotos: Number(form.photos),
            rawIncluded: form.raw,
            deliveryDays: Number(form.delivery),
            retouchScope: form.retouch,
            options: original?.options || undefined,
          },
        },
      );
      onChange(
        editing
          ? packages.map((p) => (p.id === editing ? saved : p))
          : [...packages, saved],
      );
      setShowForm(false);
      setEditing(null);
      setForm(empty);
      setSuccess("촬영 상품을 저장했어요.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "상품을 저장하지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/photographers/${photographerId}/packages/${id}`, {
        method: "DELETE",
        token,
      });
      onChange(packages.filter((p) => p.id !== id));
      setConfirmDelete(null);
      if (editing === id) setShowForm(false);
      setSuccess("상품을 삭제했어요.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "상품을 삭제하지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  const selectClass =
    "sf-input min-h-13 w-full min-w-0 rounded-xl px-4 py-3.5 text-base";
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">촬영 상품과 가격</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            촬영 시간과 제공 내용을 등록하고, 필요할 때 수정하세요.
          </p>
        </div>
        {verified && !showForm && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setEditing(null);
              setForm(empty);
              setShowForm(true);
              setError(null);
              setSuccess(null);
            }}
          >
            상품 추가
          </Button>
        )}
      </div>
      {!verified && (
        <p className="mb-4 rounded-xl bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)]">
          프리랜서와 사업자 작가 모두 관리자 승인이 완료되면 촬영 상품을 등록할
          수 있어요.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-4 text-sm text-[var(--success)]">
          {success}
        </p>
      )}
      {showForm && (
        <form
          onSubmit={save}
          className="mb-6 space-y-5 rounded-2xl bg-[var(--muted)] p-4 sm:p-5"
        >
          <h3 className="font-bold">
            {editing ? "촬영 상품 수정" : "새 촬영 상품"}
          </h3>
          <div>
            <Label htmlFor="pkg-title">상품명</Label>
            <Input
              id="pkg-title"
              required
              maxLength={100}
              value={form.title}
              onChange={(e) => change({ title: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pkg-category">촬영 분야</Label>
              <select
                id="pkg-category"
                required
                value={form.category}
                onChange={(e) => change({ category: e.target.value })}
                className={selectClass}
              >
                <option value="">선택해주세요</option>
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="pkg-mode">촬영 방식</Label>
              <select
                id="pkg-mode"
                value={form.captureModeCode}
                onChange={(e) => change({ captureModeCode: e.target.value })}
                className={selectClass}
              >
                <option value="">상담 후 결정</option>
                {captureModes.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
            기본 정보에 등록한 전문 분야와 촬영 방식에서 선택할 수 있어요.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "duration", label: "촬영 시간(분)", min: 1 },
              { id: "price", label: "기본 가격(원)", min: 0 },
              { id: "photos", label: "보정 사진 수(장)", min: 0 },
              { id: "delivery", label: "촬영 후 전달 기한(일)", min: 0 },
            ].map((f) => (
              <div key={f.id}>
                <Label htmlFor={`pkg-${f.id}`}>{f.label}</Label>
                <Input
                  id={`pkg-${f.id}`}
                  type="number"
                  min={f.min}
                  step={1}
                  required
                  value={
                    form[f.id as "duration" | "price" | "photos" | "delivery"]
                  }
                  onChange={(e) => change({ [f.id]: e.target.value })}
                />
              </div>
            ))}
          </div>
          {minimum > 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">
              이 분야·촬영 시간의 최소 가격은 {minimum.toLocaleString()}
              원이에요.
            </p>
          )}
          <div>
            <Label htmlFor="pkg-retouch">보정 범위</Label>
            <Textarea
              id="pkg-retouch"
              rows={3}
              value={form.retouch}
              placeholder="예: 밝기·색감 보정, 피부 보정 포함"
              onChange={(e) => change({ retouch: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.raw}
              onChange={(e) => change({ raw: e.target.checked })}
              className="h-5 w-5"
            />
            원본 파일 제공
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy || categories.length === 0}>
              {busy ? "저장 중이에요" : "상품 저장"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setShowForm(false)}
            >
              취소
            </Button>
          </div>
        </form>
      )}
      {packages.length === 0 ? (
        <p className="rounded-xl bg-[var(--muted)] p-5 text-sm text-[var(--muted-foreground)]">
          등록한 상품이 없어요. 상품을 등록하면 고객이 기본 가격을 비교할 수
          있어요.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="min-w-0 rounded-2xl bg-[var(--muted)] p-5"
            >
              <Badge>
                {categories.find((c) => c.code === pkg.category)?.label ||
                  pkg.category}
              </Badge>
              <h3 className="mt-3 text-lg font-bold">{pkg.title}</h3>
              <p className="mt-2 text-xl font-bold">
                {pkg.basePrice.toLocaleString()}원부터
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {pkg.durationMin}분 · 보정 {pkg.includedPhotos}장 ·{" "}
                {pkg.rawIncluded ? "원본 제공" : "원본 미제공"}
                <br />
                촬영 후 {pkg.deliveryDays}일 이내 전달
              </p>
              {pkg.retouchScope && (
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {pkg.retouchScope}
                </p>
              )}
              {confirmDelete === pkg.id ? (
                <div className="mt-4">
                  <p className="mb-3 text-sm">
                    이 상품을 삭제할까요? 예약에 사용된 상품은 삭제할 수 없어요.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => remove(pkg.id)}
                    >
                      상품 삭제 확인
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setConfirmDelete(null)}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  {verified && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => edit(pkg)}
                      aria-label={`${pkg.title} 수정`}
                    >
                      수정
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setConfirmDelete(pkg.id)}
                    aria-label={`${pkg.title} 삭제`}
                  >
                    삭제
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
