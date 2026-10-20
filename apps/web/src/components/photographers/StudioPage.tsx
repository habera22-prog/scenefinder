import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function StudioPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[640px] space-y-6 px-5 pt-9 pb-12 lg:max-w-[1200px] lg:px-8 lg:pt-12">
      {children}
    </div>
  );
}
export function StudioLoading() {
  return (
    <div role="status" className="flex justify-center py-24">
      <Spinner className="h-8 w-8 text-[var(--brand)]" />
      <span className="sr-only">작가 정보를 불러오는 중</span>
    </div>
  );
}
export function StudioError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <Card className="p-6">
      <p role="alert" className="text-sm leading-relaxed text-[var(--danger)]">
        {message}
      </p>
      <Button variant="secondary" className="mt-4" onClick={retry}>
        다시 불러오기
      </Button>
    </Card>
  );
}
export function StudioNeedsProfile() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold">작가 프로필을 먼저 등록해주세요</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
        활동 지역과 전문 분야를 등록하고 작품을 올려주시면 관리자 심사를 받을 수
        있어요.
      </p>
      <Link href="/photographers/apply" className={`${buttonStyles()} mt-5`}>
        작가 프로필 등록하기
      </Link>
    </Card>
  );
}
