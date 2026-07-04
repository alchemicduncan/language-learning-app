import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatabaseSchema, LessonPayload, GraderResult } from '../types.js';

interface AppContextType {
  userState: DatabaseSchema | null;
  dataModel: Record<string, any>;
  activeLesson: LessonPayload | null;
  graderResult: GraderResult | null;
  isLessonLoading: boolean;
  isSubmitting: boolean;
  levelUpNotification: string | null;
  currentTab: 'dashboard' | 'lesson' | 'vocab';
  error: string | null;
  fetchProgress: () => Promise<void>;
  requestNextLesson: () => Promise<void>;
  updateDataModel: (key: string, value: any) => void;
  submitQuiz: () => Promise<void>;
  resetAll: () => Promise<void>;
  changeTab: (tab: 'dashboard' | 'lesson' | 'vocab') => void;
  clearLevelUp: () => void;
  updateUserProfile: (name: string, level: 'Beginner' | 'Intermediate' | 'Advanced', targetLanguage?: string) => Promise<void>;
  register: (name: string, email: string, level: 'Beginner' | 'Intermediate' | 'Advanced', targetLanguage?: string) => Promise<void>;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  reviewWord: (word: string, isCorrect: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userState, setUserState] = useState<DatabaseSchema | null>(null);
  const [dataModel, setDataModel] = useState<Record<string, any>>({});
  const [activeLesson, setActiveLesson] = useState<LessonPayload | null>(null);
  const [graderResult, setGraderResult] = useState<GraderResult | null>(null);
  const [isLessonLoading, setIsLessonLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [levelUpNotification, setLevelUpNotification] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'lesson' | 'vocab'>('dashboard');
  const [error, setError] = useState<string | null>(null);

  // Load progress on mount
  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setError(null);
      const res = await fetch("/api/db/progress");
      if (!res.ok) throw new Error("Failed to load user progress");
      const db = (await res.json()) as DatabaseSchema;
      setUserState(db);
      if (db.currentLesson) {
        setActiveLesson(db.currentLesson);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const requestNextLesson = async () => {
    setIsLessonLoading(true);
    setError(null);
    setGraderResult(null);
    setDataModel({});
    try {
      const res = await fetch("/api/agents/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_next_lesson" }),
      });
      if (!res.ok) throw new Error("Failed to generate adaptive lesson");
      const data = await res.json();
      if (data.lesson) {
        setActiveLesson(data.lesson);
        setUserState(data.dbState);
        setCurrentTab('lesson');
      } else {
        throw new Error(data.error || "No lesson payload received");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLessonLoading(false);
    }
  };

  const updateDataModel = (key: string, value: any) => {
    setDataModel((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const submitQuiz = async () => {
    if (!activeLesson) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_quiz", dataModel }),
      });
      if (!res.ok) throw new Error("Failed to evaluate submission");
      const data = await res.json();
      if (data.grader) {
        setGraderResult(data.grader);
        setUserState(data.dbState);
        if (data.levelUpMessage) {
          setLevelUpNotification(data.levelUpMessage);
        }
      } else {
        throw new Error(data.error || "No grading feedback received");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateUserProfile = async (name: string, level: 'Beginner' | 'Intermediate' | 'Advanced', targetLanguage?: string) => {
    try {
      setError(null);
      const res = await fetch("/api/db/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, proficiencyLevel: level, targetLanguage }),
      });
      if (!res.ok) throw new Error("Failed to update profile details");
      const updatedProfile = await res.json();
      // Re-fetch progress since switching targetLanguage will seed or modify the vocabulary state
      await fetchProgress();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const register = async (name: string, email: string, level: 'Beginner' | 'Intermediate' | 'Advanced', targetLanguage?: string) => {
    try {
      setError(null);
      const res = await fetch("/api/db/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, proficiencyLevel: level, targetLanguage }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register user");
      }
      const db = (await res.json()) as DatabaseSchema;
      setUserState(db);
      setActiveLesson(db.currentLesson || null);
      setGraderResult(null);
      setDataModel({});
      setCurrentTab('dashboard');
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (email: string) => {
    try {
      setError(null);
      const res = await fetch("/api/db/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to login user");
      }
      const db = (await res.json()) as DatabaseSchema;
      setUserState(db);
      setActiveLesson(db.currentLesson || null);
      setGraderResult(null);
      setDataModel({});
      setCurrentTab('dashboard');
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      const res = await fetch("/api/db/logout", { method: "POST" });
      if (!res.ok) throw new Error("Failed to logout user");
      const db = (await res.json()) as DatabaseSchema;
      setUserState(db);
      setActiveLesson(null);
      setGraderResult(null);
      setDataModel({});
      setCurrentTab('dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetAll = async () => {
    try {
      setError(null);
      const res = await fetch("/api/db/reset", { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset database");
      const data = await res.json();
      setUserState(data.db);
      setActiveLesson(null);
      setGraderResult(null);
      setDataModel({});
      setCurrentTab('dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const changeTab = (tab: 'dashboard' | 'lesson' | 'vocab') => {
    setCurrentTab(tab);
  };

  const clearLevelUp = () => {
    setLevelUpNotification(null);
  };

  const reviewWord = async (word: string, isCorrect: boolean) => {
    try {
      setError(null);
      const res = await fetch("/api/db/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, isCorrect }),
      });
      if (!res.ok) throw new Error("Failed to process word review");
      const db = (await res.json()) as DatabaseSchema;
      setUserState(db);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AppContext.Provider
      value={{
        userState,
        dataModel,
        activeLesson,
        graderResult,
        isLessonLoading,
        isSubmitting,
        levelUpNotification,
        currentTab,
        error,
        fetchProgress,
        requestNextLesson,
        updateDataModel,
        submitQuiz,
        resetAll,
        changeTab,
        clearLevelUp,
        updateUserProfile: updateUserProfile as any,
        register,
        login,
        logout,
        reviewWord,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
