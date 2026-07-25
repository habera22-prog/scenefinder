"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminDispute } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const TYPE_LABEL: Record<AdminDispute["type"], string> = {
  quality: "사진 품질 문제",
  noshow: "노쇼·지각",
  delay: "납품 지연",
  other: "기타",
};

const STATUS_LABEL: Record<AdminDispute["status"], string> = {
  open: "접수완료",
  fact_check_requested: "사실확인 요청됨",
  resolved: "해결됨",
  escalated: "조정중",
};

function ResolveForm({
  dispute,
  token,
  onDone,
}: {
  dispute: AdminDispute;
  token: string | null;
  onDone: () => void;
}) {
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function submit() {
    if (!resolution.trim()) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/disputes/${dispute.id}/resolve`, {
        method: "POST",
        token,
        body: { resolution },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "조정 처리에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <label className="text-xs text-muted-foreground">조정 결과 (환불/보상/재촬영 등)</label>
      <textarea
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        rows={2}
        className="rounded-lg border border-border bg-card p-2 text-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none"
        placeholder="예: 부분 보정 재작업 완료, 10% 부분 환불 처리"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button size="sm" disabled={isBusy || !resolution.trim()} onClick={submit}>
        {isBusy ? "처리 중..." : "해결 처리"}
      </Button>
    </div>
  );
}

export default function AdminDisputesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AdminDispute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiFetch<AdminDispute[]>("/admin/disputes", { token })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "분쟁 목록을 불러오지 못했습니다."),
      );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function requestFactCheck(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/disputes/${id}/fact-check-request`, { method: "POST", token });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "사실확인 요청에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (items === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          진행중인 분쟁이 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {d.booking.customer.name} ↔ {d.booking.photographer.businessName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {TYPE_LABEL[d.type]} · {d.raisedBy === "customer" ? "고객이 신고" : "작가가 신고"}
                    {d.photographerResponseDueAt &&
                      d.status === "fact_check_requested" &&
                      ` · 응답기한 ${new Date(d.photographerResponseDueAt).toLocaleString("ko-KR")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{STATUS_LABEL[d.status]}</Badge>
                  {d.status === "open" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === d.id}
                      onClick={() => requestFactCheck(d.id)}
                    >
                      사실확인 요청
                    </Button>
                  )}
                </div>
              </div>
              {d.status !== "resolved" ? (
                <ResolveForm dispute={d} token={token} onDone={load} />
              ) : (
                d.resolution && (
                  <p className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">
                    조정 결과: {d.resolution}
                  </p>
                )
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
