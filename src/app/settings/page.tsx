'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PLATFORMS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, CheckCircle2, XCircle, Code, ChefHat, Terminal, BookOpen, KeyRound, Save, Loader2, Sparkles } from 'lucide-react';
import { saveGeminiKey, getGeminiKeyHint, savePlatformHandle, getPlatformHandles, testGeminiKey } from './actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ReactNode> = {
  'code': <Code className="w-5 h-5" />,
  'chef-hat': <ChefHat className="w-5 h-5" />,
  'terminal': <Terminal className="w-5 h-5" />,
  'book-open': <BookOpen className="w-5 h-5" />
};

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Handles state
  const [handles, setHandles] = useState<Record<string, { handle: string; cfKey?: string; cfSecret?: string }>>({});
  const [savingPlatform, setSavingPlatform] = useState<string | null>(null);
  
  // Gemini state
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiKeyHint, setGeminiKeyHint] = useState<string | null>(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          
          // Load handles
          const handlesRes = await getPlatformHandles(user.id);
          if (handlesRes.success && handlesRes.data) {
            const handlesMap: Record<string, any> = {};
            handlesRes.data.forEach((h: any) => {
              handlesMap[h.platform] = {
                handle: h.handle,
                cfKey: h.codeforces_api_key || '',
                cfSecret: h.codeforces_api_secret || ''
              };
            });
            setHandles(handlesMap);
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
    if (!userId) return;
    
    const data = handles[platformId];
    if (!data || !data.handle.trim()) {
      toast.error('Please enter a handle');
      return;
    }
    
    setSavingPlatform(platformId);
    
    try {
      const res = await savePlatformHandle(userId, platformId, data.handle.trim(), data.cfKey?.trim(), data.cfSecret?.trim());
      
      if (res.success) {
        toast.success(`${platformId} handle saved successfully`);
      } else {
        toast.error(res.error || `Failed to save ${platformId} handle`);
      }
    } catch (error) {
      toast.error(`Error saving ${platformId} handle`);
    } finally {
      setSavingPlatform(null);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }
    
    setIsSavingGemini(true);
    
    try {
      const formData = new FormData();
      formData.append('apiKey', geminiKey.trim());
      
      const res = await saveGeminiKey(formData);
      if (res.success) {
        toast.success('Gemini API Key saved and encrypted successfully');
        setGeminiKeyHint(res.keyHint || '***');
        setGeminiKey('');
      } else {
        toast.error(res.error || 'Failed to save Gemini API Key');
      }
    } catch (error) {
      toast.error('Error saving Gemini API Key');
    } finally {
      setIsSavingGemini(false);
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
    } catch (error) {
      toast.error('Error testing API Key');
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

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-10 px-4 space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-800 rounded-md"></div>
          <div className="h-4 w-72 bg-slate-800 rounded-md"></div>
        </div>
        
        <div className="h-[250px] bg-slate-900/50 rounded-xl border border-slate-800"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[200px] bg-slate-900/50 rounded-xl border border-slate-800"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4 space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 text-transparent bg-clip-text">
          Settings
        </h1>
        <p className="text-muted-foreground text-lg">
          Configure your platform handles and API keys
        </p>
      </div>

      {/* Gemini API Key Section */}
      <section>
        <Card className="border-slate-800 bg-slate-950/50 backdrop-blur-md overflow-hidden relative shadow-lg shadow-purple-900/10 group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
                  placeholder="Enter your Google Gemini API Key"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="pr-10 bg-slate-900/80 border-slate-700 focus-visible:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {geminiKeyHint && (
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 py-2 px-3 rounded-md border border-emerald-400/20 w-fit">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active Key: {geminiKeyHint}</span>
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
        <h2 className="text-2xl font-semibold tracking-tight border-b border-slate-800 pb-2">Platform Handles</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLATFORMS.map((platform) => {
            const data = handles[platform.id] || { handle: '' };
            const isConnected = !!data.handle;
            const isSaving = savingPlatform === platform.id;
            
            return (
              <Card 
                key={platform.id} 
                className="border-slate-800 bg-slate-950/50 backdrop-blur-md overflow-hidden relative shadow-lg transition-all duration-300 hover:shadow-slate-900/50 hover:border-slate-700 group"
              >
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 opacity-80"
                  style={{ backgroundColor: platform.color }}
                />
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                  style={{ backgroundImage: `linear-gradient(to bottom right, ${platform.color}, transparent)` }}
                />
                
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: platform.color }}
                      >
                        {iconMap[platform.icon]}
                      </div>
                      {platform.name}
                    </CardTitle>
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
                </CardHeader>
                
                <CardContent className="space-y-4 relative z-10">
                  <div className="space-y-2">
                    <Label htmlFor={`${platform.id}-handle`}>Username / Handle</Label>
                    <Input
                      id={`${platform.id}-handle`}
                      placeholder={`Enter your ${platform.name} handle`}
                      value={data.handle}
                      onChange={(e) => updateHandle(platform.id, 'handle', e.target.value)}
                      className="bg-slate-900/80 border-slate-700 focus-visible:ring-opacity-50"
                      style={{ '--tw-ring-color': platform.color } as any}
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
                          className="bg-slate-900/80 border-slate-700 h-9"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="pt-2">
                  <Button 
                    onClick={() => handleSavePlatform(platform.id)}
                    disabled={isSaving}
                    className="w-full text-white transition-all"
                    style={{ backgroundColor: platform.color }}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save {platform.name}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
