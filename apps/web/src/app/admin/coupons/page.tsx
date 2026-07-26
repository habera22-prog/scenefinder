"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminCoupon, CouponDiscountType } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

function CouponRow({
  coupon,
  token,
  onDone,
}: {
  coupon: AdminCoupon;
  token: string | null;
  onDone: () => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deactivate() {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/coupons/${coupon.id}/deactivate`, { method: "POST", token });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold text-foreground">{coupon.code}</p>
          <p className="text-sm text-muted-foreground">{coupon.name}</p>
        </div>
        <Badge className={coupon.isActive ? "" : "bg-muted text-muted-foreground"}>
          {coupon.isActive ? "사용 가능" : "비활성"}
        </Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-muted-foreground sm:grid-cols-4">
        <div>
          <dt>할인</dt>
          <dd className="text-foreground">
            {coupon.discountType === "fixed"
              ? `${coupon.discountValue.toLocaleString()}원`
              : `${coupon.discountValue}%${coupon.maxDiscountAmount ? ` (최대 ${coupon.maxDiscountAmount.toLocaleString()}원)` : ""}`}
          </dd>
        </div>
        <div>
          <dt>최소주문</dt>
          <dd className="text-foreground">
            {coupon.minOrderAmount ? `${coupon.minOrderAmount.toLocaleString()}원` : "제한 없음"}
          </dd>
        </div>
        <div>
          <dt>사용/한도</dt>
          <dd className="text-foreground">
            {coupon.redemptionCount} / {coupon.maxRedemptions ?? "무제한"}
          </dd>
        </div>
        <div>
          <dt>만료일</dt>
          <dd className="text-foreground">
            {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString("ko-KR") : "없음"}
          </dd>
        </div>
      </dl>
      {coupon.isActive && (
        <Button size="sm" variant="danger" disabled={isBusy} onClick={deactivate} className="mt-3">
          비활성화
        </Button>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

export default function AdminCouponsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AdminCoupon[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function load() {
    apiFetch<AdminCoupon[]>("/admin/coupons", { token })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "쿠폰 목록을 불러오지 못했습니다."),
      );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !discountValue) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await apiFetch("/admin/coupons", {
        method: "POST",
        token,
        body: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          discountType,
          discountValue: Number(discountValue),
          maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
          minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        },
      });
      setCode("");
      setName("");
      setDiscountValue("");
      setMaxDiscountAmount("");
      setMinOrderAmount("");
      setMaxRedemptions("");
      setExpiresAt("");
      load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "쿠폰 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
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
      <Card className="mb-4 p-4">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          새 쿠폰 발행
        </h3>
        <form onSubmit={create} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="coupon-code">쿠폰 코드</Label>
              <Input
                id="coupon-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="WELCOME10"
              />
            </div>
            <div>
              <Label htmlFor="coupon-name">쿠폰 이름</Label>
              <Input
                id="coupon-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="신규 가입 환영 쿠폰"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="discount-type">할인 방식</Label>
              <select
                id="discount-type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as CouponDiscountType)}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              >
                <option value="fixed">정액(원)</option>
                <option value="percent">정률(%)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="discount-value">할인 값</Label>
              <Input
                id="discount-value"
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "fixed" ? "10000" : "10"}
              />
            </div>
            {discountType === "percent" && (
              <div>
                <Label htmlFor="max-discount">최대 할인액(원)</Label>
                <Input
                  id="max-discount"
                  type="number"
                  value={maxDiscountAmount}
                  onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  placeholder="선택"
                />
              </div>
            )}
            <div>
              <Label htmlFor="min-order">최소 주문금액(원)</Label>
              <Input
                id="min-order"
                type="number"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                placeholder="선택"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="max-redemptions">최대 사용 횟수</Label>
              <Input
                id="max-redemptions"
                type="number"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="선택 (비우면 무제한)"
              />
            </div>
            <div>
              <Label htmlFor="expires-at">만료일</Label>
              <Input
                id="expires-at"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={isCreating} className="mt-1 w-fit">
            {isCreating ? "생성 중..." : "쿠폰 발행"}
          </Button>
        </form>
        {createError && <p className="mt-2 text-sm text-danger">{createError}</p>}
      </Card>

      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">발행된 쿠폰이 없습니다.</p>
        )}
        {items.map((c) => (
          <CouponRow key={c.id} coupon={c} token={token} onDone={load} />
        ))}
      </div>
    </div>
  );
}
