'use client';

import React, { useState, useEffect } from 'react';
import { FilterPanel, SearchFilters } from '@/components/FilterPanel';
import { ProblemTable } from '@/components/ProblemTable';
import { Problem } from '@/lib/types';
import { PLATFORMS } from '@/lib/constants';
import { Compass } from 'lucide-react';
import { toast } from 'sonner';

export default function ExplorePage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Initial load
  useEffect(() => {
    handleFilter({
      platforms: PLATFORMS.map(p => p.id),
      topics: [],
      difficulty_level: '',
      difficulty_min: null,
      difficulty_max: null,
      limit: 20,
      exclude_solved: false,
      solved_only: false,
      sort_by: 'difficulty'
    });
  }, []);

  const handleFilter = async (filters: SearchFilters) => {
    setLoading(true);
    try {
      const response = await fetch('/api/search/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch problems');
      }

      const data = await response.json();
      setProblems(data.problems || []);
      setTotalCount(data.total || data.problems?.length || 0);
    } catch (error: any) {
      console.error('Filter error:', error);
      toast.error('Failed to load problems', { description: error.message });
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1400px]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Compass className="w-8 h-8 text-cyan-400" /> Explore Problems
        </h1>
        <p className="text-gray-400">Filter and browse problems across all platforms</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filter */}
        <div className="w-full lg:w-80 shrink-0">
          <FilterPanel onFilter={handleFilter} isLoading={loading} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <ProblemTable 
            problems={problems} 
            isLoading={loading}
            viewMode="table" 
          />
        </div>
      </div>
    </div>
  );
}
