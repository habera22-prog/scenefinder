"use client";
import { useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { usePhotographerProfile } from "@/lib/use-photographer-profile";
import { useAuthenticatedResource } from "@/lib/use-authenticated-resource";
import type { Settlement, SettlementItem } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  StudioPage,
  StudioError,
  StudioLoading,
  StudioNeedsProfile,
} from "@/components/photographers/StudioPage";

const labels: Record<string, string> = {
  scheduled: "정산 예정",
  held: "보류 중",
  paid: "지급 완료",
};
function SettlementRow({
  settlement,
  photographerId,
  token,
}: {
  settlement: Settlement;
  photographerId: string;
  token: string | null;
}) {
  const [open, setOpen] = useState(false),
    [items, setItems] = useState<SettlementItem[] | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  async function loadItems() {
    setBusy(true);
    setError(null);
    try {
      setItems(
        await apiFetch<SettlementItem[]>(
          `/photographers/${photographerId}/settlements/${settlement.id}/items`,
          { token },
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "상세 내역을 불러오지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!items) await loadItems();
  }
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`settlement-${settlement.id}`}
        onClick={toggle}
        className="sf-button-ghost flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
      >
        <div>
          <Badge>{labels[settlement.status]}</Badge>
          <p className="mt-2 text-sm">
            {new Date(settlement.periodStart).toLocaleDateString("ko-KR")} ~{" "}
            {new Date(settlement.periodEnd).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <p className="text-xl font-bold text-[var(--foreground)]">
          {settlement.totalAmount.toLocaleString()}원
        </p>
      </button>
      {settlement.heldReason && (
        <p className="px-5 pb-4 text-sm text-[var(--danger)]">
          보류 사유 · {settlement.heldReason}
        </p>
      )}
      {settlement.paidAt && (
        <p className="px-5 pb-4 text-sm text-[var(--muted-foreground)]">
          지급일 · {new Date(settlement.paidAt).toLocaleDateString("ko-KR")}
        </p>
      )}
      {open && (
        <div id={`settlement-${settlement.id}`} className="px-5 pb-5">
          {busy ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              정산 상세를 불러오는 중이에요.
            </p>
          ) : error ? (
            <div>
              <p role="alert" className="text-sm text-[var(--danger)]">
                {error}
              </p>
              <Button variant="secondary" className="mt-3" onClick={loadItems}>
                상세 다시 불러오기
              </Button>
            </div>
          ) : items?.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              정산 상세 항목이 없어요.
            </p>
          ) : (
            <div className="space-y-3">
              {items?.map((item) => (
                <div key={item.id} className="rounded-xl bg-[var(--muted)] p-4">
                  <Link
                    href={`/bookings/${item.bookingId}?role=photographer`}
                    className="sf-link text-sm font-semibold"
                  >
                    촬영 예약 확인하기
                  </Link>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-[var(--muted-foreground)]">
                      결제 금액
                    </dt>
                    <dd className="text-right">
                      {item.grossAmount.toLocaleString()}원
                    </dd>
                    <dt className="text-[var(--muted-foreground)]">
                      플랫폼 수수료
                    </dt>
                    <dd className="text-right">
                      −{item.platformFee.toLocaleString()}원
                    </dd>
                    <dt className="text-[var(--muted-foreground)]">
                      결제 수수료
                    </dt>
                    <dd className="text-right">
                      −{item.pgFee.toLocaleString()}원
                    </dd>
                    <dt className="text-[var(--muted-foreground)]">차감액</dt>
                    <dd className="text-right">
                      −{item.deductionAmount.toLocaleString()}원
                    </dd>
                    <dt className="font-semibold">정산액</dt>
                    <dd className="text-right font-semibold">
                      {item.netAmount.toLocaleString()}원
                    </dd>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
export default function MySettlementsPage() {
  const { profile, token, loading, error, reload } = usePhotographerProfile();
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
  const items = settlements.data || [];
  return (
    <StudioPage>
      <header>
        <p className="mb-2 text-sm font-semibold text-[var(--brand-text)]">
          촬영 수익을 확인하세요
        </p>
        <h1 className="text-[26px] font-bold lg:text-[32px]">정산 내역</h1>
      </header>
      {!profile ? (
        <StudioNeedsProfile />
      ) : settlements.error ? (
        <StudioError message={settlements.error} retry={settlements.reload} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { code: "scheduled", label: "정산 예정" },
              { code: "held", label: "보류 중" },
              { code: "paid", label: "누적 지급액" },
            ].map((s) => (
              <Card key={s.code} className="p-5">
                <p className="text-sm text-[var(--muted-foreground)]">
                  {s.label}
                </p>
                <p className="mt-3 text-2xl font-bold">
                  {settlements.loading
                    ? "—"
                    : `${items
                        .filter((v) => v.status === s.code)
                        .reduce((sum, v) => sum + v.totalAmount, 0)
                        .toLocaleString()}원`}
                </p>
              </Card>
            ))}
          </div>
          {settlements.loading ? (
            <Card className="p-5 text-sm text-[var(--muted-foreground)]">
              정산 내역을 불러오는 중이에요.
            </Card>
          ) : items.length === 0 ? (
            <Card className="p-6">
              <p className="font-semibold">아직 정산 내역이 없어요</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                촬영과 사진 전달이 끝난 거래는 정산 대기 기간을 거쳐 반영돼요.
                첫 촬영의 정산은 시간이 더 걸릴 수 있어요.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {items.map((s) => (
                <SettlementRow
                  key={s.id}
                  settlement={s}
                  photographerId={profile.id}
                  token={token}
                />
              ))}
            </div>
          )}
        </>
      )}
    </StudioPage>
  );
}
