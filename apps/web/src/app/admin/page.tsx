"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminDashboard } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

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
    </div>
  );
}
