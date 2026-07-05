import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function BarcodeScanner({ onScanSuccess, onScanFailure }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Create the scanner instance if it doesn't exist
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "barcode-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 150 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true
        },
        /* verbose= */ false
      );

      scannerRef.current.render(
        (decodedText) => {
          // Pause scanning once we get a successful scan
          scannerRef.current?.pause(true);
          onScanSuccess(decodedText);
        },
        (error) => {
          if (onScanFailure) {
            onScanFailure(error);
          }
        }
      );
    }

    // Cleanup function to clear the scanner when component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }
    };
  }, [onScanSuccess, onScanFailure]);

  // Provide styling to override the ugly default UI
  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <style>
        {`
          #barcode-reader { border: none !important; }
          #barcode-reader img { display: none !important; }
          #barcode-reader__dashboard_section_csr button {
            background-color: #10b981 !important; /* emerald-500 */
            color: white !important;
            border: none !important;
            padding: 8px 16px !important;
            border-radius: 9999px !important;
            font-weight: 600 !important;
            margin-top: 10px !important;
            cursor: pointer !important;
          }
          #barcode-reader__dashboard_section_swaplink {
            text-decoration: none !important;
            color: #10b981 !important;
            font-weight: 600 !important;
            display: inline-block !important;
            margin-top: 10px !important;
          }
          #barcode-reader a { color: #10b981 !important; }
        `}
      </style>
      <div id="barcode-reader" className="w-full"></div>
    </div>
  );
}
