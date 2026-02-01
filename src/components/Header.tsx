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
  <header
    className="app-header"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "12px 16px",
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    }}
  >
    {/* LEFT – Online / Offline */}
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: isOnline ? "#16a34a" : "#d97706",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span aria-hidden>
          {isOnline ? "🟢" : "🟠"}
        </span>
        {isOnline ? "Synced" : "Offline"}
      </div>
    </div>

    {/* CENTER – Title */}
    <div
      style={{
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: "-0.3px",
        cursor: "pointer",
      }}
      onClick={() => navigate("/expenses")}
    >
      Expense Tracker
    </div>

    {/* RIGHT – Profile */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        position: "relative",
      }}
    >
      <button
        ref={btnRef}
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="true"
        aria-expanded={open}
        title={user?.email ?? undefined}
        style={{
          border: "none",
          background: "transparent",
          padding: 4,
          cursor: "pointer",
        }}
      >
        <img
          src={user?.photoURL ?? ""}
          alt={user?.displayName ?? "Profile"}
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        />
      </button>

      {open && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Profile menu"
          style={{
            position: "absolute",
            right: 0,
            top: 48,
            minWidth: 240,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            boxShadow:
              "0 12px 28px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
            borderRadius: 14,
            padding: 14,
            zIndex: 40,
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {/* Profile info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={user?.photoURL ?? ""}
              alt="profile"
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {user?.displayName}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {user?.email}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              margin: "10px 0",
              background:
                "linear-gradient(to right, transparent, #e5e7eb, transparent)",
            }}
          />

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/settings");
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                background: "transparent",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "rgba(0,0,0,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              ⚙️ Settings
            </button>

            <button
              onClick={async () => { setOpen(false); try { await logout(); navigate('/'); } catch (err) { console.error(err); } }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                background: "transparent",
                fontSize: 14,
                fontWeight: 500,
                color: "#dc2626",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "rgba(220,38,38,0.08)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              🚪 Logout
            </button>
          </div>

          {/* Footer status */}
          <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
            {isOnline
              ? "✓ All changes synced"
              : "Offline — changes saved locally"}
          </div>
        </div>
      )}
    </div>

    {/* Optional animation */}
    <style>
      {`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}
    </style>
  </header>
);
}