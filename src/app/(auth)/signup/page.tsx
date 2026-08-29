"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Mail, Lock, User, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SignupContent() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const nextParam = searchParams.get("next");
  const destination = (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//'))
    ? nextParam
    : "/dashboard";

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setErrorMessage(decodeURIComponent(error));
    }
  }, [searchParams]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || !cleanEmail || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (cleanUsername.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      toast.error("Username can only contain letters, numbers, underscores, and dashes");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      if (destination && destination !== '/dashboard') {
        callbackUrl.searchParams.set('next', destination);
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            display_name: cleanUsername,
          },
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (error) throw error;

      // In Supabase, if email confirmation is enabled and the user already exists,
      // data.user exists but data.user.identities is empty (anti-enumeration behavior)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setErrorMessage("An account with this email address already exists. Please log in instead.");
        toast.error("Account already exists with this email");
        return;
      }

      if (data.session) {
        // Auto-login if email confirmations are disabled in Supabase
        toast.success("Account created successfully! Welcome to OneDSA.");
        router.push(destination);
        router.refresh();
      } else {
        // Confirmation email was sent
        setIsVerificationSent(true);
        setResendCountdown(60);
        toast.success("Verification email sent! Please check your inbox.");
      }
    } catch (error: any) {
      const message = error.message || "Failed to create account. Please try again.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCountdown > 0 || isResending) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsResending(true);
    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      if (destination && destination !== '/dashboard') {
        callbackUrl.searchParams.set('next', destination);
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (error) throw error;

      setResendCountdown(60);
      toast.success("Verification email resent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setErrorMessage(null);
    setOauthLoading(provider);
    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      if (destination && destination !== '/dashboard') {
        callbackUrl.searchParams.set('next', destination);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) throw error;
    } catch (error: any) {
      const msg = `Failed to continue with ${provider === 'google' ? 'Google' : 'GitHub'}`;
      setErrorMessage(error.message || msg);
      toast.error(msg);
      setOauthLoading(null);
    }
  };

  const isBusy = isLoading || oauthLoading !== null;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background p-4 animate-fade-in py-12">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/20 blur-[120px] mix-blend-screen animate-pulse-glow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px] mix-blend-screen animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md z-10 animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="bg-white/5 p-3 rounded-2xl glow-border mb-4 transition-transform hover:scale-105">
            <Sparkles className="w-8 h-8 text-primary" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
          <p className="text-muted-foreground mt-2 text-center">
            {isVerificationSent 
              ? "Verify your email to continue" 
              : <>Join <span className="gradient-text font-semibold">OneDSA</span> to unify your journey</>}
          </p>
        </div>

        <div className="glass-card p-8 rounded-2xl relative">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 text-left">{errorMessage}</div>
            </div>
          )}

          {!isVerificationSent ? (
            <>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="johndoe"
                      className="pl-10 bg-black/20 border-white/10 focus:border-primary/50 transition-colors"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck="false"
                      disabled={isBusy}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      className="pl-10 bg-black/20 border-white/10 focus:border-primary/50 transition-colors"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck="false"
                      disabled={isBusy}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-black/20 border-white/10 focus:border-primary/50 transition-colors"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isBusy}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 6 && (
                    <p className="text-xs text-amber-400">Must be at least 6 characters</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-black/20 border-white/10 focus:border-primary/50 transition-colors"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isBusy}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                  {confirmPassword.length > 0 && password === confirmPassword && password.length >= 6 && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] hover:opacity-90 transition-all border-0 shadow-lg group mt-2" 
                  disabled={isBusy || (password.length > 0 && password.length < 6) || (confirmPassword.length > 0 && password !== confirmPassword)}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Create Account"
                  )}
                  <span className="absolute inset-0 rounded-md bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></span>
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground rounded-full">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => handleOAuthLogin('google')}
                  disabled={isBusy}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors relative"
                >
                  {oauthLoading === 'google' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Google
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => handleOAuthLogin('github')}
                  disabled={isBusy}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors relative"
                >
                  {oauthLoading === 'github' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  )}
                  GitHub
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="w-14 h-14 bg-purple-500/10 text-primary rounded-full flex items-center justify-center mx-auto border border-primary/20">
                <Mail className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  We sent a confirmation link to:
                </p>
                <p className="font-semibold text-foreground bg-white/5 py-1.5 px-3 rounded-lg border border-white/10 text-sm break-all">
                  {email}
                </p>
                <p className="text-xs text-muted-foreground pt-2">
                  Please click the link inside the email to verify and activate your account.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button
                  variant="outline"
                  onClick={handleResendVerification}
                  disabled={resendCountdown > 0 || isResending}
                  className="w-full bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
                >
                  {isResending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {resendCountdown > 0 ? `Resend email in ${resendCountdown}s` : "Resend verification email"}
                </Button>

                <Link
                  href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"}
                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-md bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white hover:opacity-90 transition-opacity"
                >
                  Proceed to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link 
            href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"} 
            className="font-semibold text-primary hover:underline transition-all"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <SignupContent />
    </Suspense>
  );
}
