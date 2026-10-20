"use client";
import Link from "next/link";
import { usePhotographerProfile } from "@/lib/use-photographer-profile";
import { useAuthenticatedResource } from "@/lib/use-authenticated-resource";
import type { BookingListItem, Settlement } from "@/lib/types";
import {
  bookingDate,
  RESERVED_STATUSES,
  STUDIO_NEXT_ACTION,
} from "@/lib/studio";
import { koreaToday } from "@/lib/discovery";
import { Card } from "@/components/ui/Card";
import { buttonStyles } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import {
  StudioPage,
  StudioLoading,
  StudioError,
  StudioNeedsProfile,
} from "@/components/photographers/StudioPage";

export default function StudioHome() {
  const { user, profile, loading, error, reload } = usePhotographerProfile();
  const bookings = useAuthenticatedResource<BookingListItem[]>(
    user?.role === "photographer" ? "/bookings?role=photographer" : null,
  );
  const settlements = useAuthenticatedResource<Settlement[]>(
    profile ? `/photographers/${profile.id}/settlements` : null,
  );
  if (loading) return <StudioLoading />;
  if (error)
    return (
      <StudioPage>
        <StudioError message={error} retry={reload} />
      </StudioPage>
    );
  const items = bookings.data || [];
  const today = koreaToday();
  const upcoming = items
    .filter(
      (b) => RESERVED_STATUSES.includes(b.status) && bookingDate(b) >= today,
    )
    .sort((a, b) =>
      (a.shootDatetime || "").localeCompare(b.shootDatetime || ""),
    );
  const tasks = items.filter((b) =>
    ["inquiry", "completed", "disputed"].includes(b.status),
  );
  const stats: {
    label: string;
    count: number;
    status: string;
    icon: IconName;
  }[] = [
    {
      label: "답변할 문의",
      count: items.filter((b) => b.status === "inquiry").length,
      status: "inquiry",
      icon: "message",
    },
    {
      label: "오늘 촬영",
      count: upcoming.filter((b) => bookingDate(b) === today).length,
      status: "today",
      icon: "calendar",
    },
    {
      label: "사진 전달 대기",
      count: items.filter((b) => b.status === "completed").length,
      status: "completed",
      icon: "photo",
    },
  ];
  const scheduled = settlements.data
    ?.filter((s) => s.status === "scheduled")
    .reduce((sum, s) => sum + s.totalAmount, 0);
  return (
    <StudioPage>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--brand-text)]">
            나의 작가 작업실
          </p>
          <h1 className="text-[26px] font-bold lg:text-[32px]">
            {profile?.displayName || user?.name}님, 반가워요
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            문의에 답하고, 다가오는 촬영을 준비해보세요.
          </p>
        </div>
        {profile && (
          <Link
            href={`/photographers/${profile.id}`}
            target="_blank"
            rel="noreferrer"
            className={buttonStyles("secondary", "sm")}
          >
            내 프로필 미리보기
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        )}
      </header>
      {!profile ? (
        <StudioNeedsProfile />
      ) : (
        <>
          {profile.verificationStatus !== "verified" && (
            <Card className="p-5">
              <Badge>
                {profile.verificationStatus === "pending"
                  ? "심사 대기 중"
                  : "프로필 보완 필요"}
              </Badge>
              <p className="mt-3 text-sm leading-relaxed">
                {profile.verificationStatus === "pending"
                  ? "작가 프로필을 검토하고 있어요. 작품을 추가하고 촬영 정보를 확인해주세요."
                  : "등록 정보를 확인하고 필요한 내용을 보완해주세요."}
              </p>
              <Link
                href="/photographers/apply"
                className="sf-link mt-3 inline-flex items-center gap-1 text-sm"
              >
                프로필 관리하기
                <Icon name="chevron" className="h-4 w-4" />
              </Link>
            </Card>
          )}
          {bookings.error ? (
            <StudioError message={bookings.error} retry={bookings.reload} />
          ) : (
            <div className="grid grid-cols-3 gap-2 lg:gap-5">
              {stats.map((s) => (
                <Link
                  key={s.status}
                  href={`/me/bookings?role=photographer&status=${s.status}`}
                  className="sf-card sf-card-hover rounded-2xl bg-[var(--card)] p-3 sm:p-5"
                >
                  <Icon
                    name={s.icon}
                    className="mb-3 h-5 w-5 text-[var(--brand-text)]"
                  />
                  <p className="text-xs text-[var(--muted-foreground)] sm:text-sm">
                    {s.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {bookings.loading ? "—" : s.count}
                    <span className="ml-1 text-sm font-normal">건</span>
                  </p>
                </Link>
              ))}
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">먼저 확인해주세요</h2>
                  <Link
                    href="/me/bookings?role=photographer"
                    className="sf-link text-sm"
                  >
                    전체 문의·예약
                  </Link>
                </div>
                {bookings.loading ? (
                  <Card className="p-6 text-sm text-[var(--muted-foreground)]">
                    문의 내역을 불러오는 중이에요.
                  </Card>
                ) : bookings.error ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    문의 내역을 다시 불러오면 할 일을 확인할 수 있어요.
                  </p>
                ) : tasks.length === 0 ? (
                  <Card className="p-6">
                    <p className="font-semibold">급하게 처리할 일이 없어요</p>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      새 문의나 전달할 사진이 생기면 여기에 표시돼요.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {tasks.slice(0, 5).map((b) => (
                      <Link
                        href={`/bookings/${b.id}?role=photographer`}
                        key={b.id}
                        className="sf-card sf-card-hover flex items-start justify-between gap-3 rounded-2xl bg-[var(--card)] p-5"
                      >
                        <div>
                          <Badge>
                            {b.status === "inquiry"
                              ? "새 문의"
                              : b.status === "completed"
                                ? "사진 전달"
                                : "문제 확인"}
                          </Badge>
                          <p className="mt-3 font-semibold">
                            {b.customer?.name || "고객"} ·{" "}
                            {b.shootCategory?.label || "촬영"}
                          </p>
                          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                            {STUDIO_NEXT_ACTION[b.status]}
                          </p>
                        </div>
                        <Icon
                          name="chevron"
                          className="mt-1 h-4 w-4 shrink-0 text-[var(--muted-foreground)]"
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h2 className="mb-4 text-xl font-bold">다가오는 촬영</h2>
                <Card className="p-5">
                  {bookings.loading ? (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      촬영 일정을 불러오는 중이에요.
                    </p>
                  ) : bookings.error ? (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      일정을 확인하려면 예약 내역을 다시 불러와주세요.
                    </p>
                  ) : upcoming.length === 0 ? (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      아직 예정된 촬영이 없어요.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {upcoming.slice(0, 5).map((b) => (
                        <Link
                          key={b.id}
                          href={`/bookings/${b.id}?role=photographer`}
                          className="sf-tab flex items-center gap-4"
                        >
                          <Icon
                            name="calendar"
                            className="h-6 w-6 shrink-0 text-[var(--brand-text)]"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold">
                              {new Date(b.shootDatetime!).toLocaleString(
                                "ko-KR",
                                {
                                  timeZone: "Asia/Seoul",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                            <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
                              {b.customer?.name} · {b.location || "장소 미정"}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link
                    href="/studio/schedule"
                    className="sf-link mt-5 inline-flex items-center gap-1 text-sm"
                  >
                    일정 달력 보기
                    <Icon name="chevron" className="h-4 w-4" />
                  </Link>
                </Card>
              </section>
            </div>
            <aside className="space-y-5">
              <Card className="p-5">
                <p className="text-sm text-[var(--muted-foreground)]">
                  정산 예정 금액
                </p>
                <p className="mt-3 text-[26px] font-bold">
                  {settlements.loading || settlements.error
                    ? "—"
                    : `${(scheduled ?? 0).toLocaleString()}원`}
                </p>
                {settlements.error ? (
                  <StudioError
                    message={settlements.error}
                    retry={settlements.reload}
                  />
                ) : (
                  <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                    촬영 거래가 종료된 뒤 정산 대상에 반영돼요.
                  </p>
                )}
                <Link
                  href="/me/settlements"
                  className="sf-link mt-5 inline-flex items-center gap-1 text-sm"
                >
                  정산 내역 확인
                  <Icon name="chevron" className="h-4 w-4" />
                </Link>
              </Card>
              <Card className="p-5">
                <h2 className="font-semibold">고객을 만날 준비</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    {
                      label: "대표 작품 등록",
                      done: profile.portfolios.length > 0,
                    },
                    {
                      label: "촬영 상품 등록",
                      done: profile.packages.length > 0,
                    },
                    {
                      label: "작가 승인",
                      done: profile.verificationStatus === "verified",
                    },
                  ].map((item) => (
                    <p key={item.label} className="flex items-center gap-2">
                      <Icon
                        name={item.done ? "check" : "clock"}
                        className={`h-4 w-4 ${item.done ? "text-[var(--brand-text)]" : "text-[var(--muted-foreground)]"}`}
                      />
                      {item.label}
                    </p>
                  ))}
                </div>
                <Link
                  href="/photographers/apply"
                  className={`${buttonStyles("secondary")} mt-5 w-full`}
                >
                  프로필·상품 관리
                </Link>
              </Card>
            </aside>
          </div>
        </>
      )}
    </StudioPage>
  );
}
