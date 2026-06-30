import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import AdminBottomNav from "./AdminBottomNav";
import { useAuth } from "../../hooks/useAuth";

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 lg:pl-64 pb-[68px] lg:pb-0">
                {/* Mobile Top Navigation */}
                <header className="sticky top-0 z-30 flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 lg:hidden">
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-slate-900 tracking-tight">Admin<span className="text-blue-600">Panel</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to="/dashboard" className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors hover:bg-slate-200">
                           <ArrowLeft size={12} /> Exit
                        </Link>
                        {user?.photoURL && (
                             <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 shrink-0">
                                 <img src={user.photoURL} alt="Admin" className="h-full w-full object-cover" />
                             </div>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
                    <Outlet />
                </main>

                {/* Mobile Bottom Navigation */}
                <AdminBottomNav />
            </div>
        </div>
    );
}
