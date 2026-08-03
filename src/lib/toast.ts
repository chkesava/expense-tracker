import { toast as sonnerToast, type ExternalToast } from "sonner";
import type { ReactElement, ReactNode } from "react";

/** Legacy react-toastify option names still used in a few call sites. */
type LegacyOptions = ExternalToast & {
  autoClose?: number | false;
  icon?: ReactNode | false;
  className?: string;
};

type RenderToast = (props: { closeToast?: () => void }) => ReactNode;
type ToastMessage = string | ReactNode | RenderToast;

function mapOptions(options?: LegacyOptions): ExternalToast | undefined {
  if (!options) return undefined;
  const { autoClose, icon, className, ...rest } = options;
  const mapped: ExternalToast = { ...rest };
  if (autoClose !== undefined) {
    mapped.duration = autoClose === false ? Infinity : autoClose;
  }
  if (icon !== undefined && icon !== false) {
    mapped.icon = icon;
  }
  if (className) {
    mapped.className = className;
  }
  return mapped;
}

function show(
  kind: "success" | "error" | "info" | "warning" | "message",
  message: ToastMessage,
  options?: LegacyOptions
) {
  const mapped = mapOptions(options);

  if (typeof message === "function") {
    return sonnerToast.custom(
      (id) => message({ closeToast: () => sonnerToast.dismiss(id) }) as ReactElement,
      { duration: mapped?.duration ?? 8000, className: mapped?.className, ...mapped }
    );
  }

  if (kind === "message") {
    return sonnerToast(message as string | ReactNode, mapped);
  }
  return sonnerToast[kind](message as string | ReactNode, mapped);
}

/** Drop-in toast helper (Sonner capsule UI, toastify-compatible options). */
export const toast = Object.assign(
  (message: ToastMessage, options?: LegacyOptions) => show("message", message, options),
  {
    success: (message: ToastMessage, options?: LegacyOptions) => show("success", message, options),
    error: (message: ToastMessage, options?: LegacyOptions) => show("error", message, options),
    info: (message: ToastMessage, options?: LegacyOptions) => show("info", message, options),
    warning: (message: ToastMessage, options?: LegacyOptions) => show("warning", message, options),
    dismiss: sonnerToast.dismiss.bind(sonnerToast),
    promise: sonnerToast.promise.bind(sonnerToast),
    custom: sonnerToast.custom.bind(sonnerToast),
  }
);
