import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import { cn } from "../../../lib/utils";

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[9px] font-black text-primary-foreground flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-[min(92vw,22rem)] bento-card shadow-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-xs font-black uppercase tracking-wider">Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="text-[10px] font-bold text-primary"
                  onClick={() => void markAllRead()}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">No notifications</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-muted/40",
                      !n.read && "bg-primary/5"
                    )}
                    onClick={() => {
                      if (!n.read) void markRead(n.id);
                    }}
                  >
                    <div className="text-xs font-bold">{n.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {n.body}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
