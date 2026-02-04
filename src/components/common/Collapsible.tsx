import { useRef, useState, useEffect } from "react";

export default function Collapsible({
  title,
  defaultOpen = false,
  children,
  right,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<string | number>(0);

  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      setHeight(contentRef.current.scrollHeight + "px");
    } else {
      setHeight(0);
    }
  }, [open, children]);

  return (
    <div className="glass-card collapsible" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      <button
        className="collapsible-header-btn"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div style={{ fontWeight: 600, fontSize: 16, color: '#1f2937' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {right && <div className="collapsible-right">{right}</div>}
          <div className={`chevron ${open ? "open" : ""}`} />
        </div>
      </button>

      <div
        className="collapsible-content"
        ref={contentRef}
        style={{ maxHeight: height, transition: 'max-height 0.3s ease' }}
      >
        <div style={{ padding: '0 16px 16px 16px' }}>{children}</div>
      </div>
    </div>
  );
}
