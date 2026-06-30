import { AlertTriangle } from "lucide-react";

export default function MaintenanceScreen() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="h-10 w-10 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Under Maintenance</h1>
                <p className="text-slate-500 mb-6">
                    We're currently performing some updates to improve your experience. We'll be back shortly!
                </p>
                <div className="text-sm text-slate-400">
                    Thank you for your patience.
                </div>
            </div>
        </div>
    );
}
