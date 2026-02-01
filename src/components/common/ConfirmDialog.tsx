

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message = "Are you sure?",
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
}: {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}) {
  if (!open) return null;

  return (
    <div className="confirm-overlay" role="dialog" aria-modal>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
          <div style={{ color: "#6b7280", marginBottom: 16 }}>{message}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="small-btn muted-btn" onClick={onCancel}>
              {cancelText}
            </button>
            <button className="small-btn danger-btn" onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
