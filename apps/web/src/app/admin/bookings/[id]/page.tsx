"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminBookingDetail } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const [booking, setBooking] = useState<AdminBookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AdminBookingDetail>(`/admin/bookings/${params.id}`, { token })
      .then(setBooking)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "예약 정보를 불러오지 못했습니다."),
      );
  }, [params.id, token]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!booking) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            예약 정보
          </h2>
          <Badge>{booking.status}</Badge>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            고객: {booking.customer.name} ({booking.customer.phone ?? "-"})
          </p>
          <p>
            작가: {booking.photographer.businessName} ({booking.photographer.representativeName}
            )
          </p>
          <p>
            일시:{" "}
            {booking.shootDatetime
              ? new Date(booking.shootDatetime).toLocaleString("ko-KR")
              : "미정"}
          </p>
          <p>장소: {booking.location ?? "미정"}</p>
          <p>총 금액: {booking.totalAmount?.toLocaleString() ?? "-"}원</p>
          <p>
            예약금/잔금: {booking.depositAmount?.toLocaleString() ?? "-"}원 /{" "}
            {booking.balanceAmount?.toLocaleString() ?? "-"}원
          </p>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          결제 내역
        </h2>
        {booking.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">결제 내역이 없어요.</p>
        ) : (
          <div className="flex flex-col gap-1 text-sm">
            {booking.payments.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>
                  {p.type} · {p.status}
                </span>
                <span>{p.amount.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {booking.cancellations.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            취소 이력
          </h2>
          {booking.cancellations.map((c) => (
            <p key={c.id} className="text-sm text-muted-foreground">
              {c.ruleApplied} — 환불 {c.refundAmount.toLocaleString()}원
              {c.compensationAmount ? ` · 보상 ${c.compensationAmount.toLocaleString()}원` : ""}
            </p>
          ))}
        </Card>
      )}

      {booking.disputes.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            분쟁 이력
          </h2>
          {booking.disputes.map((d) => (
            <p key={d.id} className="text-sm text-muted-foreground">
              {d.type} ({d.raisedBy}) — {d.status}
              {d.resolution ? ` · ${d.resolution}` : ""}
            </p>
          ))}
        </Card>
      )}

      {booking.review && (
        <Card className="p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            후기
          </h2>
          <p className="text-sm text-muted-foreground">
            ★ {booking.review.ratingOverall} — {booking.review.content ?? "(내용 없음)"}
          </p>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          채팅 내역
        </h2>
        {!booking.chatRoom || booking.chatRoom.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">대화 내역이 없어요.</p>
        ) : (
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto text-sm">
            {booking.chatRoom.messages.map((m) => (
              <div key={m.id} className="border-b border-border pb-2 last:border-0">
                <p className="text-xs text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString("ko-KR")}
                </p>
                <p>{m.content}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
