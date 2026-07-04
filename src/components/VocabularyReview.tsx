import React, { useState } from 'react';
import { useApp } from '../lib/state.js';
import { BookOpen, CheckCircle, RefreshCw, Volume2, HelpCircle, Eye, ArrowRight, Award, Trophy, ChevronRight, Clock } from 'lucide-react';
import { A2UIAudioPlayer } from './a2ui/A2UIComponents.js';
import { motion, AnimatePresence } from 'motion/react';

export function VocabularyReview() {
  const { userState, reviewWord } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewSessionsCompleted, setReviewSessionsCompleted] = useState(0);

  if (!userState || !userState.user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <p className="text-slate-500 text-sm">Synchronizing your learning vault...</p>
      </div>
    );
  }

  const { user, vocabulary } = userState;
  const currentLanguage = user.targetLanguage || 'Farsi';

  const isPersianOrFarsi = (lang: string) => {
    const l = lang.toLowerCase();
    return l === 'farsi' || l === 'persian';
  };

  // Get active vocab for the current target language
  const activeVocab = vocabulary.filter(v => {
    const vLang = v.language || 'Farsi';
    if (isPersianOrFarsi(currentLanguage)) {
      return isPersianOrFarsi(vLang);
    }
    return vLang.toLowerCase() === currentLanguage.toLowerCase();
  });

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Sort or prioritize cards that are due for review (nextReviewDate <= today)
  const dueCards = activeVocab.filter(v => v.nextReviewDate <= todayStr);
  const cardsToReview = dueCards.length > 0 ? dueCards : activeVocab;

  const activeCard = cardsToReview[currentIndex];

  const handleReviewAnswer = async (isCorrect: boolean) => {
    if (!activeCard) return;
    
    // Submit review to state and database
    await reviewWord(activeCard.word, isCorrect);
    
    // Advance state
    setIsFlipped(false);
    setReviewSessionsCompleted(prev => prev + 1);
    
    if (currentIndex < cardsToReview.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Loop back to start or stay at 0
      setCurrentIndex(0);
    }
  };

  const isRtl = ['farsi', 'arabic', 'hebrew', 'persian'].includes(currentLanguage.toLowerCase());

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span>Vocabulary Flashcard Review</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Reviewing cards for <strong className="text-indigo-600 font-bold">{currentLanguage}</strong> using automatic Spaced Repetition (SRS).
          </p>
        </div>
        
        {/* STATS CHIPS */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1.5 text-xs font-extrabold bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5" /> {dueCards.length} Due Today
          </span>
          <span className="px-3 py-1.5 text-xs font-extrabold bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl flex items-center gap-1.5 shrink-0">
            <Award className="w-3.5 h-3.5" /> {reviewSessionsCompleted} Practiced
          </span>
        </div>
      </div>

      {cardsToReview.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-2">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Vocabulary Registered Yet</h3>
          <p className="text-slate-500 max-w-md text-sm leading-relaxed">
            Please complete an active lesson to seed initial vocabulary items for your portfolio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* FLASHCARD COL */}
          <div className="md:col-span-2 flex flex-col gap-6">
            
            {/* INSTRUCTION CARD BANNER */}
            {dueCards.length === 0 && (
              <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 text-xs font-semibold text-amber-800 leading-relaxed">
                🎉 All caught up on today's reviews! Showing all registered words for general practice.
              </div>
            )}

            {/* SRS FLASHCARD BOX */}
            <div className="relative h-96 w-full perspective-1000">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex + (isFlipped ? '-flipped' : '-unflipped')}
                  initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90 }}
                  transition={{ duration: 0.25 }}
                  className={`absolute inset-0 bg-white border border-slate-100 rounded-3xl p-8 flex flex-col justify-between shadow-md cursor-pointer select-none transition-shadow hover:shadow-lg
                    ${isFlipped ? 'border-indigo-100/50 bg-slate-50/20' : ''}`}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* CARD HEADER */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 font-mono tracking-wider">
                    <span>WORD {currentIndex + 1} OF {cardsToReview.length}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                      {isFlipped ? 'REVERSE' : 'FRONT'}
                    </span>
                  </div>

                  {/* CENTER CONTENT */}
                  <div className="flex flex-col items-center justify-center text-center gap-4 py-8">
                    {!isFlipped ? (
                      <>
                        <h2 
                          dir={isRtl ? 'rtl' : 'ltr'} 
                          className={`font-black tracking-tight text-slate-800 leading-none select-all transition-all duration-300
                            ${activeCard.word.length > 8 ? 'text-4xl md:text-5xl' : 'text-5xl md:text-6xl'}`}
                        >
                          {activeCard.word}
                        </h2>
                        <span className="text-slate-400 text-xs font-mono tracking-widest flex items-center gap-1 mt-2">
                          <Eye className="w-3.5 h-3.5" /> CLICK CARD TO FLIP
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-4 animate-fade-in">
                        {/* Pronunciation block */}
                        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100/40 px-4 py-2 rounded-2xl">
                          <A2UIAudioPlayer textToPronounce={activeCard.word} />
                          <span className="text-indigo-950 font-black text-xl font-mono">
                            /{activeCard.phonetic}/
                          </span>
                        </div>

                        {/* Translation */}
                        <h3 className="text-2xl font-bold text-slate-800 leading-tight">
                          {activeCard.translation}
                        </h3>
                      </div>
                    )}
                  </div>

                  {/* CARD FOOTER INTERACTIVE ACTION BUTTONS */}
                  <div className="flex items-center justify-center mt-4">
                    {!isFlipped ? (
                      <button
                        type="button"
                        className="text-xs font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-4 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFlipped(true);
                        }}
                      >
                        <span>Reveal Translation</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleReviewAnswer(false)}
                          className="flex-1 text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-4 py-3 rounded-2xl transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Needs practice (+2 XP)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewAnswer(true)}
                          className="flex-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-3 rounded-2xl transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-100"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Got it! (+10 XP)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* MANUAL SELECT NAVIGATION CHIPS */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {cardsToReview.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsFlipped(false);
                  }}
                  className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition cursor-pointer
                    ${idx === currentIndex 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

          </div>

          {/* GENERAL PROGRESS STATS SIDEBAR */}
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Trophy className="w-4 h-4 text-indigo-500" />
                <span>Active Performance</span>
              </h3>

              <div className="flex flex-col gap-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Spaced Accuracy</span>
                  <span className="font-extrabold text-slate-800 font-mono">
                    {Math.round(
                      (activeVocab.filter(v => v.timesCorrect > 0).length / (activeVocab.length || 1)) * 100
                    )}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Words Mastered (4+ times)</span>
                  <span className="font-extrabold text-emerald-600 font-mono">
                    {activeVocab.filter(v => v.timesCorrect >= 4).length} words
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Words In Progress</span>
                  <span className="font-extrabold text-blue-600 font-mono">
                    {activeVocab.filter(v => v.timesCorrect > 0 && v.timesCorrect < 4).length} words
                  </span>
                </div>
              </div>
            </div>

            {/* SRS EXPLANATION BANNER */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-md flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl -mr-10 -mt-10" />
              <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">How Spaced Repetition Works</h4>
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                When you click "Got it!", the next review is scheduled further in the future (e.g. 2, 4, 8 days). If a word is missed, it returns to the active pool tomorrow!
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
