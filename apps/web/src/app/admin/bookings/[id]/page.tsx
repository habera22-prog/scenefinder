"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminBookingDetail } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function BookingEditForm({
  booking,
  token,
  onDone,
  onCancel,
}: {
  booking: AdminBookingDetail;
  token: string | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [shootDatetime, setShootDatetime] = useState(toDatetimeLocal(booking.shootDatetime));
  const [location, setLocation] = useState(booking.location ?? "");
  const [headcount, setHeadcount] = useState(String(booking.headcount ?? ""));
  const [purpose, setPurpose] = useState(booking.purpose ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function save() {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/bookings/${booking.id}`, {
        method: "PATCH",
        token,
        body: {
          shootDatetime: shootDatetime ? new Date(shootDatetime).toISOString() : undefined,
          location: location || undefined,
          headcount: headcount ? Number(headcount) : undefined,
          purpose: purpose || undefined,
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "수정에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Label htmlFor="edit-shoot-datetime">촬영 일시</Label>
        <Input
          id="edit-shoot-datetime"
          type="datetime-local"
          value={shootDatetime}
          onChange={(e) => setShootDatetime(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="edit-location">장소</Label>
        <Input id="edit-location" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="edit-headcount">인원</Label>
        <Input
          id="edit-headcount"
          type="number"
          value={headcount}
          onChange={(e) => setHeadcount(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="edit-purpose">목적</Label>
        <Input id="edit-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-muted-foreground">
        금액·상태는 여기서 바꿀 수 없어요 — 이미 계산된 결제·정산과 어긋날 수 있어서
        취소/환불은 별도 기능을 이용해주세요.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button size="sm" disabled={isBusy} onClick={save}>
          {isBusy ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const [booking, setBooking] = useState<AdminBookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  function load() {
    apiFetch<AdminBookingDetail>(`/admin/bookings/${params.id}`, { token })
      .then(setBooking)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "예약 정보를 불러오지 못했습니다."),
      );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="flex items-center gap-2">
            <Badge>{booking.status}</Badge>
            {!editing && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                수정
              </Button>
            )}
          </div>
        </div>
        {editing ? (
          <BookingEditForm
            booking={booking}
            token={token}
            onCancel={() => setEditing(false)}
            onDone={() => {
              setEditing(false);
              load();
            }}
          />
        ) : (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              고객: {booking.customer.name} ({booking.customer.phone ?? "-"})
            </p>
            <p>
              작가: {booking.photographer.businessName} (
              {booking.photographer.representativeName})
            </p>
            <p>
              일시:{" "}
              {booking.shootDatetime
                ? new Date(booking.shootDatetime).toLocaleString("ko-KR")
                : "미정"}
            </p>
            <p>장소: {booking.location ?? "미정"}</p>
            <p>인원: {booking.headcount ?? "-"}명</p>
            <p>목적: {booking.purpose ?? "-"}</p>
            <p>총 금액: {booking.totalAmount?.toLocaleString() ?? "-"}원</p>
            <p>
              예약금/잔금: {booking.depositAmount?.toLocaleString() ?? "-"}원 /{" "}
              {booking.balanceAmount?.toLocaleString() ?? "-"}원
            </p>
          </div>
        )}
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
