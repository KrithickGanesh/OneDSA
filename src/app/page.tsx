'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Layers, LineChart, ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { PLATFORMS } from '@/lib/constants';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/dashboard');
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0f]" />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden relative selection:bg-cyan-500/30">
      
      {/* Background Gradients */}
      <div className="absolute top-0 -left-1/4 w-1/2 h-[500px] bg-purple-600/20 rounded-full blur-[120px] opacity-50 mix-blend-screen pointer-events-none"></div>
      <div className="absolute top-1/4 -right-1/4 w-1/2 h-[500px] bg-cyan-600/20 rounded-full blur-[120px] opacity-50 mix-blend-screen pointer-events-none"></div>
      <div className="absolute -bottom-1/4 left-1/4 w-1/2 h-[500px] bg-blue-600/20 rounded-full blur-[120px] opacity-50 mix-blend-screen pointer-events-none"></div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tighter">
          OneDSA
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Log in
          </Link>
          <Link href="/signup" className={buttonVariants({ className: "bg-white text-black hover:bg-gray-200 rounded-full px-6 font-semibold shadow-lg shadow-white/10" })}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-20 pb-32 max-w-5xl mx-auto mt-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles className="w-4 h-4" />
          <span>Introducing AI-Powered Search</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          One Platform. <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">
            All Problems. Zero Excuses.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          Stop jumping between LeetCode, Codeforces, and CodeChef. 
          Find, filter, and track competitive programming problems using natural language AI across every major platform.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <Link href="/signup" className={buttonVariants({ size: "lg", className: "h-14 px-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-lg shadow-[0_0_30px_rgba(8,145,178,0.5)] transition-all hover:scale-105" })}>
            Start Practicing Now <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "lg", className: "h-14 px-8 rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold backdrop-blur-sm transition-all hover:scale-105" })}>
            <svg className="mr-2 w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> Star on GitHub
          </a>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full animate-in fade-in slide-in-from-bottom-12 duration-700 delay-500">
          
          {/* Feature 1 */}
          <div className="bg-white/[0.03] border border-white/5 hover:border-white/20 p-8 rounded-3xl transition-all hover:-translate-y-2 group text-left backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all"></div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">AI-Powered Search</h3>
            <p className="text-gray-400 leading-relaxed">
              Use voice or text to ask for exactly what you need. "Find me 5 hard dynamic programming problems from Codeforces" and watch the magic happen.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/[0.03] border border-white/5 hover:border-white/20 p-8 rounded-3xl transition-all hover:-translate-y-2 group text-left backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">All Platforms United</h3>
            <p className="text-gray-400 leading-relaxed mb-4">
              LeetCode, Codeforces, CodeChef, HackerRank, and GFG. All your problems in one unified interface.
            </p>
            <div className="flex gap-2">
              {PLATFORMS.map(p => (
                <div key={p.id} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold" style={{ color: p.color }}>
                  {p.name.charAt(0)}
                </div>
              ))}
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/[0.03] border border-white/5 hover:border-white/20 p-8 rounded-3xl transition-all hover:-translate-y-2 group text-left backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
              <LineChart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Track Your Progress</h3>
            <p className="text-gray-400 leading-relaxed">
              Sync your solved problems across all platforms automatically. Watch your stats grow, maintain your streak, and conquer new heights.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
