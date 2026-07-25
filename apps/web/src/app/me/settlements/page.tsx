"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { MyPhotographerProfile, Settlement, SettlementItem } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "정산 예정",
  held: "보류",
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
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<SettlementItem[] | null>(null);

  async function toggle() {
    if (!expanded && !items) {
      const data = await apiFetch<SettlementItem[]>(
        `/photographers/${photographerId}/settlements/${settlement.id}/items`,
        { token },
      );
      setItems(data);
    }
    setExpanded((v) => !v);
  }

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-muted"
      >
        <span>
          {new Date(settlement.periodStart).toLocaleDateString("ko-KR")} ~{" "}
          {new Date(settlement.periodEnd).toLocaleDateString("ko-KR")}
        </span>
        <span className="flex items-center gap-3">
          <Badge>{STATUS_LABEL[settlement.status] ?? settlement.status}</Badge>
          <span className="font-medium">{settlement.totalAmount.toLocaleString()}원</span>
        </span>
      </button>
      {expanded && items && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-4 py-1 text-left">결제금액</th>
              <th className="px-4 py-1 text-left">수수료</th>
              <th className="px-4 py-1 text-left">PG수수료</th>
              <th className="px-4 py-1 text-left">차감</th>
              <th className="px-4 py-1 text-left">정산액</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-1">{item.grossAmount.toLocaleString()}</td>
                <td className="px-4 py-1">-{item.platformFee.toLocaleString()}</td>
                <td className="px-4 py-1">-{item.pgFee.toLocaleString()}</td>
                <td className="px-4 py-1">-{item.deductionAmount.toLocaleString()}</td>
                <td className="px-4 py-1 font-medium">{item.netAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function MySettlementsPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<MyPhotographerProfile | null>(null);
  const [settlements, setSettlements] = useState<Settlement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "photographer") {
      router.push("/");
      return;
    }
    apiFetch<MyPhotographerProfile | null>("/photographers/me", { token })
      .then((p) => {
        setProfile(p);
        if (p) {
          return apiFetch<Settlement[]>(`/photographers/${p.id}/settlements`, { token }).then(
            setSettlements,
          );
        }
        setSettlements([]);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "정산 내역을 불러오지 못했습니다."),
      );
  }, [authLoading, user, token, router]);

  if (authLoading || settlements === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  const scheduledTotal = settlements
    .filter((s) => s.status === "scheduled")
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const heldTotal = settlements
    .filter((s) => s.status === "held")
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const paidTotal = settlements
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + s.totalAmount, 0);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-xl font-bold text-foreground">작가 정산 대시보드</h1>
      {error && <p className="text-sm text-danger">{error}</p>}

      {!profile ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          아직 작가 프로필이 없어요.{" "}
          <a href="/photographers/apply" className="font-medium text-brand hover:underline">
            작가 지원하기
          </a>
        </p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">정산 예정</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {scheduledTotal.toLocaleString()}원
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">보류 중</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {heldTotal.toLocaleString()}원
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">누적 지급액</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {paidTotal.toLocaleString()}원
              </p>
            </Card>
          </div>

          <Card className="p-0">
            {settlements.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                정산 내역이 없어요. 첫 정산은 예약이 종료되고 며칠 후 반영돼요.
              </p>
            ) : (
              settlements.map((s) => (
                <SettlementRow
                  key={s.id}
                  settlement={s}
                  photographerId={profile.id}
                  token={token}
                />
              ))
            )}
          </Card>
        </>
      )}
    </div>
  );
}
