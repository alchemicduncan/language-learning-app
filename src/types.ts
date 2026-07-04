export interface UserProfile {
  name: string;
  email?: string;
  proficiencyLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  xp: number;
  streak: number;
  completedLessons: number;
}

export interface VocabularyItem {
  id: string;
  word: string;
  phonetic: string;
  translation: string;
  timesCorrect: number;
  timesIncorrect: number;
  nextReviewDate: string;
}

export interface QuizResult {
  id: string;
  score: number;
  feedback: string;
  date: string;
  topic: string;
}

export interface DatabaseSchema {
  user: UserProfile;
  vocabulary: VocabularyItem[];
  quizResults: QuizResult[];
  currentLesson: LessonPayload | null;
  usersList?: Array<{ name: string; email: string; proficiencyLevel: string }>;
  currentUserEmail?: string | null;
}

export interface A2UIComponent {
  id: string;
  type: 'Column' | 'Row' | 'Card' | 'Text' | 'TextField' | 'ChoicePicker' | 'Button' | 'AudioPlayer';
  text?: string;
  usageHint?: 'heading' | 'subheading' | 'body' | 'success' | 'error' | 'instruction' | 'farsi' | 'english';
  placeholder?: string;
  label?: string;
  bindPath?: string;
  options?: string[];
  action?: string;
  audioUrl?: string;
  textToPronounce?: string;
  children?: A2UIComponent[];
}

export interface LessonPayload {
  topic: string;
  level: string;
  concept: string;
  vocabulary: Array<{ word: string; translation: string; phonetic: string }>;
  ui: A2UIComponent[];
}

export interface GraderResult {
  score: number;
  feedback: string;
  grades: Array<{
    bindPath: string;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
  }>;
}
