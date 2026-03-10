import React, { useState, useEffect, useMemo } from 'react';
import { DiceIcon } from './Icons';

interface PromptExamplesProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
  colorScheme?: 'emerald' | 'fuchsia';
}

const PromptExamples: React.FC<PromptExamplesProps> = ({ prompts, onSelectPrompt, colorScheme = 'emerald' }) => {
  const baseClasses = "cursor-pointer rounded-lg p-2 text-sm text-slate-300 transition-all duration-200 border border-slate-700";
  const colorClasses = {
    emerald: "bg-slate-800/60 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-700",
    fuchsia: "bg-slate-800/60 hover:bg-fuchsia-500/20 hover:text-fuchsia-300 hover:border-fuchsia-700",
  };

  const shuffle = (array: string[]) => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const initialPrompts = useMemo(() => shuffle(prompts), [prompts]);
  const [shuffledPrompts, setShuffledPrompts] = useState(initialPrompts);
  
  const handleShuffle = () => {
    setShuffledPrompts(shuffle(prompts));
  };
  
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-slate-400">Hoặc thử một ví dụ:</h3>
        <button 
          onClick={handleShuffle} 
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          title="Xáo trộn ví dụ"
        >
          <DiceIcon className="w-4 h-4" />
          Mới
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {shuffledPrompts.slice(0, 4).map((prompt, index) => (
          <div
            key={index}
            onClick={() => onSelectPrompt(prompt)}
            className={`${baseClasses} ${colorClasses[colorScheme]}`}
            role="button"
            aria-label={`Use prompt: ${prompt}`}
          >
            {prompt}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PromptExamples;
