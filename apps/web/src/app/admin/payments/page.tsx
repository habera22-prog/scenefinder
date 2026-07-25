"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminPayment } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

const TYPE_LABEL: Record<AdminPayment["type"], string> = {
  deposit: "예약금",
  balance: "잔금",
  refund: "환불",
};

function RefundForm({
  payment,
  token,
  onDone,
}: {
  payment: AdminPayment;
  token: string | null;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function submit() {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/payments/${payment.id}/refund`, {
        method: "POST",
        token,
        body: { amount: Number(amount), reason: reason || undefined },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "환불에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">환불 금액</label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs text-muted-foreground">사유</label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Button size="sm" variant="danger" disabled={isBusy} onClick={submit}>
        {isBusy ? "처리 중..." : "환불 확정"}
      </Button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}

export default function AdminPaymentsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AdminPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  function load() {
    apiFetch<AdminPayment[]>("/admin/payments?status=completed", { token })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "결제 목록을 불러오지 못했습니다."),
      );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
          완료된 결제가 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {p.booking.customer.name} → {p.booking.photographer.businessName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.paidAt && new Date(p.paidAt).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{TYPE_LABEL[p.type]}</Badge>
                  <span className="font-medium text-foreground">
                    {p.amount.toLocaleString()}원
                  </span>
                  {p.type !== "refund" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setOpenId(openId === p.id ? null : p.id)}
                    >
                      환불
                    </Button>
                  )}
                </div>
              </div>
              {openId === p.id && (
                <RefundForm
                  payment={p}
                  token={token}
                  onDone={() => {
                    setOpenId(null);
                    load();
                  }}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
