"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminPhotographer } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const STATUS_LABEL: Record<AdminPhotographer["verificationStatus"], string> = {
  pending: "승인 대기",
  verified: "승인됨",
  rejected: "반려/정지",
};

const FILTERS: { value: "pending" | "verified" | "rejected" | ""; label: string }[] = [
  { value: "pending", label: "승인 대기" },
  { value: "verified", label: "승인됨" },
  { value: "rejected", label: "반려/정지" },
  { value: "", label: "전체" },
];

export default function AdminPhotographersPage() {
  const { token } = useAuth();
  const [filter, setFilter] = useState<"pending" | "verified" | "rejected" | "">(
    "pending",
  );
  const [items, setItems] = useState<AdminPhotographer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setItems(null);
    const qs = filter ? `?status=${filter}` : "";
    apiFetch<AdminPhotographer[]>(`/admin/photographers${qs}`, { token })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다."),
      );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, token]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/admin/photographers/${id}/approve`, { method: "POST", token });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "승인에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function suspend(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/admin/photographers/${id}/suspend`, { method: "POST", token });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "정지에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 text-sm">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 font-medium ${
              filter === f.value
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {items === null ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-brand" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          해당하는 작가가 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-foreground">
                  {p.businessName} <span className="text-muted-foreground">· {p.representativeName}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  사업자번호 {p.businessRegNo} · {p.user.name} ({p.user.phone ?? "-"}) ·{" "}
                  {new Date(p.createdAt).toLocaleDateString("ko-KR")} 신청
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{STATUS_LABEL[p.verificationStatus]}</Badge>
                {p.verificationStatus !== "verified" && (
                  <Button
                    size="sm"
                    disabled={busyId === p.id}
                    onClick={() => approve(p.id)}
                  >
                    승인
                  </Button>
                )}
                {p.verificationStatus !== "rejected" && (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === p.id}
                    onClick={() => suspend(p.id)}
                  >
                    정지
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
