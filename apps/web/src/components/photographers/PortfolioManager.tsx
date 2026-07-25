"use client";

import { useRef, useState } from "react";
import { apiFetch, ApiError, uploadFile } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset";
import type { Portfolio, ShootCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Props {
  photographerId: string;
  token: string | null;
  categories: ShootCategory[];
  portfolios: Portfolio[];
  onChange: (portfolios: Portfolio[]) => void;
}

export function PortfolioManager({
  photographerId,
  token,
  categories,
  portfolios,
  onChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !categoryId) return;
    setError(null);
    setIsUploading(true);
    try {
      const { url } = await uploadFile(file, token);
      const portfolio = await apiFetch<Portfolio>(
        `/photographers/${photographerId}/portfolios`,
        { method: "POST", token, body: { categoryId, imageUrl: url } },
      );
      onChange([...portfolios, portfolio]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        포트폴리오
      </h2>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelected}
          className="hidden"
          id="portfolio-file-input"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isUploading || !categoryId}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? "업로드 중..." : "사진 업로드"}
        </Button>
      </div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {portfolios.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          아직 등록된 포트폴리오가 없습니다. 분야를 선택하고 사진을 업로드해보세요.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {portfolios.map((p) => (
            <div key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveAssetUrl(p.imageUrl)}
                alt=""
                className="aspect-square rounded-lg object-cover"
              />
              {p.category && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {p.category.label}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
