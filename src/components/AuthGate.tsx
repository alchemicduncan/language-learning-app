import React, { useState, useEffect } from 'react';
import { useApp } from '../lib/state.js';
import { Sparkles, User, Mail, GraduationCap, ArrowRight, UserCheck, LogIn, AlertCircle, Languages, Sun, Moon, Key } from 'lucide-react';

interface AuthGateProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export function AuthGate({ darkMode, setDarkMode }: AuthGateProps) {
  const { register, login, userState, error, fetchProgress } = useApp();
  const [isRegisterMode, setIsRegisterMode] = useState(true);
  
  // Registration Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [targetLanguage, setTargetLanguage] = useState('Persian');
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Google Sign-In States
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);

  useEffect(() => {
    const handleAuthMessage = async (e: MessageEvent) => {
      const origin = e.origin;
      // Allow relative runs or localhost
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (e.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsLoading(true);
        setLocalError(null);
        try {
          await fetchProgress();
        } catch (err: any) {
          setLocalError(err.message || 'Failed to reload profile after Google Sign-In.');
        } finally {
          setIsLoading(false);
        }
      } else if (e.data?.type === 'GOOGLE_AUTH_FAILURE') {
        setLocalError(decodeURIComponent(e.data?.error || 'Google authentication failed.'));
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [fetchProgress]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setLocalError(null);
    try {
      const redirectUri = window.location.origin + '/api/auth/google/callback';
      const res = await fetch(`/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Google Sign-In configuration is missing.');
      }

      const { url } = await res.json();
      
      // Open the Google Auth URL directly in a popup window
      const authWindow = window.open(
        url,
        'google_oauth_popup',
        'width=500,height=650,left=100,top=100'
      );

      if (!authWindow) {
        setLocalError('Popup was blocked. Please allow popups for this site to complete sign-in.');
      }
    } catch (err: any) {
      setLocalError(err.message);
      // If GOOGLE_CLIENT_ID or secret is missing, display the helpful manual setup / sandbox bypass modal
      if (err.message.includes('not configured') || err.message.includes('missing') || err.message.includes('configuration')) {
        setShowGoogleSetup(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateGoogleLogin = async () => {
    setIsLoading(true);
    setLocalError(null);
    try {
      // Simulate Google Sign-In by checking if user exists, otherwise registering
      const demoEmail = 'google.learner@example.com';
      const existingUser = userState?.usersList?.find(u => u.email === demoEmail);
      
      if (existingUser) {
        await login(demoEmail);
      } else {
        await register('Google Learner', demoEmail, 'Beginner', targetLanguage);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Simulation failed.');
    } finally {
      setIsLoading(false);
      setShowGoogleSetup(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setLocalError('Please fill in all fields.');
      return;
    }
    
    setIsLoading(true);
    setLocalError(null);
    try {
      await register(name.trim(), email.trim().toLowerCase(), level, targetLanguage);
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setLocalError('Please enter your email.');
      return;
    }

    setIsLoading(true);
    setLocalError(null);
    try {
      await login(loginEmail.trim().toLowerCase());
    } catch (err: any) {
      setLocalError(err.message || 'Account not found. Please check your email or register.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (emailToLogin: string) => {
    setIsLoading(true);
    setLocalError(null);
    try {
      await login(emailToLogin);
    } catch (err: any) {
      setLocalError(err.message || 'Quick sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const existingAccounts = userState?.usersList || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      {/* CARD OUTER CONTAINER */}
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden flex flex-col">
        
        {/* BRAND HEADER Banner */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-8 text-white text-center relative">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition cursor-pointer flex items-center justify-center border border-white/10"
            title="Toggle Light/Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="mx-auto w-12 h-12 bg-indigo-600/50 rounded-2xl border border-indigo-400/20 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">AI Multi-Language Tutor</h2>
          <p className="text-xs text-indigo-200/80 mt-1 font-medium">Adaptive Language Curriculum & Spaced Repetition (SRS)</p>
        </div>

        <div className="p-6 md:p-8 flex flex-col gap-6">
          
          {/* TOGGLE NAVIGATION */}
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setIsRegisterMode(true);
                setLocalError(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${isRegisterMode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Register Profile
            </button>
            <button
              onClick={() => {
                setIsRegisterMode(false);
                setLocalError(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${!isRegisterMode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Sign In
            </button>
          </div>

          {/* GOOGLE SIGN-IN BUTTON */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleGoogleSignIn}
              type="button"
              disabled={isLoading}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="100%" height="100%">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* GOOGLE CONFIGURATION SETUP GUIDE & DEMO BYPASS */}
            {showGoogleSetup && (
              <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4.5 text-xs text-slate-700 flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl" />
                <div className="flex items-start gap-2">
                  <Key className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-800 mb-1">Google OAuth Credentials Required</h4>
                    <p className="leading-relaxed">To use real Google Sign-In, please add your Google Client Credentials inside your AI Studio <b>Settings panel &rarr; Secrets</b>:</p>
                  </div>
                </div>

                <div className="bg-white/80 border border-slate-200/60 p-2.5 rounded-xl font-mono text-[10px] flex flex-col gap-1.5 text-slate-600">
                  <div><b>Authorized Redirect URI:</b></div>
                  <div className="select-all bg-slate-100 p-1.5 rounded text-indigo-600 break-all font-bold">
                    {window.location.origin}/api/auth/google/callback
                  </div>
                  <div className="mt-1 font-sans"><b>Add Environment Variables:</b></div>
                  <div className="flex flex-col gap-1 pl-1">
                    <div>&bull; <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-bold">GOOGLE_CLIENT_ID</code></div>
                    <div>&bull; <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-bold">GOOGLE_CLIENT_SECRET</code></div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <button
                    onClick={handleSimulateGoogleLogin}
                    type="button"
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded-xl transition cursor-pointer text-center text-[11px]"
                  >
                    Bypass / Run Demo Google Profile
                  </button>
                  <button
                    onClick={() => setShowGoogleSetup(false)}
                    type="button"
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold rounded-xl transition cursor-pointer text-[11px]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200/60"></div>
              <span className="flex-shrink mx-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">or email credentials</span>
              <div className="flex-grow border-t border-slate-200/60"></div>
            </div>
          </div>

          {/* SYSTEM ERROR LOGS */}
          {(localError || error) && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* FORMS */}
          {isRegisterMode ? (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="reg_name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="reg_email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 font-sans">Starting Proficiency Level</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    id="reg_level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition cursor-pointer appearance-none"
                  >
                    <option value="Beginner">Beginner — Starting with basic vocabulary</option>
                    <option value="Intermediate">Intermediate — Conversation & simple travel phrases</option>
                    <option value="Advanced">Advanced — Etiquette, prose & poetry</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 font-sans">Target Language</label>
                <div className="relative">
                  <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    id="reg_language"
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition cursor-pointer appearance-none"
                  >
                    <option value="Persian">Persian (Farsi)</option>
                    <option value="Middle Egyptian Hieroglyphs">Middle Egyptian Hieroglyphs 𓋹</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Japanese">Japanese</option>
                  </select>
                </div>
              </div>

              <button
                id="reg_submit_btn"
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <span>Create Profile & Begin Learning</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

            </form>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Registered Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="login_email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition"
                  />
                </div>
              </div>

              <button
                id="login_submit_btn"
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                {isLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>

            </form>
          )}

          {/* QUICK SIGN-IN PRESETS FOR TESTING */}
          {existingAccounts.length > 0 && (
            <div className="border-t border-slate-100 pt-5 flex flex-col gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 text-center">
                Registered Profile Accounts
              </span>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {existingAccounts.map((acct) => (
                  <button
                    key={acct.email}
                    onClick={() => handleQuickLogin(acct.email)}
                    disabled={isLoading}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/50 hover:border-slate-300 rounded-xl p-3 flex items-center justify-between text-left transition cursor-pointer text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                        {acct.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 group-hover:text-indigo-600 transition">{acct.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{acct.email}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-600 font-extrabold rounded-full">
                      {acct.proficiencyLevel}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
