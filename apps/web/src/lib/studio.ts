import type { BookingListItem } from "./types";

export const RESERVED_STATUSES = ["held", "deposit_paid", "confirmed"];
export function bookingDate(booking: BookingListItem) {
  return booking.shootDatetime
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
        new Date(booking.shootDatetime),
      )
    : "";
}
export const STUDIO_NEXT_ACTION: Record<string, string> = {
  inquiry: "예약 카드를 열어 상담 메시지를 보내고, 협의 후 견적을 보내주세요.",
  quoted: "고객의 견적 확인을 기다려요.",
  held: "고객의 예약금 결제를 기다려요.",
  deposit_paid: "촬영 조건과 잔금 결제를 확인해주세요.",
  confirmed: "촬영을 진행한 뒤 완료 처리해주세요.",
  completed: "준비된 사진을 고객에게 전달해주세요.",
  delivered: "고객의 사진 확인을 기다려요.",
  closed: "촬영과 사진 전달이 끝났어요.",
  cancelled: "취소된 예약의 내용을 확인할 수 있어요.",
  disputed: "접수된 문제에 답변해주세요.",
};
