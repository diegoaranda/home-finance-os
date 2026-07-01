import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 font-sans flex justify-center">
      <main className="w-full max-w-md bg-background min-h-screen relative shadow-2xl md:overflow-hidden md:border-x md:border-border">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
        <BottomNav />
      </main>
    </div>
  );
}
