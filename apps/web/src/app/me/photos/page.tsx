"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError, downloadFile } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset";
import { useAuth } from "@/lib/auth-context";
import type { ReceivedDelivery } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

interface PhotoFolder {
  bookingId: string;
  deliveries: ReceivedDelivery[];
  latestDelivery: ReceivedDelivery;
  photoCount: number;
}

function groupDeliveries(items: ReceivedDelivery[]): PhotoFolder[] {
  const deliveriesByBooking = new Map<string, ReceivedDelivery[]>();
  for (const delivery of items) {
    const deliveries = deliveriesByBooking.get(delivery.bookingId) ?? [];
    deliveries.push(delivery);
    deliveriesByBooking.set(delivery.bookingId, deliveries);
  }

  return Array.from(deliveriesByBooking, ([bookingId, deliveries]) => ({
    bookingId,
    deliveries,
    latestDelivery: deliveries[0],
    photoCount: deliveries.reduce(
      (count, delivery) => count + delivery.photoUrls.length,
      0,
    ),
  }));
}

export default function MyPhotosPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ReceivedDelivery[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const [downloadingPhoto, setDownloadingPhoto] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  function downloadExpired(expiresAt: string | null) {
    return expiresAt === null || new Date(expiresAt).getTime() <= currentTime;
  }

  async function downloadPhoto(delivery: ReceivedDelivery, index: number) {
    const key = `${delivery.id}:${index}`;
    const photoUrl = delivery.photoUrls[index];
    const extension =
      /\.(jpe?g|png|webp)$/i.exec(new URL(photoUrl, window.location.origin).pathname)?.[0] ??
      ".jpg";
    setDownloadingPhoto(key);
    setDownloadError(null);
    try {
      await downloadFile(
        `/customers/me/deliveries/${delivery.id}/photos/${index}`,
        token,
        `scenefinder-photo-${String(index + 1).padStart(2, "0")}${extension.toLowerCase()}`,
      );
    } catch (err) {
      setDownloadError(
        err instanceof ApiError ? err.message : "사진 다운로드에 실패했어요.",
      );
    } finally {
      setDownloadingPhoto(null);
    }
  }

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());
    updateCurrentTime();
    const timer = window.setInterval(updateCurrentTime, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    apiFetch<ReceivedDelivery[]>("/customers/me/deliveries", { token })
      .then((deliveries) => {
        setItems(deliveries);
        const query = new URLSearchParams(window.location.search);
        const deliveryId = query.get("deliveryId");
        const bookingId = query.get("bookingId");
        const targetDelivery = deliveryId
          ? deliveries.find((delivery) => delivery.id === deliveryId)
          : bookingId
            ? deliveries.find((delivery) => delivery.bookingId === bookingId)
            : null;
        if (targetDelivery) {
          setOpenBookingId(targetDelivery.bookingId);
        }
      })
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

  const folders = groupDeliveries(items);
  const openedFolder = folders.find(
    (folder) => folder.bookingId === openBookingId,
  );
  const folderPhotos = openedFolder
    ? openedFolder.deliveries.flatMap((delivery) =>
        delivery.photoUrls.map((url, index) => ({ delivery, url, index })),
      )
    : [];

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-xl font-bold text-foreground">받은 사진</h1>
      <p className="-mt-4 mb-6 text-sm text-muted-foreground">
        촬영 예약별 폴더에서 전달받은 사진을 모아볼 수 있어요.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          아직 전달받은 사진이 없어요.
        </p>
      ) : openedFolder ? (
        <div>
          <button
            onClick={() => setOpenBookingId(null)}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← 폴더 목록
          </button>
          <p className="mb-3 text-sm text-foreground">
            {openedFolder.latestDelivery.booking.photographer.businessName} ·{" "}
            {openedFolder.latestDelivery.booking.shootDatetime &&
              new Date(
                openedFolder.latestDelivery.booking.shootDatetime,
              ).toLocaleDateString("ko-KR")}
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            사진 {openedFolder.photoCount}장 · 원본 그대로 다운로드돼요.
            전달 시점에 따라 다운로드 기한은 사진마다 다를 수 있어요.
          </p>
          {downloadError && (
            <p role="alert" className="mb-3 text-sm text-danger">
              {downloadError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {folderPhotos.map(({ delivery, url, index }, photoNumber) => (
              <figure key={`${delivery.id}-${index}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveAssetUrl(url)}
                  alt={`촬영 사진 ${photoNumber + 1}`}
                  className="aspect-square w-full rounded-lg bg-muted object-contain"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full"
                  disabled={
                    downloadingPhoto !== null ||
                    downloadExpired(delivery.downloadExpiresAt)
                  }
                  onClick={() => void downloadPhoto(delivery, index)}
                >
                  {downloadingPhoto === `${delivery.id}:${index}`
                    ? "다운로드 중..."
                    : `사진 ${photoNumber + 1} 다운로드`}
                </Button>
              </figure>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {folders.map((folder) => {
            const latestDelivery = folder.latestDelivery;
            const cover =
              latestDelivery.representativePhotoUrls?.[0] ??
              latestDelivery.photoUrls[0];
            const downloadablePhotoCount = folder.deliveries.reduce(
              (count, delivery) =>
                count +
                (downloadExpired(delivery.downloadExpiresAt)
                  ? 0
                  : delivery.photoUrls.length),
              0,
            );
            const nearestActiveExpiry = folder.deliveries
              .map((delivery) => delivery.downloadExpiresAt)
              .filter(
                (expiresAt): expiresAt is string =>
                  expiresAt !== null &&
                  new Date(expiresAt).getTime() > currentTime,
              )
              .sort(
                (a, b) => new Date(a).getTime() - new Date(b).getTime(),
              )[0] ?? null;
            const remaining = daysUntil(nearestActiveExpiry);
            return (
              <Card key={folder.bookingId} className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => setOpenBookingId(folder.bookingId)}
                  className="group block w-full text-left"
                >
                  <div className="relative h-44 bg-muted">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveAssetUrl(cover)}
                        alt=""
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Icon name="photo" className="h-10 w-10" />
                      </div>
                    )}
                    <span className="absolute right-3 bottom-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white">
                      사진 {folder.photoCount}장
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {latestDelivery.booking.photographer.businessName ||
                            "사진 촬영"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {latestDelivery.booking.shootDatetime &&
                            new Date(
                              latestDelivery.booking.shootDatetime,
                            ).toLocaleDateString("ko-KR", {
                              timeZone: "Asia/Seoul",
                            })}
                          {latestDelivery.booking.shootDatetime &&
                            latestDelivery.booking.location &&
                            " · "}
                          {latestDelivery.booking.location ?? ""}
                        </p>
                      </div>
                      <Icon
                        name="chevron"
                        className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      <span>
                        {folder.deliveries.length > 1
                          ? folder.deliveries.length + "회에 걸쳐 전달"
                          : "촬영 사진 폴더"}
                      </span>
                      <span>
                        {downloadablePhotoCount > 0 && remaining !== null
                          ? "다운로드 만료 D-" + Math.max(remaining, 0)
                          : "다운로드 기간 종료"}
                      </span>
                    </div>
                  </div>
                  <span className="sr-only">폴더 열기</span>
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
