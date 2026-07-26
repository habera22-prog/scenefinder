"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AppNotification } from "@/lib/types";

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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
      await apiFetch(`/notifications/${n.id}/read`, { method: "POST", token }).catch(
        () => {},
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    await apiFetch("/notifications/read-all", { method: "POST", token }).catch(() => {});
    setUnreadCount(0);
    setItems((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="알림"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-sm font-semibold text-foreground">알림</span>
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              모두 읽음
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items === null ? (
              <p className="p-4 text-center text-sm text-muted-foreground">불러오는 중...</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                알림이 없어요.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickItem(n)}
                  className={`block w-full border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted ${
                    n.isRead ? "" : "bg-brand-muted/40"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
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
