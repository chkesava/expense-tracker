import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { CATEGORIES, type Category } from "../types/expense";
import { cn } from "../lib/utils";
import { Link } from "react-router-dom";

export default function SubscriptionsPage() {
    const { subscriptions, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState<Category>("Subscriptions");
    const [day, setDay] = useState("1");

    const [isDisabled, setIsDisabled] = useState(false);
    const [countDown, setCountDown] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount || isDisabled) return;

        await addSubscription({
            name,
            amount: Number(amount),
            category,
            dayOfMonth: Number(day),
            isActive: true,
        });

        // Clear form immediately
        setName("");
        setAmount("");
        setDay("1");

        // Start 5s cooldown
        setIsDisabled(true);
        setCountDown(5);

        const timer = setInterval(() => {
            setCountDown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setIsDisabled(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Don't close the form, just clear it so user can add another if they want (after wait) or close it manually
        // setIsAdding(false); 
    };

    return (
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-xl mx-auto pt-24 pb-24 px-4 min-h-screen relative"
        >
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
                    <p className="text-muted-foreground text-sm">Manage recurring expenses</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-glow hover:shadow-glow-lg transition-all"
                >
                    {isAdding ? "Cancel" : "+ New"}
                </button>
            </header>

            <AnimatePresence>
                {isAdding && (
                    <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-8 overflow-hidden"
                        onSubmit={handleSubmit}
                    >
                        <div className="bg-card border border-border p-6 rounded-xl shadow-card space-y-4">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase">Service Name</label>
                                <input
                                    autoFocus
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 mt-1 font-semibold text-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none"
                                    placeholder="e.g. Netflix, Rent"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Amount</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                                        <input
                                            type="number"
                                            className="w-full bg-muted border border-border rounded-xl pl-8 pr-4 py-2.5 font-semibold text-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none"
                                            placeholder="0"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Day of Month</label>
                                    <select
                                        className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 mt-1 font-semibold text-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none"
                                        value={day}
                                        onChange={e => setDay(e.target.value)}
                                    >
                                        {[...Array(31)].map((_, i) => (
                                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase">Category</label>
                                <select
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 mt-1 font-semibold text-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none"
                                    value={category}
                                    onChange={e => setCategory(e.target.value as Category)}
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isDisabled}
                                className={cn(
                                    "w-full font-bold py-3 rounded-xl mt-2 shadow-lg transition-all flex items-center justify-center gap-2",
                                    isDisabled
                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                        : "bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-glow-lg"
                                )}
                            >
                                {isDisabled ? (
                                    <>
                                        <span>Added! Wait {countDown}s...</span>
                                    </>
                                ) : (
                                    "Save Subscription"
                                )}
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            <div className="space-y-4">
                {subscriptions.length === 0 && !isAdding ? (
                    <div className="text-center py-12 opacity-50">
                        <div className="text-4xl mb-4">📅</div>
                        <p>No subscriptions yet.</p>
                        <p className="text-sm">Tap "+ New" to automate a recurring bill.</p>
                    </div>
                ) : (
                    subscriptions.map(sub => (
                        <motion.div
                            layout
                            key={sub.id}
                            className={cn(
                                "group relative bg-card border rounded-xl p-5 shadow-card transition-colors",
                                sub.isActive ? "border-border" : "border-border opacity-60"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm border",
                                        sub.isActive ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted border-border text-muted-foreground"
                                    )}>
                                        {/* Using first letter or category icon logic if available */}
                                        {sub.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground">{sub.name}</h3>
                                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
                                                Day {sub.dayOfMonth}
                                            </span>
                                            <span>• {sub.category}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="font-bold text-foreground">₹{sub.amount}</div>
                                    <div className={cn("text-[10px] font-bold mt-1", sub.isActive ? "text-success" : "text-muted-foreground")}>
                                        {sub.isActive ? "ACTIVE" : "PAUSED"}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                                <button
                                    onClick={() => deleteSubscription(sub.id!)}
                                    className="text-xs font-bold text-destructive hover:opacity-90 transition-colors"
                                >
                                    Delete
                                </button>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs font-bold text-muted-foreground">
                                        {sub.isActive ? "Pause" : "Resume"}
                                    </span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={sub.isActive}
                                            onChange={() => updateSubscription(sub.id!, { isActive: !sub.isActive })}
                                        />
                                        <div className={cn("w-10 h-6 rounded-full transition-colors", sub.isActive ? "bg-success" : "bg-muted")} />
                                        <div className={cn(
                                            "absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                                            sub.isActive && "translate-x-4"
                                        )} />
                                    </div>
                                </label>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.main>
    );
}
