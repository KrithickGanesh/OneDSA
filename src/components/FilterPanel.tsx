'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PLATFORMS } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface SearchFilters {
  platforms: string[];
  topics: string[];
  difficulty_level: string;
  difficulty_min: number | null;
  difficulty_max: number | null;
  limit: number;
  exclude_solved: boolean;
  solved_only: boolean;
  sort_by: string;
}

interface FilterPanelProps {
  onFilter: (filters: SearchFilters) => void;
  isLoading?: boolean;
}

const COMMON_TAGS = [
  'Array', 'String', 'Hash Table', 'Dynamic Programming', 'Math', 'Sorting', 
  'Greedy', 'Depth-First Search', 'Database', 'Binary Search', 'Breadth-First Search', 
  'Tree', 'Matrix', 'Two Pointers', 'Bit Manipulation', 'Stack', 'Design', 
  'Graph', 'Simulation', 'Prefix Sum'
];

export function FilterPanel({ onFilter, isLoading }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [platforms, setPlatforms] = useState<string[]>(PLATFORMS.map(p => p.id));
  const [topics, setTopics] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [difficulty, setDifficulty] = useState<string>('All');
  const [limit, setLimit] = useState<number>(20);
  const [solvedStatus, setSolvedStatus] = useState<'all' | 'unsolved' | 'solved'>('all');
  const [sortBy, setSortBy] = useState('difficulty');

  const togglePlatform = (id: string) => {
    setPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const addTopic = (topic: string) => {
    if (topic && !topics.includes(topic)) {
      setTopics([...topics, topic]);
      setTagInput('');
    }
  };

  const removeTopic = (topic: string) => {
    setTopics(topics.filter(t => t !== topic));
  };

  const handleApply = () => {
    onFilter({
      platforms,
      topics,
      difficulty_level: difficulty === 'All' ? '' : difficulty,
      difficulty_min: null,
      difficulty_max: null,
      limit,
      exclude_solved: solvedStatus === 'unsolved',
      solved_only: solvedStatus === 'solved',
      sort_by: sortBy
    });
  };

  const handleReset = () => {
    setPlatforms(PLATFORMS.map(p => p.id));
    setTopics([]);
    setDifficulty('All');
    setLimit(20);
    setSolvedStatus('all');
    setSortBy('difficulty');
    setTagInput('');
  };

  return (
    <Card className="bg-black/40 backdrop-blur-md border-white/10 sticky top-4">
      <CardHeader className="py-4 px-5 border-b border-white/5 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" /> Filters
        </CardTitle>
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="p-5 space-y-6">
          {/* Platforms */}
          <div className="space-y-3">
            <Label className="text-gray-300 font-medium">Platforms</Label>
            <div className="flex flex-col gap-2">
              {PLATFORMS.map(p => (
                <div key={p.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`platform-${p.id}`} 
                    checked={platforms.includes(p.id)}
                    onCheckedChange={() => togglePlatform(p.id)}
                    className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                  />
                  <Label 
                    htmlFor={`platform-${p.id}`}
                    className="text-sm cursor-pointer"
                    style={{ color: p.color }}
                  >
                    {p.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <Label className="text-gray-300 font-medium">Difficulty</Label>
            <div className="flex gap-2">
              {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                <Button
                  key={d}
                  variant={difficulty === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 ${
                    difficulty === d 
                      ? 'bg-white/20 text-white hover:bg-white/30 border-transparent' 
                      : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="space-y-3">
            <Label className="text-gray-300 font-medium">Topics</Label>
            <div className="relative">
              <Input
                placeholder="e.g. Array, Graph..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTopic(tagInput);
                  }
                }}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
              {tagInput && (
                <div className="absolute z-10 w-full mt-1 bg-[#111118] border border-white/10 rounded-md shadow-xl max-h-40 overflow-y-auto">
                  {COMMON_TAGS.filter(t => t.toLowerCase().includes(tagInput.toLowerCase())).map(t => (
                    <div 
                      key={t}
                      className="px-3 py-2 hover:bg-white/10 cursor-pointer text-sm text-gray-300"
                      onClick={() => addTopic(t)}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 pt-1">
              {topics.map(t => (
                <div key={t} className="flex items-center gap-1 bg-cyan-500/20 text-cyan-300 text-xs px-2 py-1 rounded-md border border-cyan-500/20">
                  {t}
                  <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => removeTopic(t)} />
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <Label className="text-gray-300 font-medium">Status</Label>
            <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-lg">
              {[
                { id: 'all', label: 'All' },
                { id: 'unsolved', label: 'Unsolved' },
                { id: 'solved', label: 'Solved' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSolvedStatus(s.id as any)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    solvedStatus === s.id ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-gray-300 font-medium">Max Results: {limit}</Label>
            </div>
            <Slider 
              value={[limit]} 
              onValueChange={(val) => setLimit((val as number[])[0] ?? (val as unknown as number))}  
              max={100} 
              min={10} 
              step={10}
              className="py-2"
            />
          </div>

          <div className="pt-4 flex gap-3 border-t border-white/5">
            <Button 
              variant="outline" 
              className="flex-1 border-white/10 bg-transparent text-gray-300 hover:bg-white/5 hover:text-white"
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button 
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-0 shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-all hover:shadow-[0_0_25px_rgba(8,145,178,0.6)]"
              onClick={handleApply}
              disabled={isLoading}
            >
              {isLoading ? 'Filtering...' : 'Apply Filters'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
