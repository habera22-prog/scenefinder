"use client";
import Link from "next/link";
import { usePhotographerProfile } from "@/lib/use-photographer-profile";
import { useAuthenticatedResource } from "@/lib/use-authenticated-resource";
import type { BookingListItem } from "@/lib/types";
import { RESERVED_STATUSES } from "@/lib/studio";
import { AvailabilityManager } from "@/components/photographers/AvailabilityManager";
import {
  StudioPage,
  StudioLoading,
  StudioError,
  StudioNeedsProfile,
} from "@/components/photographers/StudioPage";
import { Card } from "@/components/ui/Card";

export default function StudioSchedule() {
  const { profile, token, user, loading, error, reload } =
    usePhotographerProfile();
  const bookings = useAuthenticatedResource<BookingListItem[]>(
    user?.role === "photographer" ? "/bookings?role=photographer" : null,
  );
  if (loading) return <StudioLoading />;
  if (error)
    return (
      <StudioPage>
        <StudioError message={error} retry={reload} />
      </StudioPage>
    );
  const reserved = (bookings.data || [])
    .filter((b) => RESERVED_STATUSES.includes(b.status))
    .sort((a, b) =>
      (a.shootDatetime || "").localeCompare(b.shootDatetime || ""),
    );
  return (
    <StudioPage>
      <header>
        <p className="mb-2 text-sm font-semibold text-[var(--brand-text)]">
          촬영할 날과 쉬는 날을 한곳에서
        </p>
        <h1 className="text-[26px] font-bold lg:text-[32px]">촬영 일정</h1>
      </header>
      {!profile ? (
        <StudioNeedsProfile />
      ) : (
        <>
          {bookings.error ? (
            <StudioError message={bookings.error} retry={bookings.reload} />
          ) : bookings.loading ? (
            <Card className="p-5 text-sm text-[var(--muted-foreground)]">
              예약된 촬영을 확인하고 있어요.
            </Card>
          ) : (
            <AvailabilityManager
              photographerId={profile.id}
              token={token}
              bookings={reserved}
            />
          )}
          <section>
            <h2 className="mb-4 text-xl font-bold">진행 중인 촬영 예약</h2>
            {bookings.error ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                예약 내역을 다시 불러와주세요.
              </p>
            ) : !reserved.length && !bookings.loading ? (
              <Card className="p-5 text-sm text-[var(--muted-foreground)]">
                현재 진행 중인 촬영 예약이 없어요.
              </Card>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {reserved.map((b) => (
                  <Link
                    key={b.id}
                    href={`/bookings/${b.id}?role=photographer`}
                    className="sf-card sf-card-hover rounded-2xl bg-[var(--card)] p-5"
                  >
                    <p className="font-semibold">
                      {b.shootDatetime
                        ? new Date(b.shootDatetime).toLocaleString("ko-KR", {
                            timeZone: "Asia/Seoul",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "일정 미정"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {b.customer?.name || "고객"} · {b.location || "장소 미정"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </StudioPage>
  );
}
