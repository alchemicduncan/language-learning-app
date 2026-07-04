import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './lib/state.js';
import { Dashboard } from './components/Dashboard.js';
import { LessonView } from './components/LessonView.js';
import { VocabularyReview } from './components/VocabularyReview.js';
import { AuthGate } from './components/AuthGate.js';
import { Sparkles, Trophy, BookOpen, Layers, RefreshCw, Layers3, Languages, Sun, Moon } from 'lucide-react';

interface MainAppProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

function MainAppContent({ darkMode, setDarkMode }: MainAppProps) {
  const { currentTab, changeTab, userState, isLessonLoading, logout, updateUserProfile } = useApp();

  if (!userState || !userState.user) {
    return <AuthGate darkMode={darkMode} setDarkMode={setDarkMode} />;
  }

  const activeLang = userState.user.targetLanguage || 'Farsi';

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col font-sans">
      
      {/* HEADER LOGO BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* BRANDING LOGO */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-indigo-100 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-extrabold tracking-tight text-slate-800">AI Adaptive Multi-Language Tutor</h1>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest leading-none mt-0.5">Active Target: {activeLang}</p>
            </div>
          </div>

          {/* TAB ROUTING SWITCHERS */}
          <nav className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
            <button
              id="tab_dashboard_btn"
              onClick={() => changeTab('dashboard')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer outline-none
                ${currentTab === 'dashboard' 
                  ? "bg-white text-indigo-950 shadow-xs font-black" 
                  : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>Stats Board</span>
            </button>
            <button
              id="tab_vocab_btn"
              onClick={() => changeTab('vocab')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer outline-none
                ${currentTab === 'vocab' 
                  ? "bg-white text-indigo-950 shadow-xs font-black" 
                  : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <Layers3 className="w-3.5 h-3.5 shrink-0" />
              <span>Vocab Review</span>
            </button>
            <button
              id="tab_lesson_btn"
              onClick={() => changeTab('lesson')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer outline-none
                ${currentTab === 'lesson' 
                  ? "bg-white text-indigo-950 shadow-xs font-black" 
                  : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Active Lesson</span>
              {userState?.currentLesson && (
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              )}
            </button>
          </nav>

          {/* XP BADGE AND SIGN OUT */}
          <div className="flex items-center gap-3">
            {userState?.user && (
              <>
                {/* QUICK LANGUAGE SWITCHER SELECT MENU */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1">
                  <Languages className="w-3.5 h-3.5 text-indigo-600" />
                  <select
                    id="header_language_switcher"
                    value={activeLang}
                    onChange={(e) => {
                      updateUserProfile(userState.user.name, userState.user.proficiencyLevel, e.target.value);
                    }}
                    className="bg-transparent border-none text-xs font-extrabold text-slate-700 outline-none cursor-pointer focus:ring-0 pr-1 py-0"
                  >
                    <option value="Persian">Persian (Farsi)</option>
                    <option value="Middle Egyptian Hieroglyphs">Egyptian Hieroglyphs 𓋹</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Japanese">Japanese</option>
                  </select>
                </div>

                <div className="hidden sm:flex bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-1 rounded-full border border-indigo-100/50 items-center gap-1.5 text-xs font-extrabold text-indigo-700">
                  <Trophy className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{userState.user.xp} XP</span>
                </div>
                <button
                  id="theme_toggle_btn"
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 transition cursor-pointer flex items-center justify-center"
                  aria-label="Toggle Theme"
                  title="Toggle Light/Dark Mode"
                >
                  {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                </button>

                <button
                  id="header_logout_btn"
                  onClick={logout}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-50 border border-slate-200/50 hover:bg-rose-50 hover:border-rose-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>

        </div>
      </header>

      {/* RENDER ACTIVE TAB BODY */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' ? (
          <Dashboard />
        ) : currentTab === 'vocab' ? (
          <VocabularyReview />
        ) : (
          <LessonView />
        )}
      </main>

      {/* HIGH-FIDELITY FOOTER METADATA */}
      <footer className="border-t border-slate-100 bg-white py-4 text-center mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Interactive adaptive parsing engine v1.0 • Tailored real-time learning</span>
          </div>
          <span>AI Adaptive Multi-Language Companion • Active: {activeLang}</span>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <AppProvider>
      <MainAppContent darkMode={darkMode} setDarkMode={setDarkMode} />
    </AppProvider>
  );
}
