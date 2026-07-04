import React, { useState } from 'react';
import { useApp } from '../lib/state.js';
import { Award, Flame, Trophy, BookOpen, Clock, CheckCircle, RefreshCw, User, HelpCircle, Edit2, Check } from 'lucide-react';
import { A2UIAudioPlayer } from './a2ui/A2UIComponents.js';

export function Dashboard() {
  const { userState, resetAll, updateUserProfile, requestNextLesson, isLessonLoading } = useApp();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [editLanguage, setEditLanguage] = useState('Farsi');

  // Sync state when user profile is loaded
  React.useEffect(() => {
    if (userState?.user) {
      setEditName(userState.user.name);
      setEditLevel(userState.user.proficiencyLevel);
      setEditLanguage(userState.user.targetLanguage || 'Farsi');
    }
  }, [userState]);

  if (!userState) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <p className="text-slate-500 text-sm">Loading your language learning portfolio...</p>
      </div>
    );
  }

  const { user, vocabulary, quizResults } = userState;
  const currentLanguage = user.targetLanguage || 'Farsi';

  const isPersianOrFarsi = (lang: string) => {
    const l = lang.toLowerCase();
    return l === 'farsi' || l === 'persian';
  };

  // Filter vocabulary and quiz history specific to active target language
  const filteredVocabulary = vocabulary.filter(v => {
    const vLang = v.language || 'Farsi';
    if (isPersianOrFarsi(currentLanguage)) {
      return isPersianOrFarsi(vLang);
    }
    return vLang.toLowerCase() === currentLanguage.toLowerCase();
  });

  const filteredQuizResults = quizResults.filter(q => {
    const qLang = q.language || 'Farsi';
    if (isPersianOrFarsi(currentLanguage)) {
      return isPersianOrFarsi(qLang);
    }
    return qLang.toLowerCase() === currentLanguage.toLowerCase();
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile(editName, editLevel, editLanguage);
    setIsEditingProfile(false);
  };

  const getSrsBadge = (nextReviewDate: string, timesCorrect: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isDue = nextReviewDate <= todayStr;
    
    if (isDue) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 rounded-full flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3" /> Due for Review
        </span>
      );
    } else if (timesCorrect >= 4) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full flex items-center gap-1 shrink-0">
          <CheckCircle className="w-3 h-3" /> Mastered
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-full flex items-center gap-1 shrink-0">
          <RefreshCw className="w-3 h-3 animate-spin-slow" /> In Progress
        </span>
      );
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto px-4 py-6">
      
      {/* 1. HERO BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative overflow-hidden border border-indigo-900/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
        
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-inner">
            <User className="w-7 md:w-8 h-7 md:h-8 text-indigo-300" />
          </div>
          
          <div>
            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                <input
                  id="profile_name_edit"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white px-3 py-1 rounded-lg text-sm font-semibold outline-none focus:border-indigo-400"
                  placeholder="Enter name"
                  required
                />
                <select
                  id="profile_level_select"
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value as any)}
                  className="bg-white/10 border border-white/20 text-indigo-200 px-3 py-1 rounded-lg text-sm font-medium outline-none focus:border-indigo-400"
                >
                  <option value="Beginner" className="text-slate-900">Beginner Level</option>
                  <option value="Intermediate" className="text-slate-900">Intermediate Level</option>
                  <option value="Advanced" className="text-slate-900">Advanced Level</option>
                </select>
                <select
                  id="profile_language_select"
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value)}
                  className="bg-white/10 border border-white/20 text-indigo-200 px-3 py-1 rounded-lg text-sm font-medium outline-none focus:border-indigo-400 font-sans"
                >
                  <option value="Persian" className="text-slate-900 font-sans">Persian (Farsi)</option>
                  <option value="Middle Egyptian Hieroglyphs" className="text-slate-900 font-sans">Middle Egyptian Hieroglyphs</option>
                  <option value="Spanish" className="text-slate-900 font-sans">Spanish</option>
                  <option value="French" className="text-slate-900 font-sans">French</option>
                  <option value="German" className="text-slate-900 font-sans">German</option>
                  <option value="Arabic" className="text-slate-900 font-sans">Arabic</option>
                  <option value="Japanese" className="text-slate-900 font-sans">Japanese</option>
                </select>
                <div className="flex gap-1.5 mt-2 sm:mt-0">
                  <button
                    id="save_profile_btn"
                    type="submit"
                    className="p-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white transition cursor-pointer"
                    title="Save Changes"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    id="cancel_profile_btn"
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-2.5 py-1 text-xs text-slate-300 hover:text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">{user.name}</h1>
                  <button
                    id="edit_profile_btn"
                    onClick={() => {
                      setEditName(user.name);
                      setEditLevel(user.proficiencyLevel);
                      setEditLanguage(user.targetLanguage || 'Farsi');
                      setIsEditingProfile(true);
                    }}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-indigo-300 transition cursor-pointer"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 text-xs font-extrabold tracking-wider uppercase bg-indigo-500 text-white rounded-full">
                    {user.proficiencyLevel}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-violet-600/50 text-indigo-100 rounded-full">
                    Target: {user.targetLanguage || 'Farsi'}
                  </span>
                  <span className="text-slate-400 text-xs font-medium">AI Adaptive Curriculum</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          id="btn_launch_lesson"
          onClick={requestNextLesson}
          disabled={isLessonLoading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-2xl transition duration-300 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 shrink-0 z-10 flex items-center justify-center gap-2 border border-indigo-400/20"
        >
          {isLessonLoading ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Tailoring Next Lesson...</span>
            </>
          ) : (
            <>
              <BookOpen className="w-4.5 h-4.5" />
              <span>Launch Next Adaptive Lesson</span>
            </>
          )}
        </button>
      </div>

      {/* 2. ACHIEVEMENTS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Active Streak</p>
            <h3 className="text-xl font-extrabold text-slate-800">{user.streak} days</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-50 border border-yellow-100 flex items-center justify-center text-yellow-600 shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Experience</p>
            <h3 className="text-xl font-extrabold text-slate-800">{user.xp} XP</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Completed Lessons</p>
            <h3 className="text-xl font-extrabold text-slate-800">{user.completedLessons} sessions</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Vocabulary Count</p>
            <h3 className="text-xl font-extrabold text-slate-800">{filteredVocabulary.length} words</h3>
          </div>
        </div>

      </div>

      {/* 3. VOCABULARY AND QUIZ GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLS: VOCABULARY LIST */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Vocabulary SRS Spacing Board</span>
            </h2>
            <span className="text-slate-500 text-xs font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">
              {filteredVocabulary.length} Registered Items
            </span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
            {filteredVocabulary.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center gap-3">
                <HelpCircle className="w-12 h-12 text-slate-300" />
                <p className="text-slate-500 font-medium text-sm">No vocabulary logged yet. Launch a lesson to master your first words!</p>
              </div>
            ) : (
              filteredVocabulary.map((vocab) => {
                const totalAttempts = vocab.timesCorrect + vocab.timesIncorrect;
                const ratio = totalAttempts > 0 ? (vocab.timesCorrect / totalAttempts) * 100 : 0;
                
                return (
                  <div key={vocab.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition duration-150">
                    <div className="flex items-center gap-4">
                      {/* Round Pronouncer Button */}
                      <div className="shrink-0">
                        <A2UIAudioPlayer textToPronounce={vocab.word} />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2.5">
                          {/* Word styled beautifully */}
                          <span dir="auto" className="font-sans text-xl font-bold text-slate-800 select-all">{vocab.word}</span>
                          <span className="text-slate-400 text-xs font-mono">/{vocab.phonetic}/</span>
                        </div>
                        <span className="text-sm text-slate-600 font-medium">{vocab.translation}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      {/* Success stats */}
                      <div className="flex flex-col items-end gap-1 text-right shrink-0">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">SRS Accuracy</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${ratio}%` }} />
                          </div>
                          <span className="text-xs font-extrabold text-slate-700 font-mono">{vocab.timesCorrect}/{totalAttempts}</span>
                        </div>
                      </div>

                      {/* Review status */}
                      {getSrsBadge(vocab.nextReviewDate, vocab.timesCorrect)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT 1 COL: ASSESSMENT HISTORY */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-indigo-600" />
            <span>Grading History Logs</span>
          </h2>

          <div className="flex flex-col gap-3.5">
            {filteredQuizResults.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-slate-400 text-sm shadow-sm flex flex-col items-center justify-center gap-2.5">
                <HelpCircle className="w-10 h-10 text-slate-300" />
                <span>No assessments completed yet.</span>
              </div>
            ) : (
              filteredQuizResults.slice().reverse().map((quiz) => {
                const isExcellent = quiz.score >= 85;
                const isPassing = quiz.score >= 60;
                
                let scoreBadge = "bg-rose-50 text-rose-700 border-rose-200";
                if (isExcellent) scoreBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                else if (isPassing) scoreBadge = "bg-blue-50 text-blue-700 border-blue-200";

                return (
                  <div key={quiz.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow transition duration-200 flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-200" />
                    
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-800 text-sm truncate pr-1">{quiz.topic}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border shrink-0 ${scoreBadge}`}>
                        {quiz.score}%
                      </span>
                    </div>

                    <p className="text-slate-500 text-xs font-medium leading-relaxed italic border-l-2 border-indigo-200 pl-2 mt-1">
                      "{quiz.feedback}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                      <span>Ref ID: {quiz.id}</span>
                      <span>{new Date(quiz.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RESET APP PORTFOLIO DANGER ZONE */}
          <div className="mt-8 border border-rose-100/60 rounded-2xl p-4 bg-rose-50/20 flex flex-col gap-2 text-center shadow-inner">
            <h5 className="text-xs font-extrabold text-rose-700 uppercase tracking-widest">System Admin Console</h5>
            <p className="text-[11px] text-slate-500 font-medium">Testing with zero values or changing starting mock datasets?</p>
            <button
              id="reset_database_btn"
              onClick={() => {
                if (confirm("Are you sure you want to reset your local Farsi database, SRS word history, and progress records?")) {
                  resetAll();
                }
              }}
              className="text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition cursor-pointer outline-none active:scale-95"
            >
              Reset Database & Progress Cache
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
