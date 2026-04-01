'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Zap, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const { login, signup, isAuthenticated } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) return;
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate a small delay for UX
    await new Promise((r) => setTimeout(r, 300));

    if (isSignUp) {
      if (!name.trim()) {
        setError('Name is required');
        setLoading(false);
        return;
      }
      if (!email.trim()) {
        setError('Email is required');
        setLoading(false);
        return;
      }
      if (!password) {
        setError('Password is required');
        setLoading(false);
        return;
      }
      const result = signup(name.trim(), email.trim(), password);
      if (!result.success) {
        setError(result.error || 'Sign up failed');
      }
    } else {
      if (!email.trim()) {
        setError('Email is required');
        setLoading(false);
        return;
      }
      if (!password) {
        setError('Password is required');
        setLoading(false);
        return;
      }
      const result = login(email.trim(), password);
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100">
      <div className="w-full max-w-sm mx-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">iMOVS API Dinamic</h1>
          <p className="text-sm text-muted-foreground mt-1">Workflow Automation Platform</p>
        </div>

        {/* Login Card */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <h2 className="text-lg font-semibold text-center">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-xs text-muted-foreground text-center">
              {isSignUp
                ? 'Create a new account to get started'
                : 'Welcome back! Sign in to your account'}
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field (sign up only) */}
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Name</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9 pl-9 text-sm"
                      placeholder="Your name"
                      autoFocus={isSignUp}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 pl-9 text-sm"
                    placeholder="you@example.com"
                    autoFocus={!isSignUp}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 pl-9 text-sm"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full h-9 text-sm font-medium',
                  'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white'
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-1.5" />
                )}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            <Separator className="my-4" />

            <div className="text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSignUp ? (
                  <>
                    Already have an account?{' '}
                    <span className="text-purple-600 font-medium">Sign In</span>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{' '}
                    <span className="text-purple-600 font-medium">Sign Up</span>
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
