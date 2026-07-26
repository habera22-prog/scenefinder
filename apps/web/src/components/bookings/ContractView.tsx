"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { AppContract } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function ContractView({
  bookingId,
  token,
  side,
}: {
  bookingId: string;
  token: string | null;
  side: "customer" | "photographer";
}) {
  const [contract, setContract] = useState<AppContract | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function load() {
    try {
      const data = await apiFetch<AppContract>(`/bookings/${bookingId}/contract`, { token });
      setContract(data);
    } catch (err) {
      setContract(null);
      setError(err instanceof ApiError ? err.message : "계약서를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function sign() {
    setIsBusy(true);
    setError(null);
    try {
      const updated = await apiFetch<AppContract>(`/bookings/${bookingId}/contract/sign`, {
        method: "POST",
        token,
      });
      setContract(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "서명에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  if (contract === undefined) {
    return (
      <Card className="flex items-center justify-center p-4">
        <Spinner className="h-5 w-5 text-brand" />
      </Card>
    );
  }

  if (contract === null) {
    if (!error) return null;
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{error}</p>
      </Card>
    );
  }

  const mySignedAt = side === "customer" ? contract.customerSignedAt : contract.photographerSignedAt;
  const otherSignedAt = side === "customer" ? contract.photographerSignedAt : contract.customerSignedAt;

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          전자 계약서
        </h3>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-brand"
        >
          {expanded ? "접기" : "내용 보기"}
        </button>
      </div>

      {expanded && (
        <pre className="mb-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs text-foreground">
          {contract.content}
        </pre>
      )}

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p>고객 서명: {contract.customerSignedAt ? new Date(contract.customerSignedAt).toLocaleString("ko-KR") : "미완료"}</p>
        <p>작가 서명: {contract.photographerSignedAt ? new Date(contract.photographerSignedAt).toLocaleString("ko-KR") : "미완료"}</p>
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {!mySignedAt && (
        <Button size="sm" className="mt-3 w-full" disabled={isBusy} onClick={sign}>
          {isBusy ? "처리 중..." : "계약서에 서명하기"}
        </Button>
      )}
      {mySignedAt && !otherSignedAt && (
        <p className="mt-3 text-xs text-muted-foreground">상대방의 서명을 기다리고 있어요.</p>
      )}
      {mySignedAt && otherSignedAt && (
        <p className="mt-3 text-xs text-brand">양측 서명이 완료되었습니다.</p>
      )}
    </Card>
  );
}
