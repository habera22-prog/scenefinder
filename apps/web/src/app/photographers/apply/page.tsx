"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CaptureMode, MyPhotographerProfile, ShootCategory } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PortfolioManager } from "@/components/photographers/PortfolioManager";
import { PackageManager } from "@/components/photographers/PackageManager";
import { AvailabilityManager } from "@/components/photographers/AvailabilityManager";

const VERIFICATION_LABEL: Record<string, string> = {
  pending: "심사 대기 중",
  verified: "인증 완료",
  rejected: "반려됨",
};

function ApplyForm({ onApplied }: { onApplied: (p: MyPhotographerProfile) => void }) {
  const { token } = useAuth();
  const [categories, setCategories] = useState<ShootCategory[]>([]);
  const [captureModes, setCaptureModes] = useState<CaptureMode[]>([]);
  const [photographerType, setPhotographerType] = useState<"business" | "freelancer">(
    "business",
  );
  const [businessRegNo, setBusinessRegNo] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [settlementAccount, setSettlementAccount] = useState("");
  const [settlementAccountHolder, setSettlementAccountHolder] = useState("");
  const [activeRegions, setActiveRegions] = useState("");
  const [moodTags, setMoodTags] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<ShootCategory[]>("/shoot-categories").then(setCategories).catch(() => {});
    apiFetch<CaptureMode[]>("/capture-modes").then(setCaptureModes).catch(() => {});
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
    setIsSubmitting(true);
    try {
      const profile = await apiFetch<MyPhotographerProfile>("/photographers/apply", {
        method: "POST",
        token,
        body: {
          photographerType,
          ...(photographerType === "business"
            ? { businessRegNo, businessName, representativeName }
            : {}),
          settlementAccount,
          settlementAccountHolder,
          activeRegions: activeRegions.split(",").map((s) => s.trim()).filter(Boolean),
          moodTags: moodTags.split(",").map((s) => s.trim()).filter(Boolean),
          categories: selectedCategories,
          captureCapabilities: selectedCapabilities,
        },
      });
      onApplied(profile);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "지원 신청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="mb-1 text-xl font-bold text-foreground">작가 지원하기</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        사업자로 지원하거나, 사업자등록 없이 프리랜서로 지원할 수 있어요. 두 유형 모두
        본인인증·계좌·포트폴리오 확인 후 관리자 승인이 있어야 활동할 수 있습니다.
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
          <Label>전문 분야</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
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
        </div>
        <div>
          <Label>촬영 방식 (가능한 방식을 모두 선택)</Label>
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
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "제출 중..." : "지원하기"}
        </Button>
      </form>
    </Card>
  );
}

export default function PhotographerApplyPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<MyPhotographerProfile | null | undefined>(
    undefined,
  );
  const [categories, setCategories] = useState<ShootCategory[]>([]);
  const [captureModes, setCaptureModes] = useState<CaptureMode[]>([]);

  useEffect(() => {
    apiFetch<ShootCategory[]>("/shoot-categories").then(setCategories).catch(() => {});
    apiFetch<CaptureMode[]>("/capture-modes").then(setCaptureModes).catch(() => {});
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "photographer") {
      router.push("/");
      return;
    }
    apiFetch<MyPhotographerProfile | null>("/photographers/me", { token })
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [authLoading, user, token, router]);

  async function requestVerification() {
    const updated = await apiFetch<MyPhotographerProfile>(
      "/photographers/business-verification",
      { method: "POST", token },
    );
    setProfile((prev) => (prev ? { ...prev, ...updated } : updated));
  }

  if (authLoading || profile === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-6">
        <ApplyForm onApplied={setProfile} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">
              {profile.photographerType === "freelancer" ? user?.name : profile.businessName}
            </h1>
            <Badge className={profile.photographerType === "freelancer" ? "bg-sky-100 text-sky-700" : ""}>
              {profile.photographerType === "freelancer" ? "프리랜서" : "사업자"}
            </Badge>
          </div>
          {profile.photographerType === "business" && (
            <p className="text-sm text-muted-foreground">{profile.representativeName}</p>
          )}
        </div>
        <Badge className={profile.verificationStatus === "verified" ? "" : "bg-muted text-muted-foreground"}>
          {VERIFICATION_LABEL[profile.verificationStatus]}
        </Badge>
      </div>

      {profile.photographerType === "business" && profile.verificationStatus !== "verified" && (
        <Card className="mb-6 flex items-center justify-between p-4">
          <p className="text-sm text-muted-foreground">
            사업자등록번호 형식 확인 후 관리자 최종 승인이 진행됩니다.
          </p>
          <Button size="sm" onClick={requestVerification}>
            사업자 인증 요청
          </Button>
        </Card>
      )}
      {profile.photographerType === "freelancer" && profile.verificationStatus !== "verified" && (
        <Card className="mb-6 p-4">
          <p className="text-sm text-muted-foreground">
            본인인증·계좌·포트폴리오 확인 후 관리자가 SceneFinder 인증 여부를 심사합니다. 별도로
            요청하실 절차는 없어요.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-6">
        <PortfolioManager
          photographerId={profile.id}
          token={token}
          categories={categories}
          portfolios={profile.portfolios}
          onChange={(portfolios) => setProfile({ ...profile, portfolios })}
        />
        <PackageManager
          photographerId={profile.id}
          token={token}
          verified={profile.verificationStatus === "verified"}
          packages={profile.packages}
          categories={categories}
          captureModes={captureModes}
          onChange={(packages) => setProfile({ ...profile, packages })}
        />
        <AvailabilityManager photographerId={profile.id} token={token} />
      </div>
    </div>
  );
}
