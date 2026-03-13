import React from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
    imageUrl: string | null;
    onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;

    return (
        <div
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={onClose}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10 group active:scale-95"
            >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
            </button>
            <div
                className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={imageUrl}
                    alt="Enlarged view"
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10"
                />
            </div>
        </div>
    );
};

export default ImageLightbox;
