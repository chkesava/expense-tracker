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
    <div className="collapsible">
      <button
        className="collapsible-header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="collapsible-title">{title}</div>
        {right && <div className="collapsible-right">{right}</div>}
        <div className={`chevron ${open ? "open" : ""}`} />
      </button>

      <div
        className="collapsible-content"
        ref={contentRef}
        style={{ maxHeight: height }}
      >
        <div style={{ paddingTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}
