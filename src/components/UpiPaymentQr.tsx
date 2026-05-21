import { QRCodeSVG } from "qrcode.react";
import { cn } from "../lib/utils";
import type { QrStyle } from "../utils/qrStyles";

type UpiPaymentQrProps = {
  value: string;
  style: QrStyle;
  size?: number;
  centerImageSrc?: string | null;
  className?: string;
};

export default function UpiPaymentQr({
  value,
  style,
  size = 200,
  centerImageSrc,
  className,
}: UpiPaymentQrProps) {
  const logoSize = Math.round(size * 0.22);

  return (
    <div className={cn("relative mx-auto w-fit", className)}>
      <div
        className={cn("rounded-[1.75rem] bg-gradient-to-br p-[3px] shadow-lg shadow-black/10", style.frame)}
      >
        <div
          className="relative rounded-[1.6rem] p-4"
          style={{ backgroundColor: style.bg }}
        >
          <div
            className="pointer-events-none absolute inset-4 rounded-2xl border border-black/[0.04]"
            aria-hidden
          />
          <QRCodeSVG
            value={value}
            size={size}
            level="H"
            includeMargin={false}
            fgColor={style.fg}
            bgColor={style.bg}
            imageSettings={
              centerImageSrc
                ? {
                    src: centerImageSrc,
                    height: logoSize,
                    width: logoSize,
                    excavate: true,
                  }
                : undefined
            }
          />
        </div>
      </div>
      <div
        className="pointer-events-none absolute -left-1 -top-1 h-5 w-5 rounded-sm border-l-2 border-t-2 opacity-40"
        style={{ borderColor: style.fg }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-1 -top-1 h-5 w-5 rounded-sm border-r-2 border-t-2 opacity-40"
        style={{ borderColor: style.fg }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-1 -left-1 h-5 w-5 rounded-sm border-b-2 border-l-2 opacity-40"
        style={{ borderColor: style.fg }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-1 -right-1 h-5 w-5 rounded-sm border-b-2 border-r-2 opacity-40"
        style={{ borderColor: style.fg }}
        aria-hidden
      />
    </div>
  );
}
