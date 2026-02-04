import { NavLink } from "react-router-dom";



export default function BottomNav() {
  return (
    <nav className="bottom-nav glass">
      <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <span style={{ fontSize: 20 }}>🏠</span>
        <span className="nav-label">Home</span>
      </NavLink>

      <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <span style={{ fontSize: 20 }}>💸</span>
        <span className="nav-label">Expenses</span>
      </NavLink>

      <NavLink to="/add" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: "linear-gradient(135deg, hsl(221, 83%, 58%), hsl(221, 83%, 50%))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 26,
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
          marginTop: -24
        }}>
          +
        </div>
      </NavLink>

      <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <span style={{ fontSize: 20 }}>📊</span>
        <span className="nav-label">Analytics</span>
      </NavLink>

      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <span style={{ fontSize: 20 }}>⚙️</span>
        <span className="nav-label">Settings</span>
      </NavLink>
    </nav>
  );
}