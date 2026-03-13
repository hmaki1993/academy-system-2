import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (studentId: string) => void;
}

export default function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Delay slightly to ensure DOM is ready
            const timer = setTimeout(() => {
                scannerRef.current = new Html5QrcodeScanner(
                    "qr-reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    /* verbose= */ false
                );

                scannerRef.current.render(
                    (decodedText) => {
                        console.log('QR Scanned:', decodedText);
                        onScan(decodedText);
                        scannerRef.current?.clear();
                        onClose();
                    },
                    (error) => {
                        // Silent error as it's continuous scanning
                    }
                );
            }, 500);

            return () => {
                clearTimeout(timer);
                scannerRef.current?.clear().catch(console.error);
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative w-full max-w-md bg-[#0E1D21] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                            <Camera className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">QR Auto Check-in</h3>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Scan Student ID Card</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <div className="p-8">
                    <div id="qr-reader" className="overflow-hidden rounded-2xl border border-white/5 bg-black/40 shadow-inner"></div>
                    <p className="mt-6 text-center text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-relaxed">
                        Hold the member's QR code <br/> in front of the camera
                    </p>
                </div>
            </div>
        </div>
    );
}
