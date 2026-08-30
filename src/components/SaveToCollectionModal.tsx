'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Check, Folder, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Problem } from '@/lib/types';
import { toast } from 'sonner';

interface SaveToCollectionModalProps {
  problem: Problem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SaveToCollectionModal({ problem, isOpen, onClose }: SaveToCollectionModalProps) {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [savedCollectionIds, setSavedCollectionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;

    const fetchUserCollections = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/collections');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setCollections(data.collections || []);
          }
        }
      } catch (err) {
        console.error('Failed to load collections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCollections();
    setSavedCollectionIds(new Set());
    setNotes('');
  }, [isOpen]);

  if (!isOpen || !problem) return null;

  const handleSaveToCollection = async (collectionId: string, collectionName: string) => {
    setSavingId(collectionId);
    try {
      const res = await fetch(`/api/collections/${collectionId}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSavedCollectionIds(prev => new Set(prev).add(collectionId));
        toast.success(`Saved to "${collectionName}"!`);
      } else {
        toast.error(data.error || 'Failed to save problem');
      }
    } catch (err: any) {
      toast.error('Error saving problem', { description: err.message });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-cyan-400" /> Save to Collection
          </h3>
          <p className="text-xs text-gray-400 line-clamp-1 font-medium text-cyan-300">
            {problem.title}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs text-gray-400">Custom Notes (Optional)</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Remember to handle edge cases with negative numbers"
            className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-300">Choose Collection</Label>
          
          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            </div>
          ) : collections.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400 bg-white/[0.02] border border-white/5 rounded-2xl">
              No collections found. Go to <a href="/collections" className="text-cyan-400 hover:underline">Collections</a> to create one.
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {collections.map((col) => {
                const isSaved = savedCollectionIds.has(col.id);
                const isSaving = savingId === col.id;

                return (
                  <div
                    key={col.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: col.color || '#06b6d4' }}
                      />
                      <div>
                        <div className="text-xs font-semibold text-white">{col.name}</div>
                        <div className="text-[10px] text-gray-500">{col.problemCount} problems</div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isSaved ? "outline" : "default"}
                      disabled={isSaving || isSaved}
                      onClick={() => handleSaveToCollection(col.id, col.name)}
                      className={
                        isSaved
                          ? "h-7 px-2.5 text-[11px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-medium rounded-lg"
                          : "h-7 px-2.5 text-[11px] bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg cursor-pointer"
                      }
                    >
                      {isSaving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isSaved ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <span>Save</span>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-white rounded-xl"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
