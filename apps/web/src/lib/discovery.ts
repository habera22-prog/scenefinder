import type { PhotographerSummary } from "./types";

export const CATEGORY_DETAILS: Record<
  string,
  {
    description: string;
    icon: "camera" | "heart" | "users" | "pin" | "briefcase" | "star";
  }
> = {
  event: { description: "소중한 행사의 모든 순간", icon: "camera" },
  anniversary: { description: "특별한 날을 오래도록", icon: "star" },
  family: { description: "우리 가족다운 자연스러움", icon: "users" },
  couple: { description: "둘이 함께하는 오늘", icon: "heart" },
  travel: { description: "여행의 순간을 한 장에", icon: "pin" },
  sports: { description: "무대와 경기의 생생함", icon: "star" },
  profile: { description: "나를 가장 잘 보여주는 사진", icon: "camera" },
  corporate: { description: "기업 행사와 비즈니스 촬영", icon: "briefcase" },
  brand: { description: "브랜드의 이야기를 담아", icon: "briefcase" },
  senior_tour: { description: "편안한 여행, 특별한 기록", icon: "pin" },
};
export function photographerName(
  photographer: Pick<PhotographerSummary, "businessName" | "displayName">,
) {
  return (
    photographer.displayName?.trim() ||
    photographer.businessName?.trim() ||
    "사진작가"
  );
}
export function koreaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  );
}
export function formatShootDate(date: string) {
  return new Date(`${date}T00:00:00+09:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  });
}

export function supportsCaptureMode(capabilities: string[], requested: string) {
  const components: Record<string, string[]> = {
    photo: ["photo"],
    drone: ["drone"],
    video: ["video"],
    photo_drone: ["photo", "drone"],
    photo_video: ["photo", "video"],
    drone_video: ["drone", "video"],
    all: ["photo", "drone", "video"],
  };
  const available = new Set(
    capabilities.flatMap((code) => components[code] || [code]),
  );
  return (components[requested] || [requested]).every((code) =>
    available.has(code),
  );
}
