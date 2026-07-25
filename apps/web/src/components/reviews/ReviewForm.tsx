"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ReviewForm({
  bookingId,
  token,
}: {
  bookingId: string;
  token: string | null;
}) {
  const [ratingOverall, setRatingOverall] = useState(5);
  const [ratingKindness, setRatingKindness] = useState(5);
  const [ratingPunctual, setRatingPunctual] = useState(5);
  const [ratingCommunication, setRatingCommunication] = useState(5);
  const [ratingSpeed, setRatingSpeed] = useState(5);
  const [willReuse, setWillReuse] = useState(true);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "already">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");
    try {
      await apiFetch(`/bookings/${bookingId}/review`, {
        method: "POST",
        token,
        body: {
          ratingOverall,
          ratingKindness,
          ratingPunctual,
          ratingCommunication,
          ratingSpeed,
          willReuse,
          content: content || undefined,
        },
      });
      setStatus("done");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setStatus("already");
        return;
      }
      setError(err instanceof ApiError ? err.message : "후기 등록에 실패했습니다.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        후기가 등록되었습니다. 소중한 의견 감사해요!
      </Card>
    );
  }
  if (status === "already") {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        이미 이 예약에 대한 후기를 작성하셨어요.
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        후기 작성
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <StarRating label="전체 만족도" value={ratingOverall} onChange={setRatingOverall} />
        <StarRating label="친절함" value={ratingKindness} onChange={setRatingKindness} />
        <StarRating label="시간 준수" value={ratingPunctual} onChange={setRatingPunctual} />
        <StarRating
          label="소통"
          value={ratingCommunication}
          onChange={setRatingCommunication}
        />
        <StarRating label="납품 속도" value={ratingSpeed} onChange={setRatingSpeed} />

        <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={willReuse}
            onChange={(e) => setWillReuse(e.target.checked)}
          />
          재이용 의향이 있어요
        </label>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="촬영은 어떠셨나요? (선택)"
          rows={3}
          className="mt-2 rounded-lg border border-border bg-card p-2 text-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none"
        />

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={status === "submitting"} className="mt-2">
          {status === "submitting" ? "등록 중..." : "후기 등록하기"}
        </Button>
      </form>
    </Card>
  );
}
