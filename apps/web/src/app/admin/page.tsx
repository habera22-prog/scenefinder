"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError, downloadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminDashboard } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

function StatsExportCard({ token }: { token: string | null }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setIsBusy(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      await downloadFile(
        `/admin/stats/export?${query.toString()}`,
        token,
        "payments.csv",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "다운로드에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card className="p-5 sm:col-span-2 lg:col-span-3">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        결제 내역 통계 다운로드 (CSV)
      </h3>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="stats-from">시작일</Label>
          <Input id="stats-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="stats-to">종료일</Label>
          <Input id="stats-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button size="sm" variant="secondary" disabled={isBusy} onClick={download}>
          {isBusy ? "다운로드 중..." : "CSV 다운로드"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        기간을 비우면 전체 완료 결제 내역을 받아요.
      </p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AdminDashboard>("/admin/dashboard", { token })
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "대시보드를 불러오지 못했습니다."),
      );
  }, [token]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  const cards = [
    { label: "신규 고객 (7일)", value: `${data.newCustomersThisWeek}명` },
    { label: "신규 작가 (7일)", value: `${data.newPhotographersThisWeek}명` },
    { label: "대기중인 문의", value: `${data.pendingInquiries}건` },
    { label: "진행중인 분쟁", value: `${data.activeDisputes}건` },
    {
      label: "정산 예정 총액",
      value: `${data.scheduledSettlementTotal.toLocaleString()}원`,
    },
    {
      label: "이번 달 총 결제액",
      value: `${data.monthlyGrossRevenue.toLocaleString()}원`,
    },
    {
      label: "이번 달 플랫폼 수익",
      value: `${data.monthlyPlatformRevenue.toLocaleString()}원`,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-xl font-bold text-foreground">{c.value}</p>
        </Card>
      ))}
      <StatsExportCard token={token} />
    </div>
  );
}
