"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { PhotographerSummary, ShootCategory } from "@/lib/types";
import { CATEGORY_DETAILS } from "@/lib/discovery";
import { buttonStyles } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { PhotographerCard } from "@/components/photographers/PhotographerCard";

export default function Home() {
  const [categories, setCategories] = useState<ShootCategory[]>([]);
  const [photographers, setPhotographers] = useState<
    PhotographerSummary[] | null
  >(null);
  useEffect(() => {
    let active = true;
    apiFetch<ShootCategory[]>("/shoot-categories")
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch(() => {});
    apiFetch<PhotographerSummary[]>("/photographers")
      .then((data) => {
        if (active) setPhotographers(data.slice(0, 4));
      })
      .catch(() => {
        if (active) setPhotographers([]);
      });
    return () => {
      active = false;
    };
  }, []);
  const labels = Object.fromEntries(categories.map((c) => [c.code, c.label]));

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-9 px-5 pt-9 pb-10 lg:max-w-[1200px] lg:space-y-16 lg:px-8 lg:pt-14 lg:pb-16">
      <section
        aria-labelledby="home-title"
        className="lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-x-12"
      >
        <div className="lg:col-start-1 lg:row-start-1">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-text)]">
            <Icon name="camera" className="h-4 w-4" />
            좋은 순간, 좋은 작가와
          </p>
          <h1
            id="home-title"
            className="text-[30px] leading-[1.35] font-bold tracking-tight sm:text-4xl lg:text-[38px] xl:text-[42px]"
          >
            남기고 싶은 순간에
            <br />딱 맞는 사진작가를 찾아요
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-[var(--muted-foreground)]">
            가족의 웃음부터 특별한 행사까지.
            <br />
            마음에 드는 작품을 보고, 편하게 문의하세요.
          </p>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero.png"
            alt="해 질 무렵 바다와 산을 따라 이어지는 산책길"
            className="aspect-[2/1] w-full object-cover object-center lg:aspect-[4/3]"
            fetchPriority="high"
          />
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:mt-7 lg:flex lg:flex-wrap">
            <Link
              href="/navigator"
              className={`${buttonStyles("primary", "lg")} lg:px-5 lg:text-base`}
            >
              <Icon name="search" />내 촬영에 맞는 작가 찾기
            </Link>
            <Link
              href="/photographers"
              className={`${buttonStyles("secondary", "lg")} lg:px-5 lg:text-base`}
            >
              <span className="lg:hidden">작품 보며 직접 둘러보기</span>
              <span className="hidden lg:inline">작가 둘러보기</span>
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-3 text-center text-xs text-[var(--muted-foreground)] lg:text-left">
            로그인 없이 작품과 가격을 둘러볼 수 있어요
          </p>
        </div>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="category-title">
          <h2 id="category-title" className="text-xl font-bold">
            어떤 순간을 남기고 싶으세요?
          </h2>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5 lg:mt-6 lg:grid-cols-10 lg:gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/photographers?category=${encodeURIComponent(category.code)}`}
                className="sf-card-hover flex min-w-0 flex-col items-center gap-2 rounded-2xl bg-[var(--card)] px-1 py-4 lg:gap-3 lg:py-5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-muted)] text-[var(--brand-text)]">
                  <Icon
                    name={CATEGORY_DETAILS[category.code]?.icon || "camera"}
                    className="h-6 w-6"
                  />
                </span>
                <span className="text-center text-[13px] font-medium">
                  {category.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="photographer-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-sm text-[var(--muted-foreground)]">
              작품으로 먼저 만나보세요
            </p>
            <h2 id="photographer-title" className="text-xl font-bold">
              함께하고 싶은 사진작가
            </h2>
          </div>
          <Link
            href="/photographers"
            className="sf-link flex shrink-0 items-center gap-1 py-1 text-sm font-semibold"
          >
            전체 보기
            <Icon name="chevron" className="h-4 w-4" />
          </Link>
        </div>
        {photographers === null ? (
          <div
            className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4"
            role="status"
            aria-label="작가를 불러오는 중"
          >
            {[0, 1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-72 animate-pulse rounded-2xl bg-[var(--card)] ${n > 1 ? "hidden lg:block" : ""}`}
              />
            ))}
          </div>
        ) : photographers.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:mt-6 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {photographers.map((p) => (
              <PhotographerCard
                key={p.id}
                photographer={p}
                categoryLabels={labels}
              />
            ))}
          </div>
        ) : (
          <Card className="mt-4 p-6">
            <p className="font-semibold">어떤 촬영을 원하시나요?</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
              촬영 종류와 지역을 고르면 조건에 맞는 작가를 찾아볼 수 있어요.
            </p>
            <Link
              href="/navigator"
              className={`${buttonStyles("secondary")} mt-4 w-full`}
            >
              촬영 조건으로 찾아보기
              <Icon name="arrow" />
            </Link>
          </Card>
        )}
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title" className="text-xl font-bold">
          처음 예약해도 어렵지 않아요
        </h2>
        <Card className="mt-4 space-y-6 p-5 sm:p-6 lg:mt-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0 lg:p-8">
          {[
            {
              icon: "photo" as const,
              title: "작품과 가격을 비교해요",
              detail: "마음에 드는 사진과 촬영 상품을 찾아보세요.",
            },
            {
              icon: "message" as const,
              title: "작가에게 촬영을 문의해요",
              detail: "원하는 날짜와 장소를 보내고 견적을 받아요.",
            },
            {
              icon: "calendar" as const,
              title: "조건을 확인하고 예약해요",
              detail: "촬영 범위와 금액을 확인한 뒤 예약을 진행해요.",
            },
          ].map((item, i) => (
            <div
              key={item.title}
              className="flex items-start gap-4 lg:flex-col"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-muted)] text-[var(--brand-text)]">
                <Icon name={item.icon} />
              </span>
              <div>
                <p className="font-semibold">
                  <span className="mr-2 text-[var(--brand-text)]">{i + 1}</span>
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </Card>
        <Link
          href="/pages/how-to-use"
          className="sf-link mt-4 flex items-center justify-center gap-1 text-sm"
        >
          이용 방법 자세히 보기
          <Icon name="chevron" className="h-4 w-4" />
        </Link>
      </section>

      <Link
        href="/business-inquiry"
        className="sf-card-hover flex items-center justify-between gap-4 rounded-2xl bg-[var(--brand-muted)] p-5 lg:px-8 lg:py-6"
      >
        <div>
          <p className="font-semibold">기업·브랜드 촬영을 준비하고 있나요?</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            촬영 규모와 조건을 남겨주세요.
          </p>
        </div>
        <Icon
          name="arrow"
          className="h-5 w-5 shrink-0 text-[var(--brand-text)]"
        />
      </Link>
    </div>
  );
}
