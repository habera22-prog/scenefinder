"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { MarkdownView } from "@/components/pages/MarkdownView";
import { MarketingPage } from "@/components/pages/MarketingPage";

const MENU: { slug: string; label: string }[] = [
  { slug: "how-to-use", label: "이용방법" },
  { slug: "about", label: "회사소개" },
  { slug: "terms-of-service", label: "서비스 이용약관" },
  { slug: "photographer-terms", label: "작가 이용약관" },
  { slug: "privacy-policy", label: "개인정보처리방침" },
  { slug: "cancellation-policy", label: "취소·환불 정책" },
  { slug: "intermediary-notice", label: "통신판매중개자 고지" },
];

interface PageContent {
  slug: string;
  title: string;
  content: string;
}

export default function StaticPage() {
  const params = useParams<{ slug: string }>();
  const [result, setResult] = useState<{
    slug: string;
    page?: PageContent;
    error?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<PageContent>(`/pages/${params.slug}`)
      .then((page) => {
        if (active) setResult({ slug: params.slug, page });
      })
      .catch((err) =>
        active &&
        setResult({
          slug: params.slug,
          error:
            err instanceof ApiError
              ? err.message
              : "페이지를 불러오지 못했습니다.",
        }),
      );
    return () => {
      active = false;
    };
  }, [params.slug]);

  const page = result?.slug === params.slug ? result.page ?? null : null;
  const error = result?.slug === params.slug ? result.error ?? null : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:gap-8 md:py-12">
      <aside className="shrink-0 md:sticky md:top-24 md:w-48 md:self-start">
        <nav className="flex gap-1 overflow-x-auto pb-1 text-sm md:flex-col md:overflow-visible md:pb-0">
          {MENU.map((m) => (
            <Link
              key={m.slug}
              href={`/pages/${m.slug}`}
              className={`shrink-0 rounded-lg px-3 py-2 font-medium ${
                params.slug === m.slug
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {m.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        {error && <p className="text-sm text-danger">{error}</p>}
        {!page && !error && (
          <Card className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-brand" />
          </Card>
        )}
        {page &&
          (page.slug === "how-to-use" || page.slug === "about" ? (
            <MarketingPage
              slug={page.slug}
              title={page.title}
              content={page.content}
            />
          ) : (
            <Card className="p-6">
              <h1 className="mb-4 text-xl font-bold text-foreground">
                {page.title}
              </h1>
              <MarkdownView content={page.content} />
            </Card>
          ))}
      </main>
    </div>
  );
}
