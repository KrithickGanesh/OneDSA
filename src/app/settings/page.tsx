'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PLATFORMS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  Code, 
  ChefHat, 
  Terminal, 
  BookOpen, 
  KeyRound, 
  Save, 
  Loader2, 
  Sparkles, 
  Trash2, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { 
  saveGeminiKey, 
  getGeminiKeyHint, 
  deleteGeminiKey, 
  savePlatformHandle, 
  deletePlatformHandle, 
  getPlatformHandles, 
  testGeminiKey 
} from './actions';
import { toast } from 'sonner';

const iconMap: Record<string, React.ReactNode> = {
  'code': <Code className="w-5 h-5" />,
  'chef-hat': <ChefHat className="w-5 h-5" />,
  'terminal': <Terminal className="w-5 h-5" />,
  'book-open': <BookOpen className="w-5 h-5" />
};

function getPlatformProfileUrl(platformId: string, handle: string): string | null {
  if (!handle) return null;
  const clean = encodeURIComponent(handle.trim());
  switch (platformId) {
    case 'leetcode':
      return `https://leetcode.com/u/${clean}`;
    case 'codeforces':
      return `https://codeforces.com/profile/${clean}`;
    case 'codechef':
      return `https://www.codechef.com/users/${clean}`;
    case 'hackerrank':
      return `https://www.hackerrank.com/profile/${clean}`;
    case 'gfg':
      return `https://www.geeksforgeeks.org/user/${clean}/`;
    default:
      return null;
  }
}

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Handles state
  const [handles, setHandles] = useState<Record<string, { handle: string; cfKey?: string; cfSecret?: string }>>({});
  const [savedHandles, setSavedHandles] = useState<Record<string, { handle: string; cfKey?: string; cfSecret?: string }>>({});
  const [savingPlatform, setSavingPlatform] = useState<string | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  
  // Gemini state
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiKeyHint, setGeminiKeyHint] = useState<string | null>(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [isDeletingGemini, setIsDeletingGemini] = useState(false);

  // Bulk import state
  const [importPlatform, setImportPlatform] = useState('leetcode');
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          
          // Load platform handles
          const handlesRes = await getPlatformHandles();
          if (handlesRes.success && handlesRes.data) {
            const handlesMap: Record<string, any> = {};
            handlesRes.data.forEach((h: any) => {
              handlesMap[h.platform] = {
                handle: h.handle || '',
                cfKey: h.codeforces_api_key || '',
                cfSecret: h.codeforces_api_secret || ''
              };
            });
            setHandles(handlesMap);
            setSavedHandles(handlesMap);
          }
          
          // Load Gemini Key Hint
          const geminiRes = await getGeminiKeyHint();
          if (geminiRes.success && geminiRes.keyHint) {
            setGeminiKeyHint(geminiRes.keyHint);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSettings();
  }, []);

  const handleSavePlatform = async (platformId: string) => {
    const data = handles[platformId];
    const cleanHandle = data?.handle?.trim() || '';

    if (!cleanHandle) {
      toast.error('Please enter a username or handle');
      return;
    }
    
    setSavingPlatform(platformId);
    
    try {
      const res = await savePlatformHandle(
        platformId, 
        cleanHandle, 
        data?.cfKey?.trim() || undefined, 
        data?.cfSecret?.trim() || undefined
      );
      
      if (res.success) {
        const platformName = PLATFORMS.find(p => p.id === platformId)?.name || platformId;
        toast.success(`${platformName} handle saved successfully`);
        setSavedHandles(prev => ({
          ...prev,
          [platformId]: {
            handle: cleanHandle,
            cfKey: data?.cfKey?.trim() || '',
            cfSecret: data?.cfSecret?.trim() || ''
          }
        }));
      } else {
        toast.error(res.error || `Failed to save ${platformId} handle`);
      }
    } catch (error: any) {
      toast.error(error.message || `Error saving ${platformId} handle`);
    } finally {
      setSavingPlatform(null);
    }
  };

  const handleDisconnectPlatform = async (platformId: string) => {
    setDisconnectingPlatform(platformId);
    try {
      const res = await deletePlatformHandle(platformId);
      if (res.success) {
        const platformName = PLATFORMS.find(p => p.id === platformId)?.name || platformId;
        toast.success(`${platformName} disconnected`);
        setHandles(prev => ({
          ...prev,
          [platformId]: { handle: '', cfKey: '', cfSecret: '' }
        }));
        setSavedHandles(prev => {
          const next = { ...prev };
          delete next[platformId];
          return next;
        });
      } else {
        toast.error(res.error || `Failed to disconnect ${platformId}`);
      }
    } catch (error: any) {
      toast.error(error.message || `Error disconnecting ${platformId}`);
    } finally {
      setDisconnectingPlatform(null);
    }
  };

  const handleSaveGeminiKey = async () => {
    const cleanKey = geminiKey.trim();
    if (!cleanKey) {
      toast.error('Please enter an API key');
      return;
    }
    
    setIsSavingGemini(true);
    
    try {
      const formData = new FormData();
      formData.append('apiKey', cleanKey);
      
      const res = await saveGeminiKey(formData);
      if (res.success) {
        toast.success('Gemini API Key saved and encrypted successfully');
        setGeminiKeyHint(res.keyHint || '***');
        setGeminiKey('');
      } else {
        toast.error(res.error || 'Failed to save Gemini API Key');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error saving Gemini API Key');
    } finally {
      setIsSavingGemini(false);
    }
  };

  const handleDeleteGeminiKey = async () => {
    setIsDeletingGemini(true);
    try {
      const res = await deleteGeminiKey();
      if (res.success) {
        toast.success('Gemini API Key removed');
        setGeminiKeyHint(null);
      } else {
        toast.error(res.error || 'Failed to remove API key');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error removing API key');
    } finally {
      setIsDeletingGemini(false);
    }
  };

  const handleTestGeminiKey = async () => {
    setIsTestingGemini(true);
    try {
      const res = await testGeminiKey();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || 'API Key test failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error testing API Key');
    } finally {
      setIsTestingGemini(false);
    }
  };

  const updateHandle = (platformId: string, field: string, value: string) => {
    setHandles(prev => ({
      ...prev,
      [platformId]: {
        ...(prev[platformId] || { handle: '', cfKey: '', cfSecret: '' }),
        [field]: value
      }
    }));
  };

  const handleImportSolved = async () => {
    if (!importText.trim()) {
      toast.error('Please enter problem slugs or URLs to import');
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch('/api/sync/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: importPlatform,
          data: importText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully imported and marked ${data.markedSolved} problems as solved!`);
        setImportText('');
      } else {
        toast.error(data.error || 'Failed to import problems');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error during import');
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-10 px-4 space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-800 rounded-md"></div>
          <div className="h-4 w-72 bg-slate-800 rounded-md"></div>
        </div>
        
        <div className="h-[250px] bg-slate-900/50 rounded-xl border border-slate-800"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-[200px] bg-slate-900/50 rounded-xl border border-slate-800"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4 space-y-10 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 text-transparent bg-clip-text">
          Settings
        </h1>
        <p className="text-muted-foreground text-lg">
          Configure your platform handles and API keys for unified problem tracking
        </p>
      </div>

      {/* Gemini API Key Section */}
      <section>
        <Card className="border-slate-800 bg-slate-950/50 backdrop-blur-md overflow-hidden relative shadow-lg shadow-purple-900/10 group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500" />
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Gemini API Key
            </CardTitle>
            <CardDescription>
              Required for AI-powered semantic search and problem recommendations. Your key is stored securely using AES-256-GCM encryption.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 relative z-10">
              <Label htmlFor="gemini-key">API Key</Label>
              <div className="relative">
                <Input
                  id="gemini-key"
                  type={showGeminiKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveGeminiKey();
                    }
                  }}
                  className="pr-10 bg-slate-900/80 border-slate-700 focus-visible:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors p-1"
                  aria-label={showGeminiKey ? "Hide API key" : "Show API key"}
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {geminiKeyHint && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-emerald-400 bg-emerald-400/10 py-2 px-3 rounded-md border border-emerald-400/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Active Key: <strong className="font-mono">{geminiKeyHint}</strong></span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteGeminiKey}
                  disabled={isDeletingGemini}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {isDeletingGemini ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                  Remove Key
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex gap-3 justify-end border-t border-slate-800/50 pt-6">
            {geminiKeyHint && (
              <Button 
                variant="outline" 
                onClick={handleTestGeminiKey}
                disabled={isTestingGemini}
                className="border-slate-700 hover:bg-slate-800 text-slate-300"
              >
                {isTestingGemini ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Test Key
              </Button>
            )}
            <Button 
              onClick={handleSaveGeminiKey}
              disabled={isSavingGemini || !geminiKey.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSavingGemini ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Key
            </Button>
          </CardFooter>
        </Card>
      </section>

      {/* Platform Handles Section */}
      <section className="space-y-6">
        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Platform Handles</h2>
          <span className="text-xs text-muted-foreground">
            {Object.keys(savedHandles).length} of {PLATFORMS.length} connected
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLATFORMS.map((platform) => {
            const data = handles[platform.id] || { handle: '', cfKey: '', cfSecret: '' };
            const savedData = savedHandles[platform.id];
            const isConnected = !!savedData?.handle;
            const isSaving = savingPlatform === platform.id;
            const isDisconnecting = disconnectingPlatform === platform.id;
            const profileUrl = getPlatformProfileUrl(platform.id, savedData?.handle || data.handle);
            
            return (
              <Card 
                key={platform.id} 
                className="border-slate-800 bg-slate-950/50 backdrop-blur-md overflow-hidden relative shadow-lg transition-all duration-300 hover:shadow-slate-900/50 hover:border-slate-700 group flex flex-col justify-between"
              >
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 opacity-80"
                  style={{ backgroundColor: platform.color }}
                />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
                  style={{ backgroundImage: `linear-gradient(to bottom right, ${platform.color}, transparent)` }}
                />
                
                <div>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: platform.color }}
                        >
                          {iconMap[platform.icon]}
                        </div>
                        <span>{platform.name}</span>
                      </CardTitle>
                      
                      <div className="flex items-center gap-2">
                        {isConnected ? (
                          <span className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                          </span>
                        ) : (
                          <span className="flex items-center text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                            Not Connected
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${platform.id}-handle`}>Username / Handle</Label>
                        {isConnected && profileUrl && (
                          <a
                            href={profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                          >
                            <span>View Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <Input
                        id={`${platform.id}-handle`}
                        placeholder={`Enter your ${platform.name} handle`}
                        value={data.handle}
                        onChange={(e) => updateHandle(platform.id, 'handle', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSavePlatform(platform.id);
                          }
                        }}
                        disabled={isSaving || isDisconnecting}
                        className="bg-slate-900/80 border-slate-700 focus-visible:ring-opacity-50"
                      />
                    </div>
                    
                    {platform.id === 'codeforces' && (
                      <div className="space-y-4 pt-2 border-t border-slate-800">
                        <div className="space-y-2">
                          <Label htmlFor="cf-key" className="text-xs text-slate-400">API Key (Optional for private submissions)</Label>
                          <Input
                            id="cf-key"
                            placeholder="Codeforces API Key"
                            value={data.cfKey || ''}
                            onChange={(e) => updateHandle(platform.id, 'cfKey', e.target.value)}
                            disabled={isSaving || isDisconnecting}
                            className="bg-slate-900/80 border-slate-700 h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cf-secret" className="text-xs text-slate-400">API Secret</Label>
                          <Input
                            id="cf-secret"
                            type="password"
                            placeholder="Codeforces API Secret"
                            value={data.cfSecret || ''}
                            onChange={(e) => updateHandle(platform.id, 'cfSecret', e.target.value)}
                            disabled={isSaving || isDisconnecting}
                            className="bg-slate-900/80 border-slate-700 h-9"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </div>
                
                <CardFooter className="pt-2 flex gap-2">
                  {isConnected && (
                    <Button
                      variant="outline"
                      onClick={() => handleDisconnectPlatform(platform.id)}
                      disabled={isSaving || isDisconnecting}
                      className="border-slate-800 hover:bg-destructive/10 hover:text-destructive text-slate-400 shrink-0"
                    >
                      {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      <span className="sr-only sm:not-sr-only sm:ml-1">Disconnect</span>
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => handleSavePlatform(platform.id)}
                    disabled={isSaving || isDisconnecting || !data.handle.trim()}
                    className="flex-1 text-white transition-all shadow-md"
                    style={{ backgroundColor: platform.color }}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save {platform.name}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Bulk Solved Problem Importer */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Bulk Solved Problem Importer
          </h2>
          <p className="text-sm text-slate-400">
            Paste your solved problem slugs or URLs to instantly mark all 400+ problems as solved. OneDSA will guarantee these are excluded from your unsolved problem queues.
          </p>
        </div>

        <Card className="bg-slate-950/40 border-slate-800 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Quick Slugs / URLs Import</CardTitle>
            <CardDescription className="text-xs">
              Supports comma-separated or newline-separated problem slugs (e.g. <code className="text-cyan-400">two-sum, 3sum, course-schedule</code>) or full problem URLs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant={importPlatform === p.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportPlatform(p.id)}
                  className={`text-xs ${importPlatform === p.id ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "border-slate-800 text-slate-400"}`}
                >
                  {p.name}
                </Button>
              ))}
            </div>

            <textarea
              rows={4}
              placeholder="Paste problem slugs or URLs here (e.g., two-sum, course-schedule, number-of-islands, ...)"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              disabled={isImporting}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </CardContent>
          <CardFooter className="flex justify-between items-center pt-0">
            <span className="text-xs text-slate-500">
              {importText.trim() ? `${importText.split(/[\n,;\s]+/).filter(Boolean).length} items detected` : 'No items entered'}
            </span>
            <Button
              onClick={handleImportSolved}
              disabled={isImporting || !importText.trim()}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
            >
              {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Import & Mark Solved
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}
