import React from 'react';
import { Check } from 'lucide-react';

interface PremiumCheckboxProps {
    checked: boolean;
    onChange: () => void;
    className?: string;
}

export default function PremiumCheckbox({ checked, onChange, className = "" }: PremiumCheckboxProps) {
    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onChange();
            }}
            className={`
                relative w-5 h-5 rounded-lg cursor-pointer transition-all duration-300
                flex items-center justify-center border
                ${checked
                    ? 'bg-primary border-primary shadow-[0_0_15px_-3px_rgba(var(--primary-rgb),0.6)] scale-110'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                }
                ${className}
            `}
        >
            <Check
                className={`
                    w-3.5 h-3.5 text-white transition-all duration-300
                    ${checked ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 rotate-12'}
                `}
            />

            {/* Inner glow for premium feel */}
            {checked && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-white/20 to-transparent"></div>
            )}
        </div>
    );
}
