import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import useOnline from "../hooks/useOnline";
import Avatar from "./Avatar";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useOnline();

  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!popupRef.current || !btnRef.current) return;
      const target = e.target as Node;
      if (!popupRef.current.contains(target) && !btnRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 glass flex items-center justify-between px-6 py-3 shadow-sm"
      style={{
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.4)"
      }}
    >
      {/* LEFT – Status */}
      <div className="flex items-center gap-2" style={{ flex: 1 }}>
        <div
          className="transition-opacity hover:opacity-100"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isOnline ? "#059669" : "#dc2626", // emerald-600 : red-600
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: 16,
            cursor: "help",
            padding: "4px 8px",
            borderRadius: "6px",
            background: isOnline ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
          }}
          title={isOnline ? "Connected to database" : "Working offline - changes will sync later"}
        >
          <span className="relative flex h-2.5 w-2.5">
            {isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ background: isOnline ? "#10b981" : "#ef4444" }}
            />
          </span>
          <span style={{ letterSpacing: "0.3px" }}>
            {isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* CENTER – Title */}
      <button
        onClick={() => navigate("/dashboard")}
        className="app-title hover:scale-105 transition-transform"
        style={{
          border: 'none',
          background: 'transparent',
          cursor: "pointer",
          fontSize: 18,
          fontWeight: 800,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundImage: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
          letterSpacing: "-0.5px",
          flexShrink: 0
        }}
      >
        ExpenseTracker
      </button>

      {/* RIGHT – Profile */}
      <div className="relative" style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
        <button
          ref={btnRef}
          onClick={() => setOpen((s) => !s)}
          className="profile-btn flex items-center justify-center p-0.5 rounded-full transition-transform active:scale-95"
          style={{
            border: "2px solid rgba(255,255,255,0.8)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            background: "white"
          }}
        >
          <Avatar
            src={user?.photoURL}
            name={user?.displayName || "User"}
            size={38}
          />
        </button>

        {open && (
          <div
            ref={popupRef}
            className="glass-card"
            style={{
              position: "absolute",
              right: 0,
              top: 54,
              minWidth: 260,
              padding: 20,
              borderRadius: 24,
              zIndex: 100,
              animation: "slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              transformOrigin: "top right",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)"
            }}
          >
            {/* Profile info */}
            <div className="flex items-center gap-4 mb-4">
              <Avatar
                src={user?.photoURL}
                name={user?.displayName || "User"}
                size={56}
                className="shadow-md"
              />
              <div className="overflow-hidden">
                <div
                  className="truncate"
                  style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}
                  title={user?.displayName || ""}
                >
                  {user?.displayName || "Guest User"}
                </div>
                <div
                  className="truncate"
                  style={{ fontSize: 13, color: "#64748b" }}
                  title={user?.email || ""}
                >
                  {user?.email}
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 -20px 16px -20px" }} />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate("/settings")}
                className="menu-item group"
              >
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  ⚙️
                </span>
                <span className="font-medium">Settings</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    await logout();
                    navigate('/');
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="menu-item danger group"
              >
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 group-hover:bg-red-100 transition-colors">
                  🚪
                </span>
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .menu-item {
          width: 100%;
          text-align: left;
          padding: 8px;
          border-radius: 12px;
          border: none;
          background: transparent;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .menu-item:hover {
          background: rgba(241, 245, 249, 0.8);
          transform: translateX(4px);
        }
        .menu-item.danger {
          color: #ef4444;
          margin-top: 4px;
        }
        .menu-item.danger:hover {
          background: #fef2f2;
        }
      `}</style>
    </header>
  );
}