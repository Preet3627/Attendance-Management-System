import React, { useEffect, useRef } from 'react';
import type { QrScanResult } from '../types';

declare global {
    interface Window {
        Html5QrcodeScanner: any;
        Html5QrcodeScannerState?: {
            NOT_STARTED: 0,
            SCANNING: 1,
            SUCCESS: 2,
            UNKNOWN: 3
        }
    }
}

interface QrScannerProps {
    onScanSuccess: (decodedText: string, decodedResult: any) => void;
    onScanError: (errorMessage: string) => void;
}

const QR_SCANNER_ID = "qr-reader";

const QrScanner: React.FC<QrScannerProps> = ({ onScanSuccess, onScanError }) => {
    const scannerRef = useRef<any>(null);

    useEffect(() => {
        if (window.Html5QrcodeScanner) {
            scannerRef.current = new window.Html5QrcodeScanner(
                QR_SCANNER_ID,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    supportedScanTypes: [0], // 0 for camera
                },
                false // verbose
            );
            scannerRef.current.render(onScanSuccess, onScanError);
        }

        return () => {
            if (scannerRef.current) {
                // Check if scanner is in a state where it can be cleared
                const state = scannerRef.current.getState();
                if (state && state !== 1 /* NOT_STARTED */) {
                    scannerRef.current.clear().catch((error: Error) => {
                        console.warn("Failed to clear html5-qrcode-scanner on unmount.", error);
                    });
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div id={QR_SCANNER_ID} className="w-full max-w-md mx-auto rounded-xl overflow-hidden"></div>;
};

export default QrScanner;
