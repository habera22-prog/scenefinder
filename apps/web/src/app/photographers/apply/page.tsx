"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  CaptureMode,
  MyPhotographerProfile,
  ShootCategory,
} from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ProfileSettings } from "@/components/photographers/ProfileSettings";
import {
  StudioPage,
  StudioLoading,
  StudioError,
} from "@/components/photographers/StudioPage";
import { usePhotographerProfile } from "@/lib/use-photographer-profile";
import { supportsCaptureMode } from "@/lib/discovery";
import { PortfolioManager } from "@/components/photographers/PortfolioManager";
import { PackageManager } from "@/components/photographers/PackageManager";

const VERIFICATION_LABEL: Record<string, string> = {
  pending: "심사 대기 중",
  verified: "인증 완료",
  rejected: "반려됨",
};

function ApplyForm({
  onApplied,
}: {
  onApplied: (p: MyPhotographerProfile) => void;
}) {
  const { token } = useAuth();
  const [categories, setCategories] = useState<ShootCategory[]>([]);
  const [captureModes, setCaptureModes] = useState<CaptureMode[]>([]);
  const [photographerType, setPhotographerType] = useState<
    "business" | "freelancer"
  >("business");
  const [businessRegNo, setBusinessRegNo] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [settlementAccount, setSettlementAccount] = useState("");
  const [settlementAccountHolder, setSettlementAccountHolder] = useState("");
  const [activeRegions, setActiveRegions] = useState("");
  const [moodTags, setMoodTags] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(
    [],
  );
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<ShootCategory[]>("/shoot-categories"),
      apiFetch<CaptureMode[]>("/capture-modes"),
    ])
      .then(([categoryOptions, captureOptions]) => {
        if (!active) return;
        setCategories(categoryOptions);
        setCaptureModes(captureOptions);
      })
      .catch(() => {
        if (active) setOptionsError(true);
      })
      .finally(() => {
        if (active) setIsLoadingOptions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function toggleCategory(code: string) {
    setSelectedCategories((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function toggleCapability(code: string) {
    setSelectedCapabilities((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selectedCategories.length === 0 || selectedCapabilities.length === 0) {
      setError("전문 분야와 촬영 방식을 각각 하나 이상 선택해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      const profile = await apiFetch<MyPhotographerProfile>(
        "/photographers/apply",
        {
          method: "POST",
          token,
          body: {
            photographerType,
            ...(photographerType === "business"
              ? { businessRegNo, businessName, representativeName }
              : {}),
            settlementAccount,
            settlementAccountHolder,
            activeRegions: activeRegions
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            moodTags: moodTags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            categories: selectedCategories.filter((code) =>
              categories.some(
                (c) =>
                  c.code === code &&
                  (!c.businessOnly || photographerType === "business"),
              ),
            ),
            captureCapabilities: selectedCapabilities,
          },
        },
      );
      onApplied(profile);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "지원 신청에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="mb-1 text-xl font-bold text-foreground">작가 지원하기</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        사업자로 지원하거나, 사업자등록 없이 프리랜서로 지원할 수 있어요. 두
        유형 모두 본인인증·계좌·포트폴리오 확인 후 관리자 승인이 있어야 활동할
        수 있습니다.
      </p>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setPhotographerType("business")}
          className={`flex-1 rounded-xl border p-3 text-sm font-medium ${
            photographerType === "business"
              ? "border-brand bg-brand-muted text-brand"
              : "border-border bg-card text-foreground"
          }`}
        >
          사업자로 지원
        </button>
        <button
          type="button"
          onClick={() => setPhotographerType("freelancer")}
          className={`flex-1 rounded-xl border p-3 text-sm font-medium ${
            photographerType === "freelancer"
              ? "border-brand bg-brand-muted text-brand"
              : "border-border bg-card text-foreground"
          }`}
        >
          프리랜서로 지원
        </button>
      </div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {photographerType === "business" && (
          <>
            <div>
              <Label htmlFor="businessRegNo">사업자등록번호</Label>
              <Input
                id="businessRegNo"
                required
                placeholder="10자리 숫자"
                value={businessRegNo}
                onChange={(e) => setBusinessRegNo(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="businessName">상호</Label>
                <Input
                  id="businessName"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="representativeName">대표자명</Label>
                <Input
                  id="representativeName"
                  required
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="settlementAccount">정산계좌</Label>
            <Input
              id="settlementAccount"
              required
              value={settlementAccount}
              onChange={(e) => setSettlementAccount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="settlementAccountHolder">예금주</Label>
            <Input
              id="settlementAccountHolder"
              required
              value={settlementAccountHolder}
              onChange={(e) => setSettlementAccountHolder(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="activeRegions">활동 지역 (쉼표로 구분)</Label>
          <Input
            id="activeRegions"
            required
            placeholder="서울, 경기"
            value={activeRegions}
            onChange={(e) => setActiveRegions(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="moodTags">분위기 태그 (쉼표로 구분)</Label>
          <Input
            id="moodTags"
            placeholder="따뜻하고 감성적, 시네마틱"
            value={moodTags}
            onChange={(e) => setMoodTags(e.target.value)}
          />
        </div>
        <div>
          <Label>전문 분야 (하나 이상 선택)</Label>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((c) => !c.businessOnly || photographerType === "business")
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.code)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    selectedCategories.includes(c.code)
                      ? "border-brand bg-brand-muted text-brand"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
          </div>
          {isLoadingOptions && (
            <p className="mt-2 text-sm text-muted-foreground">
              전문 분야를 불러오는 중이에요.
            </p>
          )}
          {!isLoadingOptions && optionsError && (
            <p className="mt-2 text-sm text-danger" role="alert">
              전문 분야 목록을 불러오지 못했어요. 페이지를 새로고침해 주세요.
            </p>
          )}
          {!isLoadingOptions && !optionsError && categories.length === 0 && (
            <p className="mt-2 text-sm text-danger" role="alert">
              선택할 전문 분야가 아직 등록되지 않았어요.
            </p>
          )}
        </div>
        <div>
          <Label>촬영 방식 (하나 이상 선택)</Label>
          <div className="flex flex-wrap gap-2">
            {captureModes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleCapability(m.code)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  selectedCapabilities.includes(m.code)
                    ? "border-brand bg-brand-muted text-brand"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {isLoadingOptions && (
            <p className="mt-2 text-sm text-muted-foreground">
              촬영 방식을 불러오는 중이에요.
            </p>
          )}
          {!isLoadingOptions && optionsError && (
            <p className="mt-2 text-sm text-danger" role="alert">
              촬영 방식 목록을 불러오지 못했어요. 페이지를 새로고침해 주세요.
            </p>
          )}
          {!isLoadingOptions && !optionsError && captureModes.length === 0 && (
            <p className="mt-2 text-sm text-danger" role="alert">
              선택할 촬영 방식이 아직 등록되지 않았어요.
            </p>
          )}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            isLoadingOptions ||
            optionsError ||
            categories.length === 0 ||
            captureModes.length === 0
          }
          className="mt-2"
        >
          {isSubmitting ? "제출 중..." : "지원하기"}
        </Button>
      </form>
    </Card>
  );
}

export default function PhotographerApplyPage() {
  const { profile, token, user, loading, error, reload, setProfile } =
    usePhotographerProfile();
  const [categories, setCategories] = useState<ShootCategory[]>([]);
  const [captureModes, setCaptureModes] = useState<CaptureMode[]>([]);
  const [optionsError, setOptionsError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState("basic");
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [verificationBusy, setVerificationBusy] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<ShootCategory[]>("/shoot-categories"),
      apiFetch<CaptureMode[]>("/capture-modes"),
    ])
      .then(([c, m]) => {
        if (active) {
          setCategories(c);
          setCaptureModes(m);
          setOptionsError(false);
        }
      })
      .catch(() => {
        if (active) setOptionsError(true);
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  async function requestVerification() {
    setVerificationBusy(true);
    setVerificationError(null);
    try {
      await apiFetch("/photographers/business-verification", {
        method: "POST",
        token,
      });
      reload();
    } catch (err) {
      setVerificationError(
        err instanceof ApiError ? err.message : "인증 요청을 보내지 못했어요.",
      );
    } finally {
      setVerificationBusy(false);
    }
  }
  if (loading) return <StudioLoading />;
  if (error)
    return (
      <StudioPage>
        <StudioError message={error} retry={reload} />
      </StudioPage>
    );
  if (!profile)
    return (
      <StudioPage>
        <ApplyForm onApplied={setProfile} />
      </StudioPage>
    );
  const supportedCategories = categories.filter(
    (c) =>
      profile.categories.includes(c.code) &&
      (!c.businessOnly || profile.photographerType === "business"),
  );
  const supportedModes = captureModes.filter((m) =>
    supportsCaptureMode(profile.captureCapabilities || [], m.code),
  );
  return (
    <StudioPage>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--brand-text)]">
            고객을 만날 준비
          </p>
          <h1 className="text-[26px] font-bold lg:text-[32px]">
            프로필·상품 관리
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {profile.displayName || profile.businessName || user?.name} ·{" "}
            {profile.photographerType === "freelancer"
              ? "프리랜서 작가"
              : "사업자 작가"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{VERIFICATION_LABEL[profile.verificationStatus]}</Badge>
          <Link
            href={`/photographers/${profile.id}`}
            target="_blank"
            rel="noreferrer"
            className={buttonStyles("secondary", "sm")}
          >
            고객 화면 미리보기
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </header>
      {profile.verificationStatus !== "verified" && (
        <Card className="p-5">
          <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
            {profile.verificationStatus === "rejected"
              ? "등록 정보를 보완해주세요. 심사 진행은 고객센터로 문의할 수 있어요."
              : "관리자 심사가 진행 중이에요. 작품과 기본 정보를 보완할 수 있고, 상품 등록은 승인 후 가능해요."}
          </p>
          {profile.photographerType === "business" && (
            <Button
              variant="secondary"
              className="mt-4"
              disabled={verificationBusy}
              onClick={requestVerification}
            >
              {verificationBusy ? "요청 중이에요" : "사업자 인증 요청"}
            </Button>
          )}
          {verificationError && (
            <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
              {verificationError}
            </p>
          )}
        </Card>
      )}
      {optionsError && (
        <StudioError
          message="촬영 분야와 방식을 불러오지 못했어요."
          retry={() => setRefresh((n) => n + 1)}
        />
      )}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="작가 프로필 관리"
      >
        {[
          { code: "basic", label: "기본 정보" },
          { code: "portfolio", label: "작품 관리" },
          { code: "packages", label: "촬영 상품" },
        ].map((t) => (
          <button
            key={t.code}
            type="button"
            role="tab"
            aria-selected={tab === t.code}
            aria-controls={`panel-${t.code}`}
            id={`tab-${t.code}`}
            tabIndex={tab === t.code ? 0 : -1}
            onKeyDown={(event) => {
              const tabs = Array.from(
                event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                ),
              );
              const current = tabs.indexOf(event.currentTarget);
              const next =
                event.key === "ArrowRight"
                  ? tabs[(current + 1) % tabs.length]
                  : event.key === "ArrowLeft"
                    ? tabs[(current + tabs.length - 1) % tabs.length]
                    : event.key === "Home"
                      ? tabs[0]
                      : event.key === "End"
                        ? tabs[tabs.length - 1]
                        : null;
              if (next) {
                event.preventDefault();
                next.click();
                next.focus();
              }
            }}
            onClick={() => setTab(t.code)}
            className={`sf-choice rounded-xl px-4 py-3 text-sm font-semibold`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <section
        id="panel-basic"
        role="tabpanel"
        aria-labelledby="tab-basic"
        hidden={tab !== "basic"}
      >
        <ProfileSettings
          key={profile.id}
          profile={profile}
          token={token}
          categories={categories}
          captureModes={captureModes}
          onSaved={setProfile}
        />
      </section>
      <section
        id="panel-portfolio"
        role="tabpanel"
        aria-labelledby="tab-portfolio"
        hidden={tab !== "portfolio"}
      >
        <PortfolioManager
          photographerId={profile.id}
          token={token}
          categories={supportedCategories}
          portfolios={profile.portfolios}
          onChange={(portfolios) =>
            setProfile((previous) => ({ ...previous, portfolios }))
          }
        />
      </section>
      <section
        id="panel-packages"
        role="tabpanel"
        aria-labelledby="tab-packages"
        hidden={tab !== "packages"}
      >
        <PackageManager
          photographerId={profile.id}
          token={token}
          verified={profile.verificationStatus === "verified"}
          packages={profile.packages}
          categories={supportedCategories}
          captureModes={supportedModes}
          onChange={(packages) =>
            setProfile((previous) => ({ ...previous, packages }))
          }
        />
      </section>
      <Link
        href="/studio/schedule"
        className="sf-link inline-flex items-center gap-2 text-sm"
      >
        <Icon name="calendar" />
        촬영 일정과 휴무일 관리하기
      </Link>
    </StudioPage>
  );
}
