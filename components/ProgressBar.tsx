import React from 'react';
import { motion } from 'framer-motion';
import { LoaderIcon, CheckCircleIcon } from './Icons';

interface ProgressBarProps {
  progress: number;
  statusText: string;
  accentColor?: 'emerald' | 'fuchsia' | 'cyan' | 'sky' | 'amber' | 'purple';
}

const colorClasses = {
  emerald: 'bg-emerald-500',
  fuchsia: 'bg-fuchsia-500',
  cyan: 'bg-cyan-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
};

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, statusText, accentColor = 'emerald' }) => {
  const isComplete = progress >= 100;

  return (
    <div className="w-full flex flex-col items-center justify-center bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl p-8">
      {isComplete ? (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <CheckCircleIcon className="w-12 h-12 text-green-500 mb-4" />
        </motion.div>
      ) : (
        <LoaderIcon className="w-12 h-12 text-slate-400 animate-spin mb-4" />
      )}
      <p className="text-slate-300 font-semibold text-lg text-center mb-4">{statusText}</p>
      <div className="w-full bg-slate-700 rounded-full h-4 relative overflow-hidden shadow-inner">
        <motion.div
          className={`h-4 rounded-full ${colorClasses[accentColor]}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;