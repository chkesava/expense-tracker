import { NavLink } from "react-router-dom";

function IconAdd({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke={active ? "#2563eb" : "#6b7280"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconList({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        stroke={active ? "#2563eb" : "#6b7280"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChart({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 19V5M10 19V10M16 19V3M22 19H2"
        stroke={active ? "#2563eb" : "#6b7280"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/add" className="nav-item">
        {({ isActive }) => (
          <>
            <IconAdd active={isActive} />
            <span className="nav-label">Add</span>
          </>
        )}
      </NavLink>

      <NavLink to="/expenses" className="nav-item">
        {({ isActive }) => (
          <>
            <IconList active={isActive} />
            <span className="nav-label">List</span>
          </>
        )}
      </NavLink>

      <NavLink to="/analytics" className="nav-item">
        {({ isActive }) => (
          <>
            <IconChart active={isActive} />
            <span className="nav-label">Stats</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}