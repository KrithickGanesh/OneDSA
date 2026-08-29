'use client';

import { Mic } from 'lucide-react';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceButton({ onTranscript, className }: VoiceButtonProps) {
  const { isListening, transcript, isSupported, startListening, stopListening, error } = useVoiceSearch(onTranscript);

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "rounded-full w-12 h-12 transition-all duration-300 relative",
          isListening 
            ? "bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30 hover:text-red-400" 
            : "hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:border-sky-500/50 hover:text-sky-400",
          className
        )}
        onClick={isListening ? stopListening : startListening}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
      >
        <Mic className={cn("w-5 h-5", isListening && "animate-pulse")} />
        
        {/* Pulsing rings when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-75" style={{ animationDuration: '1.5s' }} />
            <span className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-50" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          </>
        )}
      </Button>

      {/* Floating transcript bubble */}
      {isListening && (
        <div className="absolute top-full mt-4 w-48 text-center pointer-events-none z-50">
          <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-2 text-xs text-slate-300 shadow-xl inline-block relative animate-in fade-in slide-in-from-top-2">
            {/* Arrow pointing up */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-slate-700" />
            <div className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-slate-900/90" />
            
            {transcript || (
              <span className="flex items-center justify-center gap-1">
                Listening <span className="flex gap-0.5"><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span><span className="animate-bounce delay-300">.</span></span>
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute top-full mt-2 text-xs text-red-500 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}
