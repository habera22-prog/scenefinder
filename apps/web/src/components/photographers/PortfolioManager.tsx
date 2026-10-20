"use client";
import { useRef, useState } from "react";
import { apiFetch, ApiError, uploadFile } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset";
import type { Portfolio, ShootCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";

export function PortfolioManager({
  photographerId,
  token,
  categories,
  portfolios = [],
  onChange,
}: {
  photographerId: string;
  token: string | null;
  categories: ShootCategory[];
  portfolios: Portfolio[];
  onChange: (photos: Portfolio[]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [selectedCategory, setCategory] = useState("");
  const categoryId = categories.some((c) => c.id === selectedCategory)
    ? selectedCategory
    : categories[0]?.id || "";
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const sorted = [...portfolios].sort((a, b) => a.sortOrder - b.sortOrder);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !categoryId) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const added = [...sorted];
    let count = 0;
    for (let i = 0; i < files.length; i++) {
      setProgress(`사진을 올리는 중이에요 (${i + 1}/${files.length})`);
      try {
        const { url } = await uploadFile(files[i], token);
        const photo = await apiFetch<Portfolio>(
          `/photographers/${photographerId}/portfolios`,
          { method: "POST", token, body: { categoryId, imageUrl: url } },
        );
        added.push(photo);
        onChange([...added]);
        count++;
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "일부 사진을 올리지 못했어요.",
        );
      }
    }
    setBusy(false);
    setProgress("");
    if (fileInput.current) fileInput.current.value = "";
    if (count) setSuccess(`사진 ${count}장을 등록했어요.`);
  }
  async function updateCategory(id: string, next: string) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const photo = await apiFetch<Portfolio>(
        `/photographers/${photographerId}/portfolios/${id}`,
        { method: "PATCH", token, body: { categoryId: next } },
      );
      onChange(sorted.map((p) => (p.id === id ? photo : p)));
      setSuccess("작품의 촬영 분야를 변경했어요.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "촬영 분야를 변경하지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reorder(id: string, to: number) {
    const next = [...sorted];
    const from = next.findIndex((p) => p.id === id);
    if (from < 0 || to < 0 || to >= next.length) return;
    const [photo] = next.splice(from, 1);
    next.splice(to, 0, photo);
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await apiFetch<Portfolio[]>(
        `/photographers/${photographerId}/portfolios/order`,
        {
          method: "PATCH",
          token,
          body: { portfolioIds: next.map((p) => p.id) },
        },
      );
      onChange(saved);
      setSuccess(
        to === 0 ? "대표 작품을 변경했어요." : "작품 순서를 변경했어요.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "순서를 저장하지 못했어요.",
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
      await apiFetch(`/photographers/${photographerId}/portfolios/${id}`, {
        method: "DELETE",
        token,
      });
      onChange(sorted.filter((p) => p.id !== id));
      setConfirmDelete(null);
      setSuccess("작품을 삭제했어요.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "작품을 삭제하지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">고객에게 보여줄 작품</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
            첫 번째 작품이 작가 카드에 대표 사진으로 보여요.
            <br />
            사진을 여러 장 올리고, 분야와 표시 순서를 관리하세요.
          </p>
        </div>
      </div>
      <div className="my-5 flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <label
            htmlFor="portfolio-category"
            className="mb-2 block text-sm font-semibold"
          >
            업로드할 촬영 분야
          </label>
          <select
            id="portfolio-category"
            value={categoryId}
            disabled={busy}
            onChange={(e) => setCategory(e.target.value)}
            className="sf-input min-h-12 max-w-full rounded-xl px-3 py-3 text-sm"
          >
            {!categories.length && (
              <option value="">촬영 분야를 먼저 등록해주세요</option>
            )}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={upload}
          className="hidden"
          aria-label="작품 사진 파일"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !categoryId}
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="photo" />
          사진 추가하기
        </Button>
      </div>
      {progress && (
        <p role="status" className="mb-4 text-sm text-[var(--brand-text)]">
          {progress}
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
      {sorted.length === 0 ? (
        <p className="rounded-xl bg-[var(--muted)] p-5 text-sm text-[var(--muted-foreground)]">
          아직 등록한 작품이 없어요. 나를 잘 보여주는 사진부터 추가해보세요.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((photo, index) => (
            <div
              key={photo.id}
              className="min-w-0 rounded-2xl bg-[var(--muted)] p-3"
            >
              <div className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveAssetUrl(photo.imageUrl)}
                  alt={`등록한 작품 ${index + 1}`}
                  className="aspect-[4/3] w-full object-cover"
                />
                {index === 0 && (
                  <div className="absolute top-2 left-2">
                    <Badge>대표 작품</Badge>
                  </div>
                )}
              </div>
              <label htmlFor={`photo-category-${photo.id}`} className="sr-only">
                {index + 1}번째 작품 촬영 분야
              </label>
              <select
                id={`photo-category-${photo.id}`}
                value={photo.categoryId}
                disabled={busy}
                onChange={(e) => updateCategory(photo.id, e.target.value)}
                className="sf-input mt-3 min-h-11 w-full rounded-xl bg-[var(--card)] px-3 py-2 text-sm"
              >
                {!categories.some((c) => c.id === photo.categoryId) && (
                  <option value={photo.categoryId}>
                    {photo.category?.label || "기존 촬영 분야"}
                  </option>
                )}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || index === 0}
                  onClick={() => reorder(photo.id, 0)}
                >
                  대표로 설정
                </Button>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`작품 ${index + 1} 앞으로 이동`}
                    disabled={busy || index === 0}
                    onClick={() => reorder(photo.id, index - 1)}
                  >
                    <Icon name="back" className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`작품 ${index + 1} 뒤로 이동`}
                    disabled={busy || index === sorted.length - 1}
                    onClick={() => reorder(photo.id, index + 1)}
                  >
                    <Icon name="arrow" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {confirmDelete === photo.id ? (
                <div className="mt-3 rounded-xl bg-[var(--card)] p-3">
                  <p className="mb-3 text-sm">이 작품을 삭제할까요?</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => remove(photo.id)}
                    >
                      작품 삭제 확인
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
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  className="mt-2 w-full"
                  aria-label={`작품 ${index + 1} 삭제`}
                  onClick={() => setConfirmDelete(photo.id)}
                >
                  삭제
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
