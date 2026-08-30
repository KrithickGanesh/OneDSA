'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bookmark, FolderPlus, Trash2, Edit3, ExternalLink, Sparkles, Folder, ArrowRight, Loader2, X, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDifficultyColor } from '@/components/ProblemTable';
import { PLATFORMS } from '@/lib/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  problemCount: number;
}

const PRESET_COLORS = [
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
];

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create Collection Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#06b6d4');
  const [submitting, setSubmitting] = useState(false);

  // Fetch all collections
  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/collections');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCollections(data.collections || []);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load collections', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Fetch single collection problems
  const handleOpenCollection = async (collectionId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCollection(data.collection);
      } else {
        toast.error(data.error || 'Failed to load collection');
      }
    } catch (err: any) {
      toast.error('Error opening collection', { description: err.message });
    } finally {
      setLoadingDetail(false);
    }
  };

  // Create new collection
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          color: newColor,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Collection "${newName}" created!`);
        setShowCreateModal(false);
        setNewName('');
        setNewDescription('');
        setNewColor('#06b6d4');
        fetchCollections();
      } else {
        toast.error(data.error || 'Failed to create collection');
      }
    } catch (err: any) {
      toast.error('Error creating collection', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete collection
  const handleDeleteCollection = async (collectionId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete collection "${name}"?`)) return;

    try {
      const res = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Collection "${name}" deleted`);
        if (selectedCollection?.id === collectionId) {
          setSelectedCollection(null);
        }
        fetchCollections();
      }
    } catch (err: any) {
      toast.error('Failed to delete collection', { description: err.message });
    }
  };

  // Remove problem from collection
  const handleRemoveProblem = async (problemId: string) => {
    if (!selectedCollection) return;
    try {
      const res = await fetch(`/api/collections/${selectedCollection.id}/problems?problemId=${problemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Problem removed from collection');
        handleOpenCollection(selectedCollection.id);
        fetchCollections();
      }
    } catch (err: any) {
      toast.error('Failed to remove problem', { description: err.message });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-cyan-400" /> Saved Collections
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Organize problems into custom revision lists, company sheets, and curated topic decks.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="h-10 px-4 text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Collection</span>
        </Button>
      </div>

      {/* Collections Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4"></div>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <Folder className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-white">No collections created yet</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Create your first collection like &quot;Blind 75&quot;, &quot;Google Interview Prep&quot;, or &quot;Tricky DP Problems&quot;.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs px-4 rounded-xl cursor-pointer"
          >
            Create First Collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((col) => {
            const isSelected = selectedCollection?.id === col.id;
            return (
              <Card
                key={col.id}
                onClick={() => handleOpenCollection(col.id)}
                className={cn(
                  "bg-black/40 backdrop-blur-md border transition-all duration-300 rounded-2xl cursor-pointer hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group",
                  isSelected ? "border-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.2)]" : "border-white/10 hover:border-white/20"
                )}
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5" 
                  style={{ backgroundColor: col.color }}
                />
                
                <CardHeader className="p-5 pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3.5 h-3.5 rounded-full shrink-0" 
                        style={{ backgroundColor: col.color }}
                      />
                      <CardTitle className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {col.name}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs bg-white/5 border-white/10 font-semibold text-gray-300">
                      {col.problemCount} {col.problemCount === 1 ? 'problem' : 'problems'}
                    </Badge>
                  </div>
                  {col.description && (
                    <CardDescription className="text-xs text-gray-400 line-clamp-2 pt-1">
                      {col.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-5 pt-3 flex justify-between items-center border-t border-white/5 bg-white/[0.01]">
                  <span className="text-[11px] text-gray-500">
                    Created {new Date(col.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCollection(col.id, col.name);
                      }}
                      title="Delete Collection"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-cyan-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      View <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Selected Collection Problems View */}
      {selectedCollection && (
        <div className="space-y-5 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span 
                  className="w-3.5 h-3.5 rounded-full shrink-0" 
                  style={{ backgroundColor: selectedCollection.color }}
                />
                <h2 className="text-2xl font-bold text-white">{selectedCollection.name}</h2>
                <Badge variant="outline" className="text-xs bg-white/5 border-white/10 font-medium">
                  {selectedCollection.problemCount} Problems
                </Badge>
              </div>
              {selectedCollection.description && (
                <p className="text-xs text-gray-400">{selectedCollection.description}</p>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCollection(null)}
              className="text-xs bg-white/5 border-white/10 text-gray-400 hover:text-white rounded-xl cursor-pointer"
            >
              Close View
            </Button>
          </div>

          {loadingDetail ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : selectedCollection.problems?.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-white/10 bg-black/20 text-gray-400 text-sm">
              This collection is currently empty. Explore problems in <a href="/explore" className="text-cyan-400 hover:underline">Explore</a> and bookmark them to add here!
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white/[0.04] border-b border-white/10">
                  <tr>
                    <th className="px-5 py-4">Title</th>
                    <th className="px-5 py-4">Platform</th>
                    <th className="px-5 py-4">Difficulty</th>
                    <th className="px-5 py-4">Tags</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedCollection.problems.map((p: any) => {
                    const platformConfig = PLATFORMS.find(cfg => cfg.id === p.platform);
                    const diffStyle = getDifficultyColor(p.difficulty);

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 font-medium text-white">
                          <a 
                            href={p.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:text-cyan-400 transition-colors text-base line-clamp-1 inline-block"
                          >
                            {p.title}
                          </a>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="text-xs bg-white/[0.03] border-white/10 font-medium">
                            <span 
                              className="w-2 h-2 rounded-full mr-1.5 shrink-0" 
                              style={{ backgroundColor: platformConfig?.color || '#94a3b8' }}
                            />
                            {platformConfig?.name || p.platform}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-1 ${diffStyle.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${diffStyle.dot}`}></span>
                            {p.difficulty || 'Medium'}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(p.tags || []).slice(0, 3).map((tag: string, j: number) => (
                              <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium mr-2"
                          >
                            <span>Solve</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleRemoveProblem(p.id)}
                            title="Remove from collection"
                            className="text-xs text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-cyan-400" /> Create Collection
              </h3>
              <p className="text-xs text-gray-400">Add a new custom collection to curate your problem sets.</p>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-gray-300">Collection Name *</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Striver 79 or Google Hard"
                  required
                  className="bg-white/5 border-white/10 text-white rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-semibold text-gray-300">Description (Optional)</Label>
                <Input
                  id="desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Core tree and graph patterns"
                  className="bg-white/5 border-white/10 text-white rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-300">Accent Color</Label>
                <div className="flex gap-2 pt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-transform cursor-pointer",
                        newColor === c ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "hover:scale-110"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs text-gray-400 hover:text-white rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !newName.trim()}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs px-5 rounded-xl shadow-lg cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Create Collection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
