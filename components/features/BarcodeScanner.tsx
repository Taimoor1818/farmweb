/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let controls: any;

    const startScanning = async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const codeReader = new BrowserMultiFormatReader();

        controls = await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, err) => {
            if (result) {
              onScan(result.getText());
              controls.stop();
            }
            if (err && err.name !== 'NotFoundException') {
              console.error(err);
            }
          }
        );
      } catch (err: any) {
        console.error(err);
        setError('Failed to start camera: ' + err.message);
      }
    };

    if (videoRef.current) {
      startScanning();
    }

    return () => {
      if (controls) {
        controls.stop();
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white p-4 rounded-lg max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
        <h2 className="text-lg font-bold mb-4 text-center">Scan Barcode</h2>
        {error ? (
          <div className="text-red-600 text-center">{error}</div>
        ) : (
          <div className="relative aspect-video bg-black rounded overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-2 border-green-500 opacity-50 pointer-events-none"></div>
          </div>
        )}
        <p className="text-sm text-gray-500 text-center mt-4">Point camera at a barcode</p>
      </div>
    </div>
  );
}
