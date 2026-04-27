import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-toastify";

type AuthMode = "login" | "signup" | "forgot";

export default function AuthPage() {
    const { login, loginWithEmail, signUpWithEmail, resetPassword } = useAuth();
    const [mode, setMode] = useState<AuthMode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === "login") {
                await loginWithEmail(email, password);
                toast.success("Welcome back!");
            } else if (mode === "signup") {
                if (!displayName) throw new Error("Please enter your name");
                await signUpWithEmail(email, password, displayName);
                toast.success("Account created successfully!");
            } else {
                await resetPassword(email);
                toast.success("Password reset email sent!");
                setMode("login");
            }
        } catch (error: any) {
            toast.error(error.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute top-[60%] -right-[5%] w-[40%] h-[40%] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo Section */}
                <div className="mb-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl shadow-slate-900/10 mx-auto mb-4">
                        <Activity size={24} />
                    </div>
                    <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">Antigravity</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Autonomous Wealth Intelligence</p>
                </div>

                <div className="bg-white dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-200 dark:border-white/5 p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                            {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
                        </h1>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                             {mode === "login" 
                                ? "Enter your credentials to access your vault." 
                                : mode === "signup" 
                                    ? "Join the network to monitor your growth." 
                                    : "We'll send recovery instructions to your inbox."}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <AnimatePresence mode="wait">
                            {mode === "signup" && (
                                <motion.div
                                    key="name-field"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-1.5"
                                >
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Identification"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@domain.com"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white"
                            />
                        </div>

                        {mode !== "forgot" && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Password
                                    </label>
                                    {mode === "login" && (
                                        <button
                                            type="button"
                                            onClick={() => setMode("forgot")}
                                            className="text-[10px] text-slate-400 hover:text-slate-900 dark:hover:text-white font-black uppercase tracking-widest transition-colors"
                                        >
                                            Lost?
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white"
                                />
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            disabled={loading}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-white/10 transition-all flex justify-center items-center gap-3 mt-4"
                        >
                            {loading && (
                                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            )}
                            {mode === "login" ? "Execute Login" : mode === "signup" ? "Create Account" : "Reset Access"}
                        </motion.button>
                    </form>

                    <div className="my-10 flex items-center gap-4">
                        <div className="h-px bg-slate-100 dark:bg-white/5 flex-1" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Social Connect</span>
                        <div className="h-px bg-slate-100 dark:bg-white/5 flex-1" />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={login}
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 text-slate-600 dark:text-slate-200 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 shadow-sm transition-all text-sm"
                    >
                        <img className="w-4 h-4" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                        <span>Google Identification</span>
                    </motion.button>

                    <div className="mt-10 text-center">
                        {mode === "login" ? (
                            <p className="text-[11px] font-medium text-slate-500">
                                New to the system?{" "}
                                <button
                                    onClick={() => setMode("signup")}
                                    className="text-slate-900 dark:text-white font-black uppercase tracking-widest ml-1 hover:underline"
                                >
                                    Join Network
                                </button>
                            </p>
                        ) : (
                            <p className="text-[11px] font-medium text-slate-500">
                                Back to system{" "}
                                <button
                                    onClick={() => setMode("login")}
                                    className="text-slate-900 dark:text-white font-black uppercase tracking-widest ml-1 hover:underline"
                                >
                                    Login
                                </button>
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
