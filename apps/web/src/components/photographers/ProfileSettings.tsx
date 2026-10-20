"use client";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  CaptureMode,
  MyPhotographerProfile,
  ShootCategory,
} from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ProfileSettings({
  profile,
  token,
  categories,
  captureModes,
  onSaved,
}: {
  profile: MyPhotographerProfile;
  token: string | null;
  categories: ShootCategory[];
  captureModes: CaptureMode[];
  onSaved: (profile: MyPhotographerProfile) => void;
}) {
  const [name, setName] = useState(
    profile.businessName || profile.user?.name || "",
  );
  const [regions, setRegions] = useState(profile.activeRegions.join(", "));
  const [tags, setTags] = useState(profile.moodTags.join(", "));
  const [selectedCategories, setCategories] = useState(profile.categories);
  const [capabilities, setCapabilities] = useState(
    profile.captureCapabilities || [],
  );
  const [account, setAccount] = useState(profile.settlementAccount);
  const [holder, setHolder] = useState(profile.settlementAccountHolder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const activeRegions = [
      ...new Set(
        regions
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
      ),
    ];
    if (
      !name.trim() ||
      !account.trim() ||
      !holder.trim() ||
      !activeRegions.length ||
      !selectedCategories.length ||
      !capabilities.length
    ) {
      setError(
        "작가명, 활동 지역, 전문 분야, 촬영 방식과 정산 정보를 입력해주세요.",
      );
      return;
    }
    setBusy(true);
    try {
      const updated = await apiFetch<MyPhotographerProfile>(
        "/photographers/me",
        {
          method: "PATCH",
          token,
          body: {
            businessName: name.trim(),
            activeRegions,
            moodTags: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            categories: selectedCategories,
            captureCapabilities: capabilities,
            settlementAccount: account.trim(),
            settlementAccountHolder: holder.trim(),
          },
        },
      );
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "정보를 저장하지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-xl font-bold">기본 정보</h2>
      <p className="mt-2 mb-6 text-sm text-[var(--muted-foreground)]">
        고객에게 보이는 정보와 정산 정보를 관리하세요. 수정 후 저장하면
        반영돼요.
      </p>
      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="artist-name">
              고객에게 보이는 작가명
              {profile.photographerType === "business" ? " · 상호" : ""}
            </Label>
            <Input
              id="artist-name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div>
            <Label htmlFor="artist-regions">활동 지역</Label>
            <Input
              id="artist-regions"
              required
              placeholder="서울, 경기, 인천"
              value={regions}
              onChange={(e) => {
                setRegions(e.target.value);
                setSaved(false);
              }}
            />
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              여러 지역은 쉼표로 구분해주세요.
            </p>
          </div>
        </div>
        <div>
          <Label>전문 분야</Label>
          <div
            role="group"
            aria-label="전문 분야"
            className="flex flex-wrap gap-2"
          >
            {categories
              .filter(
                (c) =>
                  !c.businessOnly || profile.photographerType === "business",
              )
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={selectedCategories.includes(c.code)}
                  onClick={() => {
                    setCategories((prev) =>
                      prev.includes(c.code)
                        ? prev.filter((v) => v !== c.code)
                        : [...prev, c.code],
                    );
                    setSaved(false);
                  }}
                  className="sf-choice rounded-xl px-3 py-2 text-sm"
                >
                  {c.label}
                </button>
              ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            상품이 등록된 분야는 상품을 수정하거나 삭제한 뒤 제외할 수 있어요.
          </p>
        </div>
        <div>
          <Label>가능한 촬영 방식</Label>
          <div
            role="group"
            aria-label="가능한 촬영 방식"
            className="flex flex-wrap gap-2"
          >
            {captureModes.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={capabilities.includes(m.code)}
                onClick={() => {
                  setCapabilities((prev) =>
                    prev.includes(m.code)
                      ? prev.filter((v) => v !== m.code)
                      : [...prev, m.code],
                  );
                  setSaved(false);
                }}
                className="sf-choice rounded-xl px-3 py-2 text-sm"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="artist-tags">사진 분위기</Label>
          <Input
            id="artist-tags"
            value={tags}
            placeholder="자연스러운, 따뜻한"
            onChange={(e) => {
              setTags(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="artist-account">정산 은행·계좌번호</Label>
            <Input
              id="artist-account"
              required
              maxLength={100}
              value={account}
              onChange={(e) => {
                setAccount(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div>
            <Label htmlFor="artist-holder">예금주</Label>
            <Input
              id="artist-holder"
              required
              maxLength={100}
              value={holder}
              onChange={(e) => {
                setHolder(e.target.value);
                setSaved(false);
              }}
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-[var(--success)]">
            기본 정보를 저장했어요.
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={
            busy || categories.length === 0 || captureModes.length === 0
          }
        >
          {busy ? "저장 중이에요" : "기본 정보 저장"}
        </Button>
      </form>
    </Card>
  );
}
