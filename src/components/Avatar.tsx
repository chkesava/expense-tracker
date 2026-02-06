import { useState, useMemo } from "react";

type AvatarProps = {
    src?: string | null;
    name?: string | null;
    size?: number;
    className?: string;
};

export default function Avatar({ src, name, size = 40, className = "" }: AvatarProps) {
    const [error, setError] = useState(false);

    const initials = useMemo(() => {
        if (!name) return "?";
        return name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }, [name]);

    const bgColor = useMemo(() => {
        if (!name) return "#cbd5e1"; // slate-300
        const colors = [
            "#ef4444", // red
            "#f97316", // orange
            "#f59e0b", // amber
            "#84cc16", // lime
            "#22c55e", // green
            "#10b981", // emerald
            "#06b6d4", // cyan
            "#0ea5e9", // sky
            "#3b82f6", // blue
            "#6366f1", // indigo
            "#8b5cf6", // violet
            "#d946ef", // fuchsia
            "#f43f5e", // rose
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }, [name]);

    if (src && !error) {
        return (
            <img
                src={src}
                alt={name ?? "Avatar"}
                className={`object-cover rounded-full ${className}`}
                style={{ width: size, height: size }}
                onError={() => setError(true)}
            />
        );
    }

    return (
        <div
            className={`flex items-center justify-center rounded-full text-white font-bold ${className}`}
            style={{
                width: size,
                height: size,
                backgroundColor: bgColor,
                fontSize: size * 0.4,
                userSelect: "none",
            }}
        >
            {initials}
        </div>
    );
}
