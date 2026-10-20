"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AppNotification } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

const POLL_INTERVAL_MS = 15000;

export function NotificationBell() {
  const { token } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function poll() {
      apiFetch<{ count: number }>("/notifications/unread-count", { token })
        .then((res) => setUnreadCount(res.count))
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      apiFetch<AppNotification[]>("/notifications", { token })
        .then(setItems)
        .catch(() => setItems([]));
    }
  }

  async function handleClickItem(n: AppNotification) {
    if (!n.isRead) {
      await apiFetch(`/notifications/${n.id}/read`, {
        method: "POST",
        token,
      }).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.type === "delivery_ready") {
      const notificationUrl = n.link
        ? new URL(n.link, window.location.origin)
        : null;
      const deliveryId = notificationUrl?.searchParams.get("deliveryId");
      const bookingId = notificationUrl?.pathname.match(
        /^\/bookings\/([^/]+)$/,
      )?.[1];
      const query = deliveryId
        ? `deliveryId=${encodeURIComponent(deliveryId)}`
        : bookingId
          ? `bookingId=${encodeURIComponent(bookingId)}`
          : "";
      router.push(`/me/photos${query ? `?${query}` : ""}`);
    } else if (n.link) {
      router.push(n.link);
    }
  }

  async function handleMarkAllRead() {
    await apiFetch("/notifications/read-all", { method: "POST", token }).catch(
      () => {},
    );
    setUnreadCount(0);
    setItems((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="sf-button-ghost relative flex h-10 w-10 items-center justify-center rounded-xl"
        aria-label="알림"
        aria-expanded={open}
        aria-controls="notification-panel"
      >
        <Icon name="bell" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-panel"
          role="region"
          aria-label="알림 목록"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className="fixed top-16 right-5 left-5 z-50 mx-auto max-w-[600px] overflow-hidden rounded-2xl bg-[var(--card)] shadow-lg md:absolute md:top-full md:right-0 md:left-auto md:mt-2 md:w-80"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-sm font-semibold text-foreground">알림</span>
            <button
              onClick={handleMarkAllRead}
              className="sf-link rounded-lg px-2 py-3 text-sm"
            >
              모두 읽음
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items === null ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                불러오는 중...
              </p>
            ) : items.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                알림이 없어요.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickItem(n)}
                  className={`sf-button-ghost block w-full border-b border-border px-4 py-3 text-left last:border-0 ${
                    n.isRead ? "" : "bg-brand-muted/40"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">
                    {n.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("ko-KR")}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
