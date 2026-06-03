import React, { ReactNode } from 'react';
import { motion } from 'motion/react';

interface ScreenTransitionProps {
  children: ReactNode;
}

export default function ScreenTransition({ children }: ScreenTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full min-h-screen flex flex-col pb-24"
    >
      {children}
    </motion.div>
  );
}
