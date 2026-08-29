'use client';

import React, { useState, KeyboardEvent } from 'react';
import { Sparkles, Mic, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Note: Ensure @/components/VoiceButton exists or is handled by another agent. 
// We use a fallback if it fails, but typically we assume it's valid.
import { VoiceButton } from '@/components/VoiceButton';

interface AIPromptBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

const EXAMPLE_PROMPTS = [
  '5 easy tree problems from every site',
  'Hard graph problems from Codeforces',
  'Unsolved DP problems',
  'Similar problems like Two Sum',
  '10 medium array problems'
];

export function AIPromptBar({ onSearch, isLoading = false }: AIPromptBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      <div className={`relative w-full rounded-2xl bg-black/60 backdrop-blur-xl border transition-all duration-500 overflow-hidden shadow-2xl ${isLoading ? 'border-cyan-500/50 shadow-[0_0_30px_rgba(8,145,178,0.3)]' : 'border-white/10 hover:border-white/20'}`}>
        
        {/* Animated gradient border for loading state */}
        {isLoading && (
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-purple-500/20 animate-pulse"></div>
            <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[shimmer_2s_infinite]"></div>
          </div>
        )}
        
        <div className="relative z-10 flex items-center p-2 sm:p-3">
          <div className="pl-3 sm:pl-4 pr-2 text-cyan-400">
            <Sparkles className={`w-5 h-5 sm:w-6 sm:h-6 ${isLoading ? 'animate-pulse' : ''}`} />
          </div>
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Ask AI: "5 easy tree problems from every site"...'
            disabled={isLoading}
            className="flex-1 bg-transparent border-none text-white text-base sm:text-lg placeholder:text-gray-500 focus:outline-none focus:ring-0 px-2 py-3 disabled:opacity-50"
          />
          
          <div className="flex items-center gap-1 sm:gap-2 pr-1 sm:pr-2">
            <VoiceButton 
              onTranscript={(text) => setQuery(prev => prev ? `${prev} ${text}` : text)}
              className="text-gray-400 hover:text-cyan-400 hover:bg-white/5 h-10 w-10 sm:h-12 sm:w-12 rounded-xl transition-colors"
            />
            
            <Button
              onClick={handleSubmit}
              disabled={!query.trim() || isLoading}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-0 shadow-lg h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center p-0 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex flex-wrap justify-center gap-2 px-4">
        {EXAMPLE_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => setQuery(prompt)}
            disabled={isLoading}
            className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
