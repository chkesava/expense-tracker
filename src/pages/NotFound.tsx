import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-6 pb-20 pt-24 text-center text-foreground">
      <h1 className="text-6xl font-black tracking-tight text-foreground">404</h1>
      <h2 className="mt-4 text-3xl font-black tracking-tight">Page Not Found</h2>
      <p className="mt-3 text-base text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Button onClick={() => navigate("/dashboard")} className="mt-8">
        Go to Dashboard
      </Button>
    </main>
  );
}
