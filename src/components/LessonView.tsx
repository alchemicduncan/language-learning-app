import React from 'react';
import { useApp } from '../lib/state.js';
import { A2UIRenderer } from './a2ui/A2UIRenderer.js';
import { BookOpen, Award, CheckCircle, ArrowLeft, RefreshCw, Trophy, Sparkles, HelpCircle } from 'lucide-react';

export function LessonView() {
  const { 
    activeLesson, 
    graderResult, 
    isLessonLoading, 
    isSubmitting, 
    levelUpNotification, 
    clearLevelUp,
    requestNextLesson, 
    changeTab, 
    error,
    userState
  } = useApp();

  const activeLang = userState?.user?.targetLanguage || 'Farsi';

  const handleNextLesson = async () => {
    await requestNextLesson();
  };

  const handleBackToDashboard = () => {
    changeTab('dashboard');
  };

  // 1. LOADING STATES
  if (isLessonLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
          <Sparkles className="w-6 h-6 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <div className="flex flex-col gap-2 max-w-sm">
          <h3 className="text-lg font-bold text-slate-800">Adaptive Tutor AI is thinking...</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Analyzing your current proficiency, vocabulary strengths, and review schedule to construct a custom A2UI JSON payload.
          </p>
        </div>
      </div>
    );
  }

  // 2. ERROR DISPLAY
  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center bg-white border border-slate-100 rounded-3xl shadow-sm my-6 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
          <HelpCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Tutor Session Encountered an Issue</h3>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
        <div className="flex gap-3">
          <button
            id="retry_lesson_btn"
            onClick={requestNextLesson}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Retry Generation
          </button>
          <button
            id="back_error_btn"
            onClick={handleBackToDashboard}
            className="text-slate-600 hover:text-slate-800 border border-slate-200 text-sm font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 3. NO ACTIVE LESSON VIEW
  if (!activeLesson) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center bg-white border border-slate-100 rounded-3xl shadow-sm my-6 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <BookOpen className="w-8 h-8" />
        </div>
        
        <div className="flex flex-col gap-1.5 max-w-sm">
          <h3 className="text-xl font-extrabold text-slate-800">Ready to Learn {activeLang}?</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            No active session is currently running. Let the AI adaptive tutor evaluate your profile and craft a custom grammar, vocabulary, and phonetic lesson for <strong className="text-indigo-600 font-bold">{activeLang}</strong> now!
          </p>
        </div>

        <button
          id="btn_request_first_lesson"
          onClick={requestNextLesson}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold py-3 px-6 rounded-2xl transition duration-200 cursor-pointer shadow-md active:scale-95"
        >
          Draft Custom Lesson Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6 relative">
      
      {/* LEVEL UP POPUP NOTIFICATION */}
      {levelUpNotification && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-100 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl flex flex-col items-center justify-center gap-5 border-t-8 border-t-emerald-500 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>
            
            <div>
              <h3 className="text-xl font-extrabold text-slate-800">Proficiency Level Up!</h3>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                {levelUpNotification}
              </p>
            </div>

            <button
              id="close_level_up_btn"
              onClick={clearLevelUp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition w-full cursor-pointer shadow-md"
            >
              Excellent! Let's Continue
            </button>
          </div>
        </div>
      )}

      {/* LESSON TOP BREADCRUMB HEADER */}
      <div className="flex items-center justify-between">
        <button
          id="btn_back_to_dashboard"
          onClick={handleBackToDashboard}
          className="text-xs md:text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Stats Board
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {activeLesson.level} Level
          </span>
        </div>
      </div>

      {/* CORE TITLE CARD */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col gap-2 relative overflow-hidden border-l-4 border-l-indigo-600">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{activeLesson.topic}</h1>
        <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
          {activeLesson.concept}
        </p>
      </div>

      {/* GRADER EVALUATION PANEL (Visible if graded) */}
      {graderResult && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-lg border-t-8 border-t-emerald-500 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          
          <div className="flex items-center gap-4.5">
            {/* Visual Ring Score Card */}
            <div className="relative shrink-0 flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100">
              <span className="text-2xl font-black text-emerald-700 font-mono">{graderResult.score}</span>
              <span className="text-[10px] text-emerald-600/80 font-bold absolute bottom-2">Score</span>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base md:text-lg font-extrabold text-slate-800">Grader AI Assessment Complete</h3>
              <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-md italic font-medium">
                "{graderResult.feedback}"
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 md:flex-col shrink-0">
            <button
              id="lesson_next_cta_btn"
              onClick={handleNextLesson}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition"
            >
              <RefreshCw className="w-4 h-4" /> Next Adaptive Lesson
            </button>
            <button
              id="lesson_dashboard_cta_btn"
              onClick={handleBackToDashboard}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <ArrowLeft className="w-4 h-4" /> Exit Lesson View
            </button>
          </div>
        </div>
      )}

      {/* RENDER THE RECURSIVE LESSON TREE */}
      <div className="flex flex-col gap-4">
        <A2UIRenderer component={activeLesson.ui} />
      </div>

    </div>
  );
}
