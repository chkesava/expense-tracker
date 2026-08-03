import { Toaster } from "sonner";
import { useTheme } from "../hooks/useTheme";

const DARK_THEMES = new Set([
  "dark",
  "midnight",
  "midnight-olive",
  "cyberpunk",
  "deep-sea",
  "glass-3d",
]);

/** Capsule-style Sonner host — keep at app root so toasts survive route/modal closes. */
export default function AppToaster() {
  const { theme } = useTheme();
  const toastTheme = DARK_THEMES.has(theme) ? "dark" : "light";

  return (
    <Toaster
      position="top-center"
      theme={toastTheme}
      richColors
      closeButton
      expand
      offset={20}
      gap={12}
      visibleToasts={4}
      duration={3200}
      toastOptions={{
        className: "vault-toast-capsule",
      }}
    />
  );
}
