"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminUser, UserRole } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

const ROLE_LABEL: Record<UserRole, string> = {
  customer: "고객",
  photographer: "작가",
  admin: "관리자",
};

const ROLE_FILTERS: { value: UserRole | ""; label: string }[] = [
  { value: "", label: "전체" },
  { value: "customer", label: "고객" },
  { value: "photographer", label: "작가" },
  { value: "admin", label: "관리자" },
];

function UserRow({
  user,
  token,
  onDone,
}: {
  user: AdminUser;
  token: string | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function save() {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/users/${user.id}`, {
        method: "PATCH",
        token,
        body: { name, phone: phone || undefined, email },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "수정에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleStatus() {
    setIsBusy(true);
    setError(null);
    try {
      const action = user.status === "active" ? "suspend" : "activate";
      await apiFetch(`/admin/users/${user.id}/${action}`, { method: "POST", token });
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
        <Badge>{ROLE_LABEL[user.role]}</Badge>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="w-32" />
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-32" />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} className="w-48" />
        <Button size="sm" variant="secondary" disabled={isBusy} onClick={save}>
          저장
        </Button>
        <Badge className={user.status === "active" ? "" : "bg-muted text-muted-foreground"}>
          {user.status === "active" ? "활성" : user.status === "suspended" ? "정지됨" : "탈퇴"}
        </Badge>
        {user.role !== "admin" && user.status !== "withdrawn" && (
          <Button
            size="sm"
            variant={user.status === "active" ? "danger" : "primary"}
            disabled={isBusy}
            onClick={toggleStatus}
          >
            {user.status === "active" ? "정지" : "활성화"}
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [role, setRole] = useState<UserRole | "">("");
  const [items, setItems] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setItems(null);
    const qs = role ? `?role=${role}` : "";
    apiFetch<AdminUser[]>(`/admin/users${qs}`, { token })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "회원 목록을 불러오지 못했습니다."),
      );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, token]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setRole(f.value)}
            className={`rounded-full px-3 py-1 font-medium ${
              role === f.value
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {items === null ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-brand" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          해당하는 회원이 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((u) => (
            <UserRow key={u.id} user={u} token={token} onDone={load} />
          ))}
        </div>
      )}
    </div>
  );
}
