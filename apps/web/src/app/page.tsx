import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section
        className="relative flex min-h-[440px] items-center bg-cover lg:min-h-[520px]"
        style={{ backgroundImage: "url(/hero.png)", backgroundPosition: "center top" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <span className="mb-5 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/30 backdrop-blur-sm">
              씬파인더가 엄선한 작가만 · 프리미엄 촬영 매칭
            </span>
            <h1 className="break-keep text-4xl font-bold leading-snug tracking-tight text-white sm:text-5xl">
              촬영 목적에 맞는
              <br />
              <span className="box-decoration-clone rounded bg-amber-500/30 px-1.5 text-white">
                사진작가를 가장 쉽게 찾는 방법
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/80">
              행사, 가족, 커플, 여행까지 — 몇 번의 선택으로 나에게 맞는 작가를 추천받고,
              예약부터 결제·소통·결과물 전달까지 플랫폼 안에서 끝내세요.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/navigator">
                <Button size="lg">나에게 맞는 작가 찾기</Button>
              </Link>
              <Link href="/photographers">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white/10 text-white ring-1 ring-inset ring-white/40 hover:bg-white/20"
                >
                  전체 작가 둘러보기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            촬영 맡기기 전, 이런 게 걱정되시죠
          </h2>
          <p className="mt-2 text-muted-foreground">
            씬파인더는 그 불안을 없애기 위해 만들어졌어요.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              pain: "사업자 등록도 없는 작가한테 맡겨서 불안했던 경험",
              solution: "엄선된 작가만 활동해요",
              detail: "사업자 등록 인증을 마친 작가만 촬영 상품을 등록할 수 있어요",
            },
            {
              pain: "후기만 보고 골랐는데 실력이 아쉬웠던 경험",
              solution: "씬파인더가 직접 검증해요",
              detail: "관리자가 포트폴리오를 검토해 통과한 작가만 활동해요",
            },
            {
              pain: "예약금만 받고 연락이 끊긴 작가",
              solution: "결제 에스크로 보장",
              detail: "예약금·잔금은 촬영 완료 전까지 플랫폼이 안전하게 보관해요",
            },
          ].map((item) => (
            <div key={item.solution} className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">
                <span className="mr-1.5 text-danger">✕</span>
                {item.pain}
              </p>
              <div className="my-4 h-px bg-border" />
              <p className="font-semibold text-brand">
                <span className="mr-1.5">✓</span>
                {item.solution}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
