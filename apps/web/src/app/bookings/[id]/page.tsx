"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { RescheduleAction } from "@/components/bookings/RescheduleAction";
import { PaymentDisclosure } from "@/components/bookings/PaymentDisclosure";
import { DisputeAction } from "@/components/disputes/DisputeAction";
import { ContractView } from "@/components/bookings/ContractView";
import { CouponApply } from "@/components/bookings/CouponApply";
import { Icon } from "@/components/ui/Icon";
import { rememberAuthReturn } from "@/lib/auth-return";

const CANCELLABLE_STATUSES = [
  "inquiry",
  "quoted",
  "held",
  "deposit_paid",
  "confirmed",
];
const RESCHEDULABLE_STATUSES = ["held", "deposit_paid", "confirmed"];
const CONTRACT_VISIBLE_STATUSES = [
  "held",
  "deposit_paid",
  "confirmed",
  "completed",
  "delivered",
  "closed",
];
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
  const {
    user,
    token,
    isLoading: authLoading,
    workspaceMode,
    setWorkspaceMode,
  } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [contact, setContact] = useState<{
    customer: { name: string; phone: string; email: string };
    photographer: {
      name: string;
      phone: string;
      email: string;
      businessName: string;
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteDurationMin, setQuoteDurationMin] = useState("");
  const [showQuoteEditor, setShowQuoteEditor] = useState(false);
  const messagesPaneRef = useRef<HTMLDivElement>(null);
  const followMessagesRef = useRef(true);

  const loadBooking = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<Booking>(`/bookings/${params.id}`, { token });
      setBooking(data);
      if (user?.role === "photographer") {
        const requestedRole = new URLSearchParams(
          window.location.search,
        ).get("role");
        const nextMode =
          requestedRole === "photographer"
            ? "photographer"
            : requestedRole === "customer" && data.customerId === user.id
              ? "customer"
              : data.customerId === user.id
                ? workspaceMode
                : "photographer";
        setWorkspaceMode(nextMode);
      }
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "예약 정보를 불러오지 못했습니다.",
      );
    }
  }, [params.id, token, user, workspaceMode, setWorkspaceMode]);

  const loadMessages = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<Message[]>(
        `/bookings/${params.id}/messages`,
        { token },
      );
      setMessages(data);
    } catch {
      // 폴링 중 일시 오류는 조용히 무시
    }
  }, [params.id, token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      rememberAuthReturn(
        `/bookings/${params.id}${window.location.search}`,
      );
      router.push("/login");
      return;
    }
    const initialLoad = window.setTimeout(() => {
      void loadBooking();
      void loadMessages();
    }, 0);
    const interval = setInterval(loadMessages, 4000);
    return () => {
      window.clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [authLoading, user, router, loadBooking, loadMessages, params.id]);

  useEffect(() => {
    const pane = messagesPaneRef.current;
    if (pane && followMessagesRef.current) pane.scrollTop = pane.scrollHeight;
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
      followMessagesRef.current = true;
      loadMessages();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "메시지 전송에 실패했습니다.",
      );
    }
  }

  async function runAction(fn: () => Promise<void>) {
    setActionError(null);
    setIsBusy(true);
    try {
      await fn();
      await loadBooking();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "처리 중 오류가 발생했습니다.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function submitQuote() {
    await runAction(async () => {
      await apiFetch(`/bookings/${params.id}/quote`, {
        method: "POST",
        token,
        body: {
          totalAmount: Number(quoteAmount),
          durationMin: quoteDurationMin ? Number(quoteDurationMin) : undefined,
        },
      });
      setShowQuoteEditor(false);
    });
  }

  async function acceptQuote() {
    await runAction(async () => {
      await apiFetch(`/bookings/${params.id}/accept-quote`, {
        method: "POST",
        token,
      });
    });
  }

  async function payDeposit() {
    await runAction(async () => {
      const req = await apiFetch<{
        paymentId: string;
        orderId: string;
        amount: number;
      }>(`/bookings/${params.id}/payments/deposit`, { method: "POST", token });
      await apiFetch<Payment>(`/payments/${req.paymentId}/confirm`, {
        method: "POST",
        token,
        body: {
          paymentKey: `mock_${req.paymentId}`,
          orderId: req.orderId,
          amount: req.amount,
        },
      });
    });
  }

  async function payBalance() {
    await runAction(async () => {
      const req = await apiFetch<{
        paymentId: string;
        orderId: string;
        amount: number;
      }>(`/bookings/${params.id}/payments/balance`, { method: "POST", token });
      await apiFetch<Payment>(`/payments/${req.paymentId}/confirm`, {
        method: "POST",
        token,
        body: {
          paymentKey: `mock_${req.paymentId}`,
          orderId: req.orderId,
          amount: req.amount,
        },
      });
    });
  }

  async function markComplete() {
    await runAction(async () => {
      await apiFetch(`/bookings/${params.id}/complete`, {
        method: "POST",
        token,
      });
    });
  }

  async function confirmDelivery(deliveryId: string) {
    await runAction(async () => {
      await apiFetch(`/deliveries/${deliveryId}/confirm`, {
        method: "POST",
        token,
      });
    });
  }

  async function viewContact() {
    try {
      const data = await apiFetch<typeof contact>(
        `/bookings/${params.id}/contact`,
        { token },
      );
      setContact(data);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "연락처 조회에 실패했습니다.",
      );
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

  const isCustomerSide =
    booking.customerId === user?.id &&
    !(user?.role === "photographer" && workspaceMode === "photographer");
  const isPhotographerSide = Boolean(user && !isCustomerSide);
  const contactVisible = booking.chatRoom?.contactDisclosed ?? false;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-5 pt-9 pb-24">
      <div className="mb-6">
        <Link
          href={`/me/bookings?role=${isCustomerSide ? "customer" : "photographer"}`}
          className="sf-tab mb-5 inline-flex items-center gap-1 text-sm"
        >
          <Icon name="back" className="h-4 w-4" />내 예약으로
        </Link>
        <h1 className="text-[26px] leading-snug font-bold">
          {isCustomerSide ? "작가와 촬영을 준비해요" : "고객과 촬영을 준비해요"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {isCustomerSide
            ? "촬영 조건과 견적을 확인하고, 궁금한 점은 메시지로 물어보세요."
            : "촬영 조건을 확인하고 고객에게 답변을 보내주세요."}
        </p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="order-2 flex min-w-0 flex-1 flex-col gap-4 lg:order-1">
          <Card className="flex flex-col p-0">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-semibold">촬영 상담 메시지</h2>
            </div>
            <div
              id="booking-chat"
              ref={messagesPaneRef}
              onScroll={(event) => {
                const pane = event.currentTarget;
                followMessagesRef.current =
                  pane.scrollHeight - pane.scrollTop - pane.clientHeight < 80;
              }}
              className="scroll-mt-20 flex h-96 flex-col gap-2 overflow-y-auto p-4"
            >
              {messages.length === 0 && (
                <p className="my-auto text-center text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {isCustomerSide
                    ? "촬영 문의가 전달됐어요.\n원하는 분위기나 궁금한 점을 메시지로 남겨주세요."
                    : "새 촬영 문의가 도착했어요. 고객에게 인사와 함께 답변을 보내주세요."}
                </p>
              )}
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
            </div>
            <form
              onSubmit={sendMessage}
              className="flex gap-2 border-t border-border p-3"
            >
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="메시지를 입력하세요"
                className="min-w-0 flex-1"
              />
              <Button type="submit" className="shrink-0">
                전송
              </Button>
            </form>
            {(booking.status === "inquiry" ||
              (booking.status === "quoted" && showQuoteEditor)) &&
              isPhotographerSide && (
                <div className="flex flex-col gap-2 border-t border-border p-4">
                  <h3 className="font-semibold">
                    {booking.status === "quoted"
                      ? "견적 수정·다시 보내기"
                      : "고객에게 견적 보내기"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {booking.status === "quoted"
                      ? "금액을 고친 뒤 다시 보내면 고객에게 알림이 가요."
                      : "고객과 촬영 조건을 상담한 뒤 견적 금액을 입력해주세요."}
                  </p>
                  <Label htmlFor="quote-amount">견적 금액(원)</Label>
                  <Input
                    id="quote-amount"
                    type="number"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                  />
                  {!booking.packageId && (
                    <>
                      <Label htmlFor="quote-duration">촬영 시간(분)</Label>
                      <Input
                        id="quote-duration"
                        type="number"
                        value={quoteDurationMin}
                        onChange={(e) => setQuoteDurationMin(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        상품 없는 맞춤 견적은 분야별 시간당 최저가 검증을 위해
                        촬영 시간이 필요해요.
                      </p>
                    </>
                  )}
                  <Button
                    disabled={
                      isBusy ||
                      !quoteAmount ||
                      (!booking.packageId && !quoteDurationMin)
                    }
                    onClick={submitQuote}
                  >
                    {booking.status === "quoted"
                      ? "견적 다시 보내기"
                      : "견적 보내기"}
                  </Button>
                </div>
              )}
          </Card>
        </div>

        <div className="order-1 flex w-full flex-col gap-4 lg:order-2 lg:w-80">
          <Card className="p-4">
            <Badge>{STATUS_LABEL[booking.status] ?? booking.status}</Badge>
            {isCustomerSide && booking.photographer && (
              <p className="mt-3 text-lg font-bold">
                {booking.photographer.businessName ||
                  booking.photographer.user?.name ||
                  "사진작가"}
              </p>
            )}
            <h3 className="mt-4 mb-3 text-sm font-semibold text-muted-foreground">
              촬영 정보
            </h3>
            <dl className="flex flex-col gap-3 text-sm [&_dd]:min-w-0 [&_dd]:max-w-[70%] [&_dd]:wrap-anywhere [&_dd]:text-right [&_dt]:shrink-0">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">일시</dt>
                <dd>
                  {booking.shootDatetime
                    ? new Date(booking.shootDatetime).toLocaleString("ko-KR")
                    : "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">장소</dt>
                <dd>{booking.location ?? "-"}</dd>
              </div>
              {booking.location &&
                booking.photographer &&
                booking.photographer.activeRegions.length > 0 &&
                !booking.photographer.activeRegions.some((r) =>
                  booking.location!.includes(r),
                ) && (
                  <p className="text-xs text-amber-600">
                    작가의 활동 지역(
                    {booking.photographer.activeRegions.join(", ")}) 밖의
                    장소예요. 출장비 등 추가 협의가 필요할 수 있어요.
                  </p>
                )}
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
              <Button
                size="sm"
                variant="secondary"
                className="mt-3 w-full"
                onClick={viewContact}
              >
                연락처 보기
              </Button>
            )}
            {contact && (
              <div className="mt-2 rounded-lg bg-muted p-3 text-xs">
                <p>
                  고객: {contact.customer.name} · {contact.customer.phone}
                </p>
                <p className="mt-1">
                  작가: {contact.photographer.name} ·{" "}
                  {contact.photographer.phone}
                </p>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              다음 단계
            </h3>
            {isPhotographerSide &&
              [
                "inquiry",
                "quoted",
                "held",
                "deposit_paid",
                "confirmed",
              ].includes(booking.status) && (
                <div
                  aria-live="polite"
                  className="mb-4 rounded-xl bg-[var(--brand-muted)] p-3 text-sm leading-relaxed text-[var(--foreground)]"
                >
                  {booking.status === "inquiry" ? (
                    <>
                      먼저 고객과 촬영 상담 메시지를 나누세요. 조건과 가격을
                      합의한 뒤 견적을 보내면 고객이 수락하고 예약금을
                      결제해요.
                    </>
                  ) : booking.status === "quoted" ? (
                    <>
                      견적을 고객에게 보냈어요. 고객이 견적을 수락하고 예약금을
                      결제하면 촬영 예약이 진행돼요. 수정이 필요하면 견적을 다시
                      보낼 수 있어요.
                    </>
                  ) : booking.status === "held" ? (
                    <>
                      고객이 견적을 수락했어요. 예약금 결제를 기다리는 중이에요.
                      예약금 결제는 고객이 진행해요.
                    </>
                  ) : booking.status === "deposit_paid" ? (
                    <>
                      예약금 결제가 완료됐어요. 작가가 누르는 별도 확정 버튼은
                      없어요. 잔금 결제가 완료되면 촬영 확정 상태로 자동
                      변경됩니다.
                    </>
                  ) : booking.status === "confirmed" ? (
                    <>
                      잔금 결제까지 완료되어 촬영이 확정됐어요. 촬영을 마친 뒤
                      아래의 촬영 완료 처리를 눌러주세요.
                    </>
                  ) : null}
                  {booking.status !== "closed" &&
                    booking.status !== "cancelled" &&
                    booking.status !== "disputed" && (
                      <Link
                        href="#booking-chat"
                        className="sf-link mt-3 inline-flex items-center gap-1 font-semibold"
                      >
                        촬영 상담 메시지로 이동
                        <Icon name="chevron" className="h-4 w-4" />
                      </Link>
                    )}
                </div>
              )}
            {actionError && (
              <p className="mb-2 text-sm text-danger">{actionError}</p>
            )}

            {booking.status === "inquiry" && isCustomerSide && (
              <p className="text-sm text-muted-foreground">
                작가의 견적을 기다리고 있어요.
              </p>
            )}

            {booking.status === "quoted" && (
              <div className="flex flex-col gap-2 text-sm">
                {booking.holdExpiresAt && (
                  <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                    견적 유효시간 ·{" "}
                    {new Date(booking.holdExpiresAt).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                    까지. 유효시간이 지나면 자동 취소돼요.
                  </p>
                )}
                <p>
                  총액 {booking.totalAmount?.toLocaleString()}원 · 예약금{" "}
                  {booking.depositAmount?.toLocaleString()}원 · 잔금{" "}
                  {booking.balanceAmount?.toLocaleString()}원
                </p>
                {isCustomerSide && (
                  <CouponApply
                    booking={booking}
                    token={token}
                    onDone={loadBooking}
                  />
                )}
                {isCustomerSide ? (
                  <Button disabled={isBusy} onClick={acceptQuote}>
                    견적 수락하기
                  </Button>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      고객의 수락을 기다리고 있어요.
                    </p>
                    {!showQuoteEditor && (
                      <Button
                        variant="secondary"
                        disabled={isBusy}
                        onClick={() => {
                          setQuoteAmount(String(booking.totalAmount ?? ""));
                          setShowQuoteEditor(true);
                        }}
                      >
                        견적 수정·다시 보내기
                      </Button>
                    )}
                    <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                      다시 보내면 고객에게 알리고 유효시간이 1시간으로 갱신돼요.
                    </p>
                  </>
                )}
              </div>
            )}

            {booking.status === "held" &&
              isCustomerSide &&
              booking.photographer &&
              booking.totalAmount !== null && (
                <>
                  <PaymentDisclosure
                    photographer={booking.photographer}
                    totalAmount={booking.totalAmount}
                    payingLabel="예약금 (30%)"
                    payingAmount={booking.depositAmount ?? 0}
                  />
                  <Button
                    disabled={isBusy}
                    onClick={payDeposit}
                    className="w-full"
                  >
                    {isBusy
                      ? "처리 중..."
                      : `예약금 ${booking.depositAmount?.toLocaleString()}원 결제하기`}
                  </Button>
                </>
              )}

            {booking.status === "deposit_paid" &&
              isCustomerSide &&
              booking.photographer &&
              booking.totalAmount !== null && (
                <>
                  <PaymentDisclosure
                    photographer={booking.photographer}
                    totalAmount={booking.totalAmount}
                    payingLabel="잔금"
                    payingAmount={booking.balanceAmount ?? 0}
                  />
                  <Button
                    disabled={isBusy}
                    onClick={payBalance}
                    className="w-full"
                  >
                    {isBusy
                      ? "처리 중..."
                      : `잔금 ${booking.balanceAmount?.toLocaleString()}원 결제하기`}
                  </Button>
                </>
              )}

            {booking.status === "confirmed" && isPhotographerSide && (
              <Button
                disabled={isBusy}
                onClick={markComplete}
                className="w-full"
              >
                촬영완료 처리하기
              </Button>
            )}
            {booking.status === "confirmed" && isCustomerSide && (
              <p className="text-sm text-muted-foreground">
                작가가 촬영을 진행할 예정이에요.
              </p>
            )}

            {booking.status === "completed" && isPhotographerSide && (
              <PhotoUploadAction
                bookingId={booking.id}
                token={token}
                onDone={loadBooking}
              />
            )}
            {booking.status === "completed" && isCustomerSide && (
              <p className="text-sm text-muted-foreground">
                작가가 사진을 준비 중이에요.
              </p>
            )}

            {booking.status === "delivered" && isCustomerSide && (
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
            {booking.status === "delivered" && isPhotographerSide && (
              <p className="text-sm text-muted-foreground">
                고객의 납품 확인을 기다리고 있어요.
              </p>
            )}
            {["delivered", "closed"].includes(booking.status) &&
              isPhotographerSide &&
              booking.deliveries?.length ? (
                <PhotoShareAction bookingId={booking.id} token={token} />
              ) : null}

            {booking.status === "closed" && isPhotographerSide && (
              <p className="text-sm text-muted-foreground">
                거래가 종료되었습니다. 이용해주셔서 감사합니다.
              </p>
            )}
            {booking.status === "cancelled" && (
              <p className="text-sm text-muted-foreground">
                취소된 예약입니다.
              </p>
            )}
            {booking.status === "disputed" && (
              <p className="text-sm text-muted-foreground">
                분쟁 처리 중인 예약입니다.
              </p>
            )}

            {RESCHEDULABLE_STATUSES.includes(booking.status) && user && (
              <RescheduleAction
                bookingId={booking.id}
                token={token}
                side={isCustomerSide ? "customer" : "photographer"}
                pending={
                  booking.rescheduleRequests?.find(
                    (r) => r.status === "pending",
                  ) ?? null
                }
                onDone={loadBooking}
              />
            )}

            {CANCELLABLE_STATUSES.includes(booking.status) && user && (
              <CancelBookingAction
                bookingId={booking.id}
                token={token}
                initiatedBy={isCustomerSide ? "customer" : "photographer"}
                onCancelled={loadBooking}
              />
            )}
          </Card>

          {booking.status === "closed" && isCustomerSide && (
            <ReviewForm bookingId={booking.id} token={token} />
          )}

          {DISPUTABLE_STATUSES.includes(booking.status) && user && (
            <DisputeAction
              bookingId={booking.id}
              token={token}
              onReported={loadBooking}
            />
          )}

          {CONTRACT_VISIBLE_STATUSES.includes(booking.status) && user && (
            <ContractView
              bookingId={booking.id}
              token={token}
              side={isCustomerSide ? "customer" : "photographer"}
            />
          )}
        </div>
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
      setError(
        err instanceof ApiError ? err.message : "사진 전달에 실패했습니다.",
      );
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
      {isUploading && (
        <p className="mt-2 text-sm text-muted-foreground">업로드 중...</p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

function PhotoShareAction({
  bookingId,
  token,
}: {
  bookingId: string;
  token: string | null;
}) {
  const [shareUrl, setShareUrl] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createAndCopyLink() {
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiFetch<{ shareUrl: string; expiresAt: string }>(
        `/bookings/${bookingId}/deliveries/share-link`,
        { method: "POST", token },
      );
      setShareUrl(result.shareUrl);
      try {
        await navigator.clipboard.writeText(result.shareUrl);
        setMessage("공유 링크를 복사했어요. 고객에게 붙여넣어 보내세요.");
      } catch {
        setMessage("아래 링크를 복사해 고객에게 보내세요.");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "사진 공유 링크를 만들지 못했어요.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("공유 링크를 복사했어요.");
      setError(null);
    } catch {
      setMessage("링크를 선택해 복사해 고객에게 보내세요.");
    }
  }

  return (
    <div className="rounded-xl bg-muted p-3">
      <p className="text-sm font-semibold">사진 공유 링크</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        고객이 로그인하지 않아도 원본 사진을 확인하고 다운로드할 수 있어요.
        다운로드 기한은 납품 후 30일이에요.
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="mt-3 w-full"
        disabled={isBusy}
        onClick={createAndCopyLink}
      >
        {isBusy
          ? "공유 링크 만드는 중..."
          : shareUrl
            ? "공유 링크 다시 복사"
            : "공유 링크 만들고 복사"}
      </Button>
      {shareUrl && (
        <div className="mt-3 flex gap-2">
          <Input
            aria-label="사진 공유 링크"
            readOnly
            value={shareUrl}
            className="min-w-0 flex-1 text-xs"
          />
          <Button size="sm" variant="secondary" onClick={copyLink}>
            복사
          </Button>
        </div>
      )}
      {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
