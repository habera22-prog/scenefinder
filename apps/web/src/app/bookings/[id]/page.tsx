"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError, uploadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Booking, Message, Payment } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { CancelBookingAction } from "@/components/bookings/CancelBookingAction";
import { DisputeAction } from "@/components/disputes/DisputeAction";

const CANCELLABLE_STATUSES = ["inquiry", "quoted", "held", "deposit_paid", "confirmed"];
const DISPUTABLE_STATUSES = [
  "deposit_paid",
  "confirmed",
  "completed",
  "delivered",
  "closed",
  "disputed",
];

const STATUS_LABEL: Record<string, string> = {
  inquiry: "문의 접수",
  quoted: "견적 제시됨",
  held: "견적 수락 · 예약금 대기",
  deposit_paid: "예약금 결제 완료",
  confirmed: "잔금 결제 완료",
  completed: "촬영 완료",
  delivered: "사진 전달됨",
  closed: "거래 종료",
  cancelled: "취소됨",
  disputed: "분쟁 접수됨",
};

export default function BookingRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [contact, setContact] = useState<{
    customer: { name: string; phone: string; email: string };
    photographer: { name: string; phone: string; email: string; businessName: string };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadBooking = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<Booking>(`/bookings/${params.id}`, { token });
      setBooking(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "예약 정보를 불러오지 못했습니다.");
    }
  }, [params.id, token]);

  const loadMessages = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<Message[]>(`/bookings/${params.id}/messages`, { token });
      setMessages(data);
    } catch {
      // 폴링 중 일시 오류는 조용히 무시
    }
  }, [params.id, token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    loadBooking();
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [authLoading, user, router, loadBooking, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageInput.trim()) return;
    try {
      await apiFetch(`/bookings/${params.id}/messages`, {
        method: "POST",
        token,
        body: { type: "text", content: messageInput },
      });
      setMessageInput("");
      loadMessages();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "메시지 전송에 실패했습니다.");
    }
  }

  async function runAction(fn: () => Promise<void>) {
    setActionError(null);
    setIsBusy(true);
    try {
      await fn();
      await loadBooking();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "처리 중 오류가 발생했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  async function submitQuote() {
    await runAction(async () => {
      await apiFetch(`/bookings/${params.id}/quote`, {
        method: "POST",
        token,
        body: { totalAmount: Number(quoteAmount) },
      });
    });
  }

  async function acceptQuote() {
    await runAction(async () => {
      await apiFetch(`/bookings/${params.id}/accept-quote`, { method: "POST", token });
    });
  }

  async function payDeposit() {
    await runAction(async () => {
      const req = await apiFetch<{ paymentId: string; orderId: string; amount: number }>(
        `/bookings/${params.id}/payments/deposit`,
        { method: "POST", token },
      );
      await apiFetch<Payment>(`/payments/${req.paymentId}/confirm`, {
        method: "POST",
        token,
        body: { paymentKey: `mock_${req.paymentId}`, orderId: req.orderId, amount: req.amount },
      });
    });
  }

  async function payBalance() {
    await runAction(async () => {
      const req = await apiFetch<{ paymentId: string; orderId: string; amount: number }>(
        `/bookings/${params.id}/payments/balance`,
        { method: "POST", token },
      );
      await apiFetch<Payment>(`/payments/${req.paymentId}/confirm`, {
        method: "POST",
        token,
        body: { paymentKey: `mock_${req.paymentId}`, orderId: req.orderId, amount: req.amount },
      });
    });
  }

  async function markComplete() {
    await runAction(async () => {
      await apiFetch(`/bookings/${params.id}/complete`, { method: "POST", token });
    });
  }

  async function confirmDelivery(deliveryId: string) {
    await runAction(async () => {
      await apiFetch(`/deliveries/${deliveryId}/confirm`, { method: "POST", token });
    });
  }

  async function viewContact() {
    try {
      const data = await apiFetch<typeof contact>(`/bookings/${params.id}/contact`, { token });
      setContact(data);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "연락처 조회에 실패했습니다.");
    }
  }

  if (error) return <p className="p-16 text-center text-danger">{error}</p>;
  if (!booking) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  const contactVisible = booking.chatRoom?.contactDisclosed ?? false;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-4">
        <Card className="flex flex-col p-0">
          <div className="border-b border-border px-4 py-3">
            <Badge>{STATUS_LABEL[booking.status] ?? booking.status}</Badge>
          </div>
          <div className="flex h-96 flex-col gap-2 overflow-y-auto p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                  m.senderId === user?.id
                    ? "ml-auto bg-brand text-brand-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.content}
                {m.piiFlag && (
                  <p className="mt-1 text-[10px] opacity-75">
                    ⚠ 개인정보가 포함된 것으로 감지되었습니다
                  </p>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-border p-3">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="메시지를 입력하세요"
            />
            <Button type="submit">전송</Button>
          </form>
        </Card>
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-80">
        <Card className="p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            촬영 정보
          </h3>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">일시</dt>
              <dd>{booking.shootDatetime ? new Date(booking.shootDatetime).toLocaleString("ko-KR") : "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">장소</dt>
              <dd>{booking.location ?? "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">인원</dt>
              <dd>{booking.headcount ?? "-"}명</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">목적</dt>
              <dd>{booking.purpose ?? "-"}</dd>
            </div>
            {booking.totalAmount !== null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">총 금액</dt>
                <dd>{booking.totalAmount.toLocaleString()}원</dd>
              </div>
            )}
          </dl>

          {contactVisible && (
            <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={viewContact}>
              연락처 보기
            </Button>
          )}
          {contact && (
            <div className="mt-2 rounded-lg bg-muted p-3 text-xs">
              <p>고객: {contact.customer.name} · {contact.customer.phone}</p>
              <p className="mt-1">작가: {contact.photographer.name} · {contact.photographer.phone}</p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            다음 단계
          </h3>
          {actionError && <p className="mb-2 text-sm text-danger">{actionError}</p>}

          {booking.status === "inquiry" && user?.role === "photographer" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="quote-amount">견적 금액(원)</Label>
              <Input
                id="quote-amount"
                type="number"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
              />
              <Button disabled={isBusy || !quoteAmount} onClick={submitQuote}>
                견적 제시하기
              </Button>
            </div>
          )}
          {booking.status === "inquiry" && user?.role === "customer" && (
            <p className="text-sm text-muted-foreground">작가의 견적을 기다리고 있어요.</p>
          )}

          {booking.status === "quoted" && (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                예약금 {booking.depositAmount?.toLocaleString()}원 · 잔금{" "}
                {booking.balanceAmount?.toLocaleString()}원
              </p>
              {user?.role === "customer" ? (
                <Button disabled={isBusy} onClick={acceptQuote}>
                  견적 수락하기
                </Button>
              ) : (
                <p className="text-muted-foreground">고객의 수락을 기다리고 있어요.</p>
              )}
            </div>
          )}

          {booking.status === "held" && user?.role === "customer" && (
            <Button disabled={isBusy} onClick={payDeposit} className="w-full">
              {isBusy ? "처리 중..." : `예약금 ${booking.depositAmount?.toLocaleString()}원 결제하기`}
            </Button>
          )}

          {booking.status === "deposit_paid" && user?.role === "customer" && (
            <Button disabled={isBusy} onClick={payBalance} className="w-full">
              {isBusy ? "처리 중..." : `잔금 ${booking.balanceAmount?.toLocaleString()}원 결제하기`}
            </Button>
          )}

          {booking.status === "confirmed" && user?.role === "photographer" && (
            <Button disabled={isBusy} onClick={markComplete} className="w-full">
              촬영완료 처리하기
            </Button>
          )}
          {booking.status === "confirmed" && user?.role === "customer" && (
            <p className="text-sm text-muted-foreground">작가가 촬영을 진행할 예정이에요.</p>
          )}

          {booking.status === "completed" && user?.role === "photographer" && (
            <PhotoUploadAction bookingId={booking.id} token={token} onDone={loadBooking} />
          )}
          {booking.status === "completed" && user?.role === "customer" && (
            <p className="text-sm text-muted-foreground">작가가 사진을 준비 중이에요.</p>
          )}

          {booking.status === "delivered" && user?.role === "customer" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                사진이 도착했어요. 확인 후 후기를 남겨주세요.
              </p>
              {booking.deliveries?.[0] && (
                <Button
                  disabled={isBusy}
                  onClick={() => confirmDelivery(booking.deliveries![0].id)}
                >
                  납품 확인하기
                </Button>
              )}
            </div>
          )}
          {booking.status === "delivered" && user?.role === "photographer" && (
            <p className="text-sm text-muted-foreground">고객의 납품 확인을 기다리고 있어요.</p>
          )}

          {booking.status === "closed" && user?.role !== "customer" && (
            <p className="text-sm text-muted-foreground">
              거래가 종료되었습니다. 이용해주셔서 감사합니다.
            </p>
          )}
          {booking.status === "cancelled" && (
            <p className="text-sm text-muted-foreground">취소된 예약입니다.</p>
          )}
          {booking.status === "disputed" && (
            <p className="text-sm text-muted-foreground">분쟁 처리 중인 예약입니다.</p>
          )}

          {CANCELLABLE_STATUSES.includes(booking.status) && user && (
            <CancelBookingAction
              bookingId={booking.id}
              token={token}
              initiatedBy={user.role === "photographer" ? "photographer" : "customer"}
              onCancelled={loadBooking}
            />
          )}
        </Card>

        {booking.status === "closed" && user?.role === "customer" && (
          <ReviewForm bookingId={booking.id} token={token} />
        )}

        {DISPUTABLE_STATUSES.includes(booking.status) && user && (
          <DisputeAction bookingId={booking.id} token={token} onReported={loadBooking} />
        )}
      </div>
    </div>
  );
}

function PhotoUploadAction({
  bookingId,
  token,
  onDone,
}: {
  bookingId: string;
  token: string | null;
  onDone: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setIsUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const { url } = await uploadFile(file, token);
        urls.push(url);
      }
      await apiFetch(`/bookings/${bookingId}/deliveries`, {
        method: "POST",
        token,
        body: { photoUrls: urls },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "사진 전달에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <label className="block">
        <span className="mb-2 block text-sm text-muted-foreground">
          촬영본을 업로드하면 고객에게 전달됩니다.
        </span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFiles}
          disabled={isUploading}
          className="block w-full text-sm"
        />
      </label>
      {isUploading && <p className="mt-2 text-sm text-muted-foreground">업로드 중...</p>}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
