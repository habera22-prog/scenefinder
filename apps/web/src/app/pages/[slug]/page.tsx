"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { MarkdownView } from "@/components/pages/MarkdownView";

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
  const [page, setPage] = useState<PageContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(null);
    setError(null);
    apiFetch<PageContent>(`/pages/${params.slug}`)
      .then(setPage)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "페이지를 불러오지 못했습니다."),
      );
  }, [params.slug]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row">
      <aside className="shrink-0 md:w-48">
        <nav className="flex flex-col gap-0.5 text-sm">
          {MENU.map((m) => (
            <Link
              key={m.slug}
              href={`/pages/${m.slug}`}
              className={`rounded-lg px-3 py-2 font-medium ${
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

      <Card className="min-w-0 flex-1 p-6">
        {error && <p className="text-sm text-danger">{error}</p>}
        {!page && !error && (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-brand" />
          </div>
        )}
        {page && (
          <>
            <h1 className="mb-4 text-xl font-bold text-foreground">{page.title}</h1>
            <MarkdownView content={page.content} />
          </>
        )}
      </Card>
    </div>
  );
}
