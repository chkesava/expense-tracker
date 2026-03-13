import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CATEGORIES } from '../../types/expense';
import { FOCUS_DURATIONS } from '../../types/focus';
import { useFocusMode } from '../../hooks/useFocusMode';

interface FocusConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FocusConfigModal({ isOpen, onClose }: FocusConfigModalProps) {
    const { startFocus } = useFocusMode();
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [duration, setDuration] = useState(7);
    const [limit, setLimit] = useState('');

    const handleSubmit = () => {
        if (!limit) return;
        startFocus(category, Number(limit), duration);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-card border border-border w-full max-w-sm rounded-xl p-6 shadow-card-hover relative overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-foreground">Start a Focus</h2>
                        <button onClick={onClose} className="p-2 bg-muted rounded-full hover:bg-accent transition">
                            <X size={20} className="text-muted-foreground" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Category Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-500 mb-2">Category to Watch</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as any)}
                                className="w-full bg-muted border border-border rounded-xl px-4 py-3 font-medium text-foreground outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Daily Limit */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-500 mb-2">Daily Spending Limit</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                                <input
                                    type="number"
                                    value={limit}
                                    onChange={(e) => setLimit(e.target.value)}
                                    placeholder="e.g. 500"
                                    className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-3 font-bold text-foreground outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
                                />
                            </div>
                        </div>

                        {/* Duration Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-500 mb-2">Duration</label>
                            <div className="grid grid-cols-3 gap-2">
                                {FOCUS_DURATIONS.map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setDuration(d)}
                                        className={`py-2 rounded-xl text-sm font-bold transition-all ${duration === d
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-accent'
                                            }`}
                                    >
                                        {d} Days
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!limit}
                            className="w-full py-4 bg-gradient-primary text-primary-foreground font-medium rounded-xl shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Activate Focus Mode
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
