"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CorporateInquiry, InquiryStatus, PartnershipInquiry } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const STATUS_LABEL: Record<InquiryStatus, string> = {
  received: "접수됨",
  reviewing: "검토중",
  matched: "배정완료",
  closed: "종료",
};

const STATUS_OPTIONS: InquiryStatus[] = ["received", "reviewing", "matched", "closed"];

function StatusControls({
  status,
  busy,
  onChange,
}: {
  status: InquiryStatus;
  busy: boolean;
  onChange: (next: InquiryStatus) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge>{STATUS_LABEL[status]}</Badge>
      {STATUS_OPTIONS.filter((s) => s !== status).map((s) => (
        <Button key={s} size="sm" variant="secondary" disabled={busy} onClick={() => onChange(s)}>
          {STATUS_LABEL[s]}로 변경
        </Button>
      ))}
    </div>
  );
}

export default function AdminInquiriesPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<"corporate" | "partnership">("corporate");
  const [corporate, setCorporate] = useState<CorporateInquiry[] | null>(null);
  const [partnership, setPartnership] = useState<PartnershipInquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiFetch<CorporateInquiry[]>("/admin/inquiries/corporate", { token })
      .then(setCorporate)
      .catch((err) => setError(err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다."));
    apiFetch<PartnershipInquiry[]>("/admin/inquiries/partnership", { token })
      .then(setPartnership)
      .catch((err) => setError(err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다."));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function updateCorporateStatus(id: string, status: InquiryStatus) {
    setBusyId(id);
    try {
      await apiFetch(`/admin/inquiries/corporate/${id}`, { method: "PATCH", token, body: { status } });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function updatePartnershipStatus(id: string, status: InquiryStatus) {
    setBusyId(id);
    try {
      await apiFetch(`/admin/inquiries/partnership/${id}`, { method: "PATCH", token, body: { status } });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 text-sm">
        <button
          onClick={() => setTab("corporate")}
          className={`rounded-full px-3 py-1 font-medium ${
            tab === "corporate" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          }`}
        >
          기업 촬영 문의
        </button>
        <button
          onClick={() => setTab("partnership")}
          className={`rounded-full px-3 py-1 font-medium ${
            tab === "partnership" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          }`}
        >
          제휴 문의
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {tab === "corporate" && (
        corporate === null ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-brand" />
          </div>
        ) : corporate.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            접수된 기업 문의가 없어요.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {corporate.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {c.companyName} <span className="text-muted-foreground">· {c.contactName}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.phone} · {c.email} ·{" "}
                      {new Date(c.createdAt).toLocaleDateString("ko-KR")} 접수
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.location ?? "장소 미정"} ·{" "}
                      {c.shootDate ? new Date(c.shootDate).toLocaleDateString("ko-KR") : "일정 미정"} ·{" "}
                      예상 {c.expectedHeadcount ?? "-"}명 · 예산 {c.budgetRange ?? "-"}
                      {c.taxInvoiceRequired && " · 세금계산서 필요"}
                    </p>
                    {c.purpose && <p className="mt-1 text-xs text-muted-foreground">목적: {c.purpose}</p>}
                    {c.notes && <p className="mt-1 text-xs text-muted-foreground">요청사항: {c.notes}</p>}
                  </div>
                  <StatusControls
                    status={c.status}
                    busy={busyId === c.id}
                    onChange={(next) => updateCorporateStatus(c.id, next)}
                  />
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "partnership" && (
        partnership === null ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-brand" />
          </div>
        ) : partnership.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            접수된 제휴 문의가 없어요.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {partnership.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {p.companyName} <span className="text-muted-foreground">· {p.contactName}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.phone} · {p.email} · {p.companyType} ·{" "}
                      {new Date(p.createdAt).toLocaleDateString("ko-KR")} 접수
                    </p>
                    {p.collaborationType && (
                      <p className="mt-1 text-xs text-muted-foreground">희망 형태: {p.collaborationType}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">제안: {p.proposal}</p>
                  </div>
                  <StatusControls
                    status={p.status}
                    busy={busyId === p.id}
                    onChange={(next) => updatePartnershipStatus(p.id, next)}
                  />
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
