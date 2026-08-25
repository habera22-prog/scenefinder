"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CaptureMode } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

function CaptureModeRow({
  mode,
  token,
  onDone,
}: {
  mode: CaptureMode;
  token: string | null;
  onDone: () => void;
}) {
  const [label, setLabel] = useState(mode.label);
  const [sortOrder, setSortOrder] = useState(String(mode.sortOrder));
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function save() {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/capture-modes/${mode.id}`, {
        method: "PATCH",
        token,
        body: { label, sortOrder: Number(sortOrder) },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "수정에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleActive() {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/capture-modes/${mode.id}`, {
        method: "PATCH",
        token,
        body: { isActive: !mode.isActive },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-32 shrink-0 font-mono text-xs text-muted-foreground">
          {mode.code}
        </span>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-40"
        />
        <Input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-20"
        />
        <Button size="sm" variant="secondary" disabled={isBusy} onClick={save}>
          저장
        </Button>
        <Badge className={mode.isActive ? "" : "bg-muted text-muted-foreground"}>
          {mode.isActive ? "노출중" : "비활성"}
        </Badge>
        <Button
          size="sm"
          variant={mode.isActive ? "danger" : "primary"}
          disabled={isBusy}
          onClick={toggleActive}
        >
          {mode.isActive ? "비활성화" : "활성화"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

export default function AdminCaptureModesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<CaptureMode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function load() {
    apiFetch<CaptureMode[]>("/admin/capture-modes", { token })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "촬영 방식을 불러오지 못했습니다."),
      );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !label.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await apiFetch("/admin/capture-modes", {
        method: "POST",
        token,
        body: { code: code.trim(), label: label.trim() },
      });
      setCode("");
      setLabel("");
      load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "추가에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (items === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div>
      <Card className="mb-4 p-4">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          새 촬영 방식 추가
        </h3>
        <form onSubmit={create} className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="new-code">code (영문/숫자/_)</Label>
            <Input
              id="new-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="photo_drone"
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="new-label">노출명</Label>
            <Input
              id="new-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="사진 + 드론"
              className="w-40"
            />
          </div>
          <Button type="submit" size="sm" disabled={isCreating}>
            {isCreating ? "추가 중..." : "추가"}
          </Button>
        </form>
        {createError && <p className="mt-2 text-sm text-danger">{createError}</p>}
      </Card>

      <div className="flex flex-col gap-2">
        {items.map((m) => (
          <CaptureModeRow key={m.id} mode={m} token={token} onDone={load} />
        ))}
      </div>
    </div>
  );
}
