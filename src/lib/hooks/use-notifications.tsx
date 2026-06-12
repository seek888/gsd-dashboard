"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, BellOff } from "lucide-react";
import { useToast } from "@/components/ui/toast";

// ── Browser Notification Hook ─────────────────────────────────

type NotificationEvent =
  | { type: "execution-complete"; title: string; success: boolean }
  | { type: "new-blocker"; count: number }
  | { type: "phase-complete"; phase: number; title: string }
  | { type: "wave-ready"; wave: number; phase: number };

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "denied",
  );
  const pageVisible = useRef(true);
  const { toast } = useToast();

  // 检测页面可见性
  useEffect(() => {
    const onVis = () => { pageVisible.current = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, []);

  const sendNotification = useCallback(
    (event: NotificationEvent) => {
      // 页面可见时用 Toast，不可见时用浏览器通知
      if (pageVisible.current || permission !== "granted") {
        // 页面可见 → 只用 Toast
        switch (event.type) {
          case "execution-complete":
            toast({
              type: event.success ? "success" : "error",
              title: event.title,
              description: event.success ? "执行已完成" : "执行失败",
            });
            break;
          case "new-blocker":
            toast({ type: "warning", title: `新增 ${event.count} 个阻塞项`, description: "请检查项目状态" });
            break;
          case "phase-complete":
            toast({ type: "success", title: `Phase ${event.phase} 已完成`, description: event.title });
            break;
          case "wave-ready":
            toast({ type: "info", title: `Phase ${event.phase} Wave ${event.wave} 可推进` });
            break;
        }
        return;
      }

      // 页面不可见 → 浏览器通知
      let title = "";
      let body = "";
      const icon = "";

      switch (event.type) {
        case "execution-complete":
          title = event.success ? "✅ 执行完成" : "❌ 执行失败";
          body = event.title;
          break;
        case "new-blocker":
          title = "⚠️ 新增阻塞项";
          body = `${event.count} 个新的阻塞项需要处理`;
          break;
        case "phase-complete":
          title = "🎉 Phase 完成";
          body = `Phase ${event.phase}: ${event.title}`;
          break;
        case "wave-ready":
          title = "🚀 Wave 可推进";
          body = `Phase ${event.phase} Wave ${event.wave} 已完成，可以推进`;
          break;
      }

      try {
        new Notification(title, { body, icon: icon || undefined, tag: event.type });
      } catch {
        // 某些浏览器不支持 new Notification
      }
    },
    [permission, toast],
  );

  return { permission, requestPermission, sendNotification };
}

// ── Permission Request Button ─────────────────────────────────

export function NotificationPermissionButton() {
  const { permission, requestPermission } = useBrowserNotifications();

  if (permission === "granted") {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
        <Bell className="size-3.5" />
        通知已开启
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
        <BellOff className="size-3.5" />
        通知已禁用
      </div>
    );
  }

  return (
    <button
      onClick={requestPermission}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
    >
      <Bell className="size-3.5" />
      开启通知
    </button>
  );
}
