import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Settings, X, ArrowLeft } from "lucide-react";

interface AdminSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
    const location = useLocation();

    const navigation = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Users", href: "/admin/users", icon: Users },
        { name: "Settings", href: "/admin/settings", icon: Settings },
    ];

    const isActive = (path: string) => {
        if (path === "/admin") {
            return location.pathname === "/admin";
        }
        return location.pathname.startsWith(path);
    };

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar content */}
            <aside
                className={`fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex h-full flex-col">
                    <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
                        <span className="text-xl font-bold text-white tracking-tight">Admin<span className="text-blue-500">Panel</span></span>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                        {navigation.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => onClose()} // close mobile sidebar on navigation
                                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                        active
                                            ? "bg-blue-600/10 text-blue-500"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                                    }`}
                                >
                                    <item.icon
                                        className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                                            active ? "text-blue-500" : "text-slate-500 group-hover:text-slate-300"
                                        }`}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-slate-800">
                         <Link
                            to="/dashboard"
                            className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800 hover:text-slate-100 transition-colors"
                        >
                            <ArrowLeft className="mr-3 h-5 w-5 text-slate-500" />
                            Exit Admin
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
}
