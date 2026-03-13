import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <h1 className="text-5xl font-semibold text-foreground mb-2">404</h1>
      <h2 className="text-xl font-medium text-foreground mb-2">Page not found</h2>
      <p className="text-muted-foreground text-sm mb-8 max-w-sm">
        The page you’re looking for doesn’t exist.
      </p>
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
