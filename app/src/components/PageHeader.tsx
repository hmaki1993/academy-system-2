import { ReactNode } from 'react';

interface PageHeaderProps {
    title: ReactNode;
    subtitle?: string;
    titleSuffix?: ReactNode;
    children?: ReactNode; // Right-side actions
}

export default function PageHeader({ title, subtitle, titleSuffix, children }: PageHeaderProps) {
    return (
        <div className="flex flex-row items-center justify-between gap-4 pb-6 mb-2 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-none">
                        <span className="premium-gradient-text">
                            {title}
                        </span>
                    </h1>
                    {titleSuffix && (
                        <div className="flex items-center">
                            {titleSuffix}
                        </div>
                    )}
                </div>
                {subtitle && (
                    <p className="text-muted text-[9px] font-black tracking-[0.2em] uppercase flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-primary/50 inline-block"></span>
                        {subtitle}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3 flex-wrap">
                    {children}
                </div>
            )}
        </div>
    );
}
