import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800 p-8 rounded-3xl shadow-[0_20px_40px_-5px_rgb(0,0,0,0.1)] relative overflow-hidden transition-colors"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

                <div className="mb-8 text-center">
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="w-16 h-16 bg-blue-50 dark:bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-sm rotate-3"
                    >
                        💸
                    </motion.div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                        {mode === "login" ? "Welcome Back" : mode === "signup" ? "Get Started" : "Reset Password"}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {mode === "login" 
                            ? "Log in to track your expenses" 
                            : mode === "signup" 
                                ? "Create an account to start tracking" 
                                : "Enter your email to reset password"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatePresence mode="wait">
                        {mode === "signup" && (
                            <motion.div
                                key="name-field"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                            Email address
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        />
                    </div>

                    {mode !== "forgot" && (
                        <div>
                            <div className="flex justify-between items-center mb-1.5 ml-1">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Password
                                </label>
                                {mode === "login" && (
                                    <button
                                        type="button"
                                        onClick={() => setMode("forgot")}
                                        className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                                    >
                                        Forgot?
                                    </button>
                                )}
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                            />
                        </div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        disabled={loading}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex justify-center items-center gap-2"
                    >
                        {loading && (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
                    </motion.button>
                </form>

                <div className="my-8 flex items-center gap-4 text-slate-400 dark:text-slate-600">
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                    <span className="text-xs font-bold uppercase tracking-wider">or continue with</span>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                </div>

                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={login}
                    className="w-full bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-sm transition-all"
                >
                    <img
                        className="w-5 h-5"
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                    />
                    <span>Google Account</span>
                </motion.button>

                <div className="mt-8 text-center text-sm font-medium">
                    {mode === "login" ? (
                        <p className="text-slate-500">
                            Don't have an account?{" "}
                            <button
                                onClick={() => setMode("signup")}
                                className="text-blue-500 hover:text-blue-600 font-bold"
                            >
                                Sign up for free
                            </button>
                        </p>
                    ) : (
                        <p className="text-slate-500">
                            Back to{" "}
                            <button
                                onClick={() => setMode("login")}
                                className="text-blue-500 hover:text-blue-600 font-bold"
                            >
                                Sign in
                            </button>
                        </p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
