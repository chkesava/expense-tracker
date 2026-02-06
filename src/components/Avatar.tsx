import { useState, useMemo } from "react";
import { cn } from "../lib/utils";

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
        if (!name) return "bg-slate-300";
        const colors = [
            "bg-red-500",
            "bg-orange-500",
            "bg-amber-500",
            "bg-lime-500",
            "bg-green-500",
            "bg-emerald-500",
            "bg-cyan-500",
            "bg-sky-500",
            "bg-blue-500",
            "bg-indigo-500",
            "bg-violet-500",
            "bg-fuchsia-500",
            "bg-rose-500",
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
                className={cn("object-cover rounded-full", className)}
                style={{ width: size, height: size }}
                onError={() => setError(true)}
            />
        );
    }

    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-full text-white font-bold select-none",
                bgColor,
                className
            )}
            style={{
                width: size,
                height: size,
                fontSize: size * 0.4,
            }}
        >
            {initials}
        </div>
    );
}
