import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { buttonStyles } from "@/components/ui/Button";
import { MarkdownView } from "./MarkdownView";

interface ContentSection {
  title: string;
  body: string;
}

function parseSections(content: string): ContentSection[] {
  return content
    .split(/^##\s+/m)
    .slice(1)
    .map((section) => {
      const [title = "", ...body] = section.split("\n");
      return { title: title.trim(), body: body.join("\n").trim() };
    });
}

function parseBullets(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

const STEP_ICONS: IconName[] = [
  "search",
  "message",
  "check",
  "calendar",
  "camera",
];
const FEATURE_ICONS: IconName[] = [
  "shield",
  "check",
  "sparkles",
  "message",
  "users",
  "photo",
];

export function MarketingPage({
  slug,
  title,
  content,
}: {
  slug: string;
  title: string;
  content: string;
}) {
  const sections = parseSections(content);
  return slug === "how-to-use" ? (
    <HowToUsePage title={title} sections={sections} />
  ) : (
    <AboutPage title={title} sections={sections} />
  );
}

function HowToUsePage({
  title,
  sections,
}: {
  title: string;
  sections: ContentSection[];
}) {
  const helpSection = sections.find((section) =>
    section.title.includes("문제가 생겼다면"),
  );
  const steps = sections.filter((section) => section !== helpSection);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-[var(--brand-muted)] px-6 py-8 sm:px-9 sm:py-10">
        <p className="mb-3 text-sm font-semibold text-[var(--brand-text)]">
          처음 이용하시나요?
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          작가 찾기부터 촬영, 사진 확인까지 순서대로 안내해드릴게요.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {["작가 찾기", "문의·견적", "예약", "촬영", "사진 받기"].map(
            (label, index) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-2.5 text-xs font-semibold text-foreground sm:text-sm"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] text-[var(--brand-text)]">
                  {index + 1}
                </span>
                {label}
              </div>
            ),
          )}
        </div>
      </section>

      <section aria-label="이용 순서">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-foreground">이용 순서</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            각 단계에서 필요한 내용을 확인해보세요.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="relative p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-[var(--brand-muted)] px-3 py-1 text-xs font-semibold text-[var(--brand-text)]">
                  STEP {index + 1}
                </span>
                <Icon
                  name={STEP_ICONS[index] ?? "check"}
                  className="h-5 w-5 text-[var(--brand-text)]"
                />
              </div>
              <h3 className="mb-2 text-base font-bold text-foreground">
                {step.title.replace(/^\d+\.\s*/, "")}
              </h3>
              <MarkdownView content={step.body} />
            </Card>
          ))}
        </div>
      </section>

      {helpSection && (
        <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <Icon name="shield" />
            </span>
            <div>
              <h2 className="font-bold text-foreground">
                {helpSection.title.replace(/^\d+\.\s*/, "")}
              </h2>
              <div className="mt-2">
                <MarkdownView content={helpSection.body} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/me/support"
                  className={buttonStyles("secondary", "sm")}
                >
                  고객센터
                </Link>
                <Link
                  href="/pages/cancellation-policy"
                  className={buttonStyles("ghost", "sm")}
                >
                  취소·환불 정책
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function AboutPage({
  title,
  sections,
}: {
  title: string;
  sections: ContentSection[];
}) {
  const intro = sections.find((section) =>
    section.title.includes("씬파인더 소개"),
  );
  const features = sections.find((section) =>
    section.title.includes("우리가 다르게 하는 것"),
  );
  const transaction = sections.find((section) =>
    section.title.includes("거래 구조 안내"),
  );
  const featureItems = features ? parseBullets(features.body) : [];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-[var(--brand-muted)] px-6 py-8 sm:px-9 sm:py-10">
        <p className="mb-3 text-sm font-semibold text-[var(--brand-text)]">
          촬영의 시작부터 사진을 받는 순간까지
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {intro && (
          <div className="mt-4 max-w-3xl text-base leading-7 text-foreground sm:text-lg">
            <MarkdownView content={intro.body} />
          </div>
        )}
      </section>

      {features && (
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-foreground">
              {features.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              작가 탐색부터 결과물 확인까지, 이용 과정에 필요한 기능을 한곳에
              모았습니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {featureItems.map((item, index) => (
              <Card key={item} className="flex gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-muted)] text-[var(--brand-text)]">
                  <Icon
                    name={FEATURE_ICONS[index] ?? "sparkles"}
                    className="h-5 w-5"
                  />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <MarkdownView content={item} />
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {transaction && (
        <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--brand-text)]">
            거래 구조 안내
          </p>
          <h2 className="mb-3 text-lg font-bold text-foreground">
            플랫폼과 사진작가의 역할
          </h2>
          <MarkdownView content={transaction.body} />
          <Link
            href="/pages/intermediary-notice"
            className="sf-link mt-4 inline-flex items-center gap-1 text-sm font-semibold"
          >
            통신판매중개자 고지 보기
            <Icon name="chevron" className="h-4 w-4" />
          </Link>
        </section>
      )}

      <div className="flex flex-col gap-3 rounded-2xl bg-foreground p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-bold">씬파인더에서 촬영을 시작해보세요</h2>
          <p className="mt-1 text-sm text-white/75">
            촬영 목적과 분위기에 맞는 사진작가를 찾아볼 수 있어요.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/photographers"
            className={buttonStyles("primary", "sm")}
          >
            작가 둘러보기
          </Link>
          <Link
            href="/photographers/apply"
            className={buttonStyles("secondary", "sm")}
          >
            작가 지원
          </Link>
        </div>
      </div>
    </div>
  );
}
