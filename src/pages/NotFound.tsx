import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      textAlign: "center",
      padding: "20px",
      color: "#374151" // gray-700
    }}>
      <h1 style={{ fontSize: "4rem", fontWeight: "bold", marginBottom: "1rem", color: "#1f2937" }}>404</h1>
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Page Not Found</h2>
      <p style={{ fontSize: "1.125rem", marginBottom: "2rem", color: "#6b7280" }}>
        The page you are looking for does not exist.
      </p>
      <button
        onClick={() => navigate("/dashboard")}
        style={{
          padding: "12px 24px",
          fontSize: "1rem",
          fontWeight: 600,
          color: "white",
          backgroundColor: "#2563eb", // blue-600
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "background-color 0.2s",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"} // blue-700
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
      >
        Go to Dashboard
      </button>
    </div>
  );
}
