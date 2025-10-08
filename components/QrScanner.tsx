
import React, { useEffect, useRef } from 'react';
import type { QrScanResult } from '../types';

declare global {
    interface Window {
        Html5QrcodeScanner: any;
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
        if (!scannerRef.current) {
            scannerRef.current = new window.Html5QrcodeScanner(
                QR_SCANNER_ID,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    supportedScanTypes: [0], // 0 for camera
                },
                false // verbose
            );
        }

        scannerRef.current.render(onScanSuccess, onScanError);

        return () => {
            if (scannerRef.current && scannerRef.current.getState() === 2) { // 2 is SCANNING
                scannerRef.current.clear().catch((error: Error) => {
                    console.error("Failed to clear html5-qrcode-scanner.", error);
                });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div id={QR_SCANNER_ID} className="w-full max-w-md mx-auto"></div>;
};

export default QrScanner;
