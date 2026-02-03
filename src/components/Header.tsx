import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import useOnline from "../hooks/useOnline";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  //   return (
  //     <header className="app-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: '12px 16px' }}>
  //       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  //         <div style={{ fontSize: 13, color: isOnline ? "#16a34a" : "#d97706", display: 'flex', alignItems: 'center', gap: 8 }}>
  //           {isOnline ? (
  //             <span aria-hidden>🟢</span>
  //           ) : (
  //             <span aria-hidden>🟠</span>
  //           )}
  //           <span style={{ fontWeight: 600 }}>{isOnline ? "Synced" : "Offline"}</span>
  //         </div>
  //       </div>

  //       <div style={{ fontSize: 18, fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate('/expenses')}>
  //         Expense Tracker
  //       </div>

  //       <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
  //         <button
  //           ref={btnRef}
  //           onClick={() => setOpen((s) => !s)}
  //           aria-haspopup="true"
  //           aria-expanded={open}
  //           style={{ border: 'none', background: 'transparent', padding: 4, cursor: 'pointer' }}
  //           title={user?.email ?? undefined}
  //         >
  //           <img src={user?.photoURL ?? ''} alt={user?.displayName ?? 'Profile'} style={{ width: 36, height: 36, borderRadius: 999 }} />
  //         </button>

  //         {open && (
  //           <div
  //             ref={popupRef}
  //             role="dialog"
  //             aria-label="Profile menu"
  //             style={{ position: 'absolute', right: 0, top: 44, minWidth: 220, background: 'white', boxShadow: '0 6px 18px rgba(0,0,0,0.08)', borderRadius: 8, padding: 12, zIndex: 40 }}
  //           >
  //             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
  //               <img src={user?.photoURL ?? ''} alt="profile" style={{ width: 44, height: 44, borderRadius: 999 }} />
  //               <div>
  //                 <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.displayName}</div>
  //                 <div style={{ fontSize: 12, color: '#6b7280' }}>{user?.email}</div>
  //               </div>
  //             </div>

  //             <div style={{ height: 1, background: '#e6e6e6', margin: '8px 0' }} />

  //             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
  //               <button onClick={() => { setOpen(false); navigate('/settings'); }} className="muted-btn">
  //                 Settings
  //               </button>
  //               <button onClick={() => { logout(); }} className="muted-btn danger-btn">
  //                 Logout
  //               </button>
  //             </div>

  //             <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
  //               <div>{isOnline ? '✓ Synced' : 'Offline'}</div>
  //             </div>
  //           </div>
  //         )}
  //       </div>
  //     </header>
  //   );
  // }
  return (
    <header className="app-header glass flex flex-row justify-between items-center w-full">
      {/* LEFT – Online / Offline */}
      <div className="flex items-center gap-2">
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isOnline ? "var(--success)" : "var(--danger)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: isOnline ? "rgba(22, 163, 74, 0.1)" : "rgba(217, 119, 6, 0.1)",
            padding: "4px 8px",
            borderRadius: "99px",
          }}
        >
          <span aria-hidden style={{ fontSize: 10 }}>
            {isOnline ? "●" : "●"}
          </span>
          <span className="hidden sm:inline">{isOnline ? "Synced" : "Offline"}</span>
        </div>
      </div>

      {/* CENTER – Title */}
      <div
        className="app-title absolute left-1/2 transform -translate-x-1/2"
        onClick={() => navigate("/dashboard")}
        style={{
          cursor: "pointer",
          background: "linear-gradient(90deg, #1f2937, #4b5563)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textAlign: "center",
          width: "max-content",
        }}
      >
        Expense Tracker
      </div>

      {/* RIGHT – Profile */}
      <div style={{ position: "relative" }}>
        <button
          ref={btnRef}
          onClick={() => setOpen((s) => !s)}
          className="profile-btn"
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            transition: "transform 0.1s var(--ease-spring)",
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
          onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          <img
            src={user?.photoURL ?? ""}
            alt={user?.displayName ?? "Profile"}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "2px solid white",
            }}
          />
        </button>

        {open && (
          <div
            ref={popupRef}
            className="glass-card"
            style={{
              position: "absolute",
              right: 0,
              top: 50,
              minWidth: 240,
              padding: 16,
              borderRadius: 16,
              zIndex: 50,
              animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              transformOrigin: "top right",
            }}
          >
            {/* Profile info */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={user?.photoURL ?? ""}
                alt="profile"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                  {user?.displayName}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {user?.email}
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: "rgba(0,0,0,0.05)", margin: "16px 0" }} />

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/settings");
                }}
                className="menu-item"
              >
                ⚙️ Settings
              </button>

              <button
                onClick={async () => {
                  setOpen(false);
                  try {
                    await logout();
                    navigate('/');
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="menu-item danger"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .menu-item {
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          border-radius: 10px;
          border: none;
          background: transparent;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }
        .menu-item:hover {
          background: rgba(0,0,0,0.04);
        }
        .menu-item.danger {
          color: var(--danger);
        }
        .menu-item.danger:hover {
          background: rgba(220, 38, 38, 0.08);
        }
      `}</style>
    </header>
  );
}