import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "../hooks/useUserRole";

interface AdminRouteGuardProps {
    children: ReactNode;
}

export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
    const { isAdmin, loading } = useUserRole();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
