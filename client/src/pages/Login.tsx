// ==============================================================================
// Z Institute Management System - Administrator Login View
// Redesigned to match the SaaS Navy & Royal Blue Design System
// ==============================================================================

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { SidebarWaveGraphic } from '../components/common/illustrations/SidebarWaveGraphic';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect destination after login
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  // If already logged in, redirect away from login
  React.useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your administrator email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanEmail, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('[Login] Error:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else {
        setErrorMessage(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07183D] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
      {/* Ambient background blur circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Branding badge */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white shadow-glow-blue mb-4">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h2 className="text-2xl sm:text-3.5xl font-extrabold text-white tracking-tight">
            Z Institute
          </h2>
          <p className="mt-1 text-sm text-blue-200/70 font-medium tracking-wide">
            Management System & Administrative Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-7 sm:p-9 border border-white/20">
          <div className="mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">Sign In to Dashboard</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter your registered institute credentials to continue.
            </p>
          </div>

          {/* Error Notification */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs disabled:bg-slate-50 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center py-3 px-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-glow-blue hover:shadow-lg transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Access Admin Portal</span>
                )}
              </button>
            </div>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Authorized institute staff only. Public registration is closed.
            </p>
          </div>
        </div>
      </div>

      {/* Subtle bottom wave graphic */}
      <div className="absolute bottom-0 left-0 right-0 opacity-40 pointer-events-none">
        <SidebarWaveGraphic className="w-full h-24" />
      </div>
    </div>
  );
};
