import React from 'react';

interface Segment {
    label: string;
    value: number;
    color: string;
}

interface PerformanceAnalyticsCardProps {
    title: string;
    totalLabel: string;
    totalValue: string | number;
    segments: Segment[];
    activeSegmentLabel?: string;
    activeSegmentValue?: string | number;
}

export default function PerformanceAnalyticsCard({
    title,
    totalLabel,
    totalValue,
    segments,
    activeSegmentLabel,
    activeSegmentValue
}: PerformanceAnalyticsCardProps) {

    // Half-donut SVG Logic
    const size = 300;
    const radius = 120;
    const strokeWidth = 35;
    const center = size / 2;
    const circumference = Math.PI * radius; // Semi-circle circumference

    let currentOffset = 0;
    const totalSegmentsValue = segments.reduce((sum, s) => sum + s.value, 0);

    return (
        <div className="glass-card p-6 h-full flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold">{title}</h3>
            </div>

            {/* Content Container */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">{totalLabel}</p>
                <h2 className="text-4xl font-bold mb-4">{totalValue}</h2>

                {/* Simplified Arc Visualization */}
                <div className="relative w-full max-w-[200px] aspect-[2/1] mt-2">
                    <svg viewBox={`0 0 ${size} ${size / 2}`} className="w-full">
                        <path
                            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
                            fill="none"
                            stroke="currentColor"
                            strokeOpacity="0.1"
                            strokeWidth={20}
                        />
                        {segments.map((segment, i) => {
                            const segmentLength = (segment.value / totalSegmentsValue) * circumference;
                            const dashArray = `${segmentLength} ${circumference * 2}`;
                            const dashOffset = -currentOffset;
                            currentOffset += segmentLength;

                            return (
                                <path
                                    key={i}
                                    d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
                                    fill="none"
                                    stroke={segment.color}
                                    strokeWidth={20}
                                    strokeDasharray={dashArray}
                                    strokeDashoffset={dashOffset}
                                />
                            );
                        })}
                    </svg>
                </div>
            </div>
        </div>
    );
}
