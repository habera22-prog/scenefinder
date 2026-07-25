import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-24 text-center sm:px-6">
        <span className="mb-4 inline-flex items-center rounded-full bg-brand-muted px-3 py-1 text-xs font-medium text-brand">
          질문형 촬영 네비게이터
        </span>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          촬영 목적에 맞는 사진작가를
          <br />
          가장 쉽게 찾는 방법
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          행사, 가족, 커플, 여행까지 — 몇 번의 선택으로 나에게 맞는 작가를 추천받고,
          예약부터 결제·소통·결과물 전달까지 플랫폼 안에서 끝내세요.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/navigator">
            <Button size="lg">나에게 맞는 작가 찾기</Button>
          </Link>
          <Link href="/photographers">
            <Button size="lg" variant="secondary">
              전체 작가 둘러보기
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
