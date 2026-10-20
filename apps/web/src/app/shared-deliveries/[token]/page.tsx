"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, API_BASE_URL, ApiError, downloadFile } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

interface SharedDelivery {
  id: string;
  photoCount: number;
  deliveredAt: string | null;
  downloadExpiresAt: string | null;
  booking: {
    shootDatetime: string | null;
    location: string | null;
    photographer: { businessName: string | null };
  };
}

export default function SharedDeliveryPage() {
  const { token: shareToken } = useParams<{ token: string }>();
  const [delivery, setDelivery] = useState<SharedDelivery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPhoto, setDownloadingPhoto] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<SharedDelivery>(
      `/shared/deliveries/${encodeURIComponent(shareToken)}`,
    )
      .then((result) => {
        if (active) setDelivery(result);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : "사진 공유 링크를 열지 못했어요.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [shareToken]);

  async function downloadPhoto(index: number) {
    setDownloadingPhoto(index);
    setDownloadError(null);
    try {
      await downloadFile(
        `/shared/deliveries/${encodeURIComponent(shareToken)}/photos/${index}?download=1`,
        null,
        `scenefinder-photo-${String(index + 1).padStart(2, "0")}.jpg`,
      );
    } catch (err) {
      setDownloadError(
        err instanceof ApiError ? err.message : "사진 다운로드에 실패했어요.",
      );
    } finally {
      setDownloadingPhoto(null);
    }
  }

  const apiPhotoUrl = (index: number) =>
    `${API_BASE_URL}/shared/deliveries/${encodeURIComponent(shareToken)}/photos/${index}`;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:py-14">
      <p className="mb-2 text-sm font-semibold text-[var(--brand-text)]">
        씬파인더 사진 전달
      </p>
      <h1 className="text-2xl font-bold">전달받은 촬영 사진</h1>
      {delivery ? (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            {delivery.booking.photographer.businessName || "사진작가"}
            {delivery.booking.shootDatetime &&
              ` · ${new Date(delivery.booking.shootDatetime).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}`}
            {delivery.booking.location && ` · ${delivery.booking.location}`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            사진 원본을 그대로 내려받을 수 있어요. 다운로드 기한은{" "}
            {delivery.downloadExpiresAt
              ? new Date(delivery.downloadExpiresAt).toLocaleDateString(
                  "ko-KR",
                  { timeZone: "Asia/Seoul" },
                )
              : "안내되지 않았어요"}
            까지예요.
          </p>
          {downloadError && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {downloadError}
            </p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: delivery.photoCount }, (_, index) => (
              <Card key={index} className="overflow-hidden p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={apiPhotoUrl(index)}
                  alt={`촬영 사진 ${index + 1}`}
                  className="aspect-square w-full rounded-lg bg-muted object-contain"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 w-full"
                  disabled={downloadingPhoto !== null}
                  onClick={() => void downloadPhoto(index)}
                >
                  {downloadingPhoto === index
                    ? "다운로드 중..."
                    : `사진 ${index + 1} 다운로드`}
                </Button>
              </Card>
            ))}
          </div>
        </>
      ) : error ? (
        <Card className="mt-6 p-6">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        </Card>
      ) : (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-brand" />
          <span className="sr-only">공유된 사진을 불러오는 중</span>
        </div>
      )}
    </div>
  );
}
