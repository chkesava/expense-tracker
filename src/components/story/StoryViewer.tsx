import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { StorySlide } from '../../hooks/useStoryGenerator';
import { cn } from '../../lib/utils';

interface StoryViewerProps {
    isOpen: boolean;
    onClose: () => void;
    slides: StorySlide[];
}

export default function StoryViewer({ isOpen, onClose, slides }: StoryViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
        }
    }, [isOpen]);

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(c => c + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(c => c - 1);
        }
    };

    const safeIndex = Math.min(currentIndex, Math.max(0, slides.length - 1));
    const currentSlide = slides[safeIndex];

    // Auto-advance logic
    useEffect(() => {
        if (!isOpen || slides.length === 0) return;

        const timer = setTimeout(() => {
            if (currentIndex < slides.length - 1) {
                setCurrentIndex(c => c + 1);
            } else {
                onClose();
            }
        }, 5000); // 5 seconds per slide

        return () => clearTimeout(timer);
    }, [currentIndex, isOpen, slides.length, onClose]);



    return (
        <AnimatePresence>
            {isOpen && slides.length > 0 && currentSlide && (
                <motion.div
                    key="story-container"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 sm:p-4 backdrop-blur-md"
                >
                    {/* Mobile-first Container */}
                    <div
                        className={cn(
                            "relative w-full h-full sm:max-w-md sm:h-[80vh] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col",
                            `bg-gradient-to-br ${currentSlide.color || 'from-slate-700 to-slate-900'}`
                        )}
                        onClick={handleNext}
                    >
                        {/* Progress Bars */}
                        <div className="absolute top-0 left-0 right-0 p-2 z-20 flex gap-1">
                            {slides.map((s, i) => (
                                <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: i < safeIndex ? '100%' : i === safeIndex ? '100%' : '0%' }}
                                        transition={i === safeIndex ? { duration: 5, ease: 'linear' } : { duration: 0 }}
                                        className="h-full bg-white"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="absolute top-4 right-4 z-30 p-2 bg-black/20 rounded-full text-white/80 hover:bg-black/40 backdrop-blur-md"
                        >
                            <X size={24} />
                        </button>

                        {/* Content */}
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white relative z-10">
                            <motion.div
                                key={safeIndex}
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="flex flex-col items-center"
                            >
                                <h2 className="text-3xl font-bold mb-4 drop-shadow-lg">{currentSlide.title}</h2>

                                {currentSlide.value && (
                                    <div className="text-5xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70 tracking-tight">
                                        {currentSlide.value}
                                    </div>
                                )}

                                {currentSlide.data?.icon && (
                                    <div className="text-8xl mb-6 drop-shadow-2xl filter brightness-110">
                                        🎁
                                    </div>
                                )}

                                <p className="text-lg font-medium text-white/80 max-w-[80%] leading-relaxed">
                                    {currentSlide.subtitle}
                                </p>
                            </motion.div>
                        </div>

                        {/* Navigation Areas (Invisible) */}
                        <div className="absolute inset-y-0 left-0 w-1/4 z-10" onClick={handlePrev} />
                        <div className="absolute inset-y-0 right-0 w-3/4 z-10" onClick={handleNext} />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
