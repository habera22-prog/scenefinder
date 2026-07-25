"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset";
import { useAuth } from "@/lib/auth-context";
import type { ReceivedDelivery } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export default function MyPhotosPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ReceivedDelivery[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    apiFetch<ReceivedDelivery[]>("/customers/me/deliveries", { token })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "받은 사진을 불러오지 못했습니다."),
      );
  }, [authLoading, user, token, router]);

  if (authLoading || items === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  const opened = items.find((d) => d.id === openId);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-xl font-bold text-foreground">받은 사진</h1>
      {error && <p className="text-sm text-danger">{error}</p>}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          아직 전달받은 사진이 없어요.
        </p>
      ) : opened ? (
        <div>
          <button
            onClick={() => setOpenId(null)}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← 목록으로
          </button>
          <p className="mb-3 text-sm text-foreground">
            {opened.booking.photographer.businessName} ·{" "}
            {opened.booking.shootDatetime &&
              new Date(opened.booking.shootDatetime).toLocaleDateString("ko-KR")}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {opened.photoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={resolveAssetUrl(url)}
                alt=""
                className="aspect-square rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((d) => {
            const remaining = daysUntil(d.downloadExpiresAt);
            const cover = d.representativePhotoUrls?.[0] ?? d.photoUrls[0];
            return (
              <Card key={d.id} className="overflow-hidden p-0">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveAssetUrl(cover)}
                    alt=""
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <p className="font-medium text-foreground">
                    {d.booking.photographer.businessName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {d.booking.shootDatetime &&
                      new Date(d.booking.shootDatetime).toLocaleDateString("ko-KR")}{" "}
                    · {d.booking.location ?? "-"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {remaining !== null && remaining >= 0
                      ? `다운로드 만료 D-${remaining}`
                      : "다운로드 만료됨"}
                  </p>
                  <button
                    onClick={() => setOpenId(d.id)}
                    className="mt-3 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border"
                  >
                    갤러리 열기
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
