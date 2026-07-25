"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminReview } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminReviewsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiFetch<AdminReview[]>("/admin/reviews", { token })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "후기 목록을 불러오지 못했습니다."),
      );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function blind(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/admin/reviews/${id}/blind`, { method: "POST", token });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "블라인드 처리에 실패했습니다.");
    } finally {
      setBusyId(null);
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
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          등록된 후기가 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <Card key={r.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-foreground">
                  {r.booking.customer.name} → {r.booking.photographer.businessName}{" "}
                  <span className="text-brand">★ {r.ratingOverall}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.content ?? "(내용 없음)"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.isBlinded ? (
                  <Badge>블라인드됨</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === r.id}
                    onClick={() => blind(r.id)}
                  >
                    블라인드 처리
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
