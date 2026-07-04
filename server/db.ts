import fs from 'fs';
import path from 'path';

export interface UserProfile {
  name: string;
  email: string;
  proficiencyLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  targetLanguage: string; // e.g. "Farsi", "Spanish", "French", "Arabic", "German", "Japanese"
  xp: number;
  streak: number;
  completedLessons: number;
}

export interface VocabularyItem {
  id: string;
  word: string;      // Word in target language
  phonetic: string;  // Phonetic transliteration
  translation: string; // English translation
  timesCorrect: number;
  timesIncorrect: number;
  nextReviewDate: string; // ISO Date YYYY-MM-DD
  language?: string; // Target language association
}

export interface QuizResult {
  id: string;
  score: number;
  feedback: string;
  date: string;
  topic: string;
  language?: string; // Target language association
}

export interface DatabaseSchema {
  user: UserProfile;
  vocabulary: VocabularyItem[]; // All vocabulary items
  quizResults: QuizResult[];     // All quiz results
  currentLesson: any;
  usersList?: Array<{ name: string; email: string; proficiencyLevel: string; targetLanguage: string }>;
  currentUserEmail?: string | null;
}

interface FileDatabaseSchema {
  users: Record<string, {
    profile: UserProfile;
    vocabulary: VocabularyItem[];
    quizResults: QuizResult[];
    currentLesson: any;
  }>;
  currentUserEmail: string | null;
}

const DB_FILE = path.join(process.cwd(), 'server-db.json');

const DEFAULT_GUEST_EMAIL = "learner@example.com";

const DEFAULT_VOCABULARY: VocabularyItem[] = [
  { id: "1", word: "سلام", phonetic: "Salaam", translation: "Hello", timesCorrect: 3, timesIncorrect: 1, nextReviewDate: "2026-07-04", language: "Farsi" },
  { id: "2", word: "خداحافظ", phonetic: "Khodaahaafez", translation: "Goodbye", timesCorrect: 2, timesIncorrect: 0, nextReviewDate: "2026-07-05", language: "Farsi" },
  { id: "3", word: "تشکر", phonetic: "Tashakkor", translation: "Thank you", timesCorrect: 1, timesIncorrect: 2, nextReviewDate: "2026-07-03", language: "Farsi" },
  { id: "4", word: "بله", phonetic: "Baleh", translation: "Yes", timesCorrect: 4, timesIncorrect: 0, nextReviewDate: "2026-07-06", language: "Farsi" },
  { id: "5", word: "نخیر", phonetic: "Nakheyr", translation: "No", timesCorrect: 2, timesIncorrect: 1, nextReviewDate: "2026-07-04", language: "Farsi" },
  { id: "6", word: "آب", phonetic: "Aab", translation: "Water", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: "2026-07-03", language: "Farsi" },
  { id: "7", word: "نان", phonetic: "Naan", translation: "Bread", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: "2026-07-03", language: "Farsi" },
  { id: "8", word: "کتاب", phonetic: "Ketaab", translation: "Book", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: "2026-07-03", language: "Farsi" }
];

const DEFAULT_QUIZ_RESULTS = [
  { id: "q1", score: 85, feedback: "Great job on the initial greeting lesson! Pay attention to the pronunciation of 'Khodaahaafez'.", date: "2026-07-02T15:30:00Z", topic: "Basic Greetings", language: "Farsi" }
];

const DEFAULT_FILE_DB: FileDatabaseSchema = {
  users: {
    [DEFAULT_GUEST_EMAIL]: {
      profile: {
        name: "Farsi Learner",
        email: DEFAULT_GUEST_EMAIL,
        proficiencyLevel: "Beginner",
        targetLanguage: "Farsi",
        xp: 150,
        streak: 3,
        completedLessons: 2
      },
      vocabulary: DEFAULT_VOCABULARY,
      quizResults: DEFAULT_QUIZ_RESULTS,
      currentLesson: null
    }
  },
  currentUserEmail: DEFAULT_GUEST_EMAIL
};

// Internal helper to read the multi-user file database
function readFileDb(): FileDatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeFileDb(DEFAULT_FILE_DB);
      return DEFAULT_FILE_DB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Migration from old flat schema to multi-user schema
    if (parsed.user && !parsed.users) {
      const email = parsed.user.email || DEFAULT_GUEST_EMAIL;
      const migrated: FileDatabaseSchema = {
        users: {
          [email]: {
            profile: {
              name: parsed.user.name || "Farsi Learner",
              email: email,
              proficiencyLevel: parsed.user.proficiencyLevel || "Beginner",
              targetLanguage: parsed.user.targetLanguage || "Farsi",
              xp: parsed.user.xp || 150,
              streak: parsed.user.streak || 3,
              completedLessons: parsed.user.completedLessons || 2
            },
            vocabulary: (parsed.vocabulary || DEFAULT_VOCABULARY).map((v: any) => ({ ...v, language: v.language || "Farsi" })),
            quizResults: (parsed.quizResults || DEFAULT_QUIZ_RESULTS).map((q: any) => ({ ...q, language: q.language || "Farsi" })),
            currentLesson: parsed.currentLesson || null
          }
        },
        currentUserEmail: email
      };
      writeFileDb(migrated);
      return migrated;
    }

    // Ensure targetLanguage, and vocabulary/quiz language fields are populated in existing records
    if (parsed.users) {
      Object.keys(parsed.users).forEach(email => {
        const u = parsed.users[email];
        if (!u.profile.targetLanguage) {
          u.profile.targetLanguage = "Farsi";
        }
        if (u.vocabulary) {
          u.vocabulary.forEach((v: any) => {
            if (!v.language) v.language = "Farsi";
          });
        }
        if (u.quizResults) {
          u.quizResults.forEach((q: any) => {
            if (!q.language) q.language = "Farsi";
          });
        }
      });
    }
    
    return parsed as FileDatabaseSchema;
  } catch (err) {
    console.error("Error reading file database, returning default:", err);
    return DEFAULT_FILE_DB;
  }
}

// Internal helper to write the multi-user file database
function writeFileDb(fileDb: FileDatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(fileDb, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing file database:", err);
  }
}

export function getDefaultVocabulary(language: string): VocabularyItem[] {
  const normalized = language.trim().toLowerCase();
  if (normalized === "spanish") {
    return [
      { id: "sp1", word: "Hola", phonetic: "Oh-lah", translation: "Hello", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Spanish" },
      { id: "sp2", word: "Adiós", phonetic: "Ah-dee-ohs", translation: "Goodbye", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Spanish" },
      { id: "sp3", word: "Gracias", phonetic: "Grah-see-ahs", translation: "Thank you", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Spanish" },
      { id: "sp4", word: "Sí", phonetic: "See", translation: "Yes", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Spanish" },
      { id: "sp5", word: "No", phonetic: "No", translation: "No", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Spanish" },
      { id: "sp6", word: "Agua", phonetic: "Ah-gwah", translation: "Water", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Spanish" },
      { id: "sp7", word: "Pan", phonetic: "Pahn", translation: "Bread", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Spanish" },
      { id: "sp8", word: "Libro", phonetic: "Lee-broh", translation: "Book", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Spanish" }
    ];
  }
  if (normalized === "french") {
    return [
      { id: "fr1", word: "Bonjour", phonetic: "Bon-zhoor", translation: "Hello", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "French" },
      { id: "fr2", word: "Au revoir", phonetic: "Oh-ruh-vwar", translation: "Goodbye", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "French" },
      { id: "fr3", word: "Merci", phonetic: "Mair-see", translation: "Thank you", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "French" },
      { id: "fr4", word: "Oui", phonetic: "Wee", translation: "Yes", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "French" },
      { id: "fr5", word: "Non", phonetic: "Noh", translation: "No", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "French" },
      { id: "fr6", word: "Eau", phonetic: "Oh", translation: "Water", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "French" },
      { id: "fr7", word: "Pain", phonetic: "Pan", translation: "Bread", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "French" },
      { id: "fr8", word: "Livre", phonetic: "Lee-vruh", translation: "Book", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "French" }
    ];
  }
  if (normalized === "german") {
    return [
      { id: "de1", word: "Hallo", phonetic: "Hah-loh", translation: "Hello", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "German" },
      { id: "de2", word: "Tschüss", phonetic: "Tshooss", translation: "Goodbye", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "German" },
      { id: "de3", word: "Danke", phonetic: "Dahn-kuh", translation: "Thank you", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "German" },
      { id: "de4", word: "Ja", phonetic: "Yah", translation: "Yes", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "German" },
      { id: "de5", word: "Nein", phonetic: "Nine", translation: "No", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "German" },
      { id: "de6", word: "Wasser", phonetic: "Vahs-uhr", translation: "Water", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "German" },
      { id: "de7", word: "Brot", phonetic: "Broht", translation: "Bread", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "German" },
      { id: "de8", word: "Buch", phonetic: "Bookh", translation: "Book", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "German" }
    ];
  }
  if (normalized === "arabic") {
    return [
      { id: "ar1", word: "مرحبا", phonetic: "Marhaban", translation: "Hello", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Arabic" },
      { id: "ar2", word: "مع السلامة", phonetic: "Ma'a salama", translation: "Goodbye", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Arabic" },
      { id: "ar3", word: "شكرا", phonetic: "Shukran", translation: "Thank you", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Arabic" },
      { id: "ar4", word: "نعم", phonetic: "Na'am", translation: "Yes", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Arabic" },
      { id: "ar5", word: "لا", phonetic: "La", translation: "No", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Arabic" },
      { id: "ar6", word: "ماء", phonetic: "Maa'", translation: "Water", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Arabic" },
      { id: "ar7", word: "خبز", phonetic: "Khubz", translation: "Bread", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Arabic" },
      { id: "ar8", word: "كتاب", phonetic: "Kitaab", translation: "Book", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Arabic" }
    ];
  }
  if (normalized === "japanese") {
    return [
      { id: "ja1", word: "こんにちは", phonetic: "Konnichiwa", translation: "Hello", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Japanese" },
      { id: "ja2", word: "さようなら", phonetic: "Sayounara", translation: "Goodbye", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Japanese" },
      { id: "ja3", word: "ありがとう", phonetic: "Arigatou", translation: "Thank you", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Japanese" },
      { id: "ja4", word: "はい", phonetic: "Hai", translation: "Yes", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Japanese" },
      { id: "ja5", word: "いいえ", phonetic: "Iie", translation: "No", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Japanese" },
      { id: "ja6", word: "水", phonetic: "Mizu", translation: "Water", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Japanese" },
      { id: "ja7", word: "パン", phonetic: "Pan", translation: "Bread", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Japanese" },
      { id: "ja8", word: "本", phonetic: "Hon", translation: "Book", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Japanese" }
    ];
  }
  if (normalized === "farsi" || normalized === "persian") {
    const displayLanguage = normalized === "persian" ? "Persian" : "Farsi";
    return [
      { id: "f1", word: "سلام", phonetic: "Salaam", translation: "Hello", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "f2", word: "خداحافظ", phonetic: "Khodaahaafez", translation: "Goodbye", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "f3", word: "تشکر", phonetic: "Tashakkor", translation: "Thank you", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "f4", word: "بله", phonetic: "Baleh", translation: "Yes", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "f5", word: "نخیر", phonetic: "Nakheyr", translation: "No", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "f6", word: "آب", phonetic: "Aab", translation: "Water", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "f7", word: "نان", phonetic: "Naan", translation: "Bread", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "f8", word: "کتاب", phonetic: "Ketaab", translation: "Book", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage }
    ];
  }
  if (normalized.includes("egyptian") || normalized.includes("hieroglyph")) {
    const displayLanguage = "Middle Egyptian Hieroglyphs";
    return [
      { id: "egy1", word: "𓋹𓈖𓆓𓏛", phonetic: "Ankh", translation: "Life", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "egy2", word: "𓉐𓉻", phonetic: "Per-a'a", translation: "Pharaoh", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "egy3", word: "𓇳", phonetic: "Ra", translation: "Sun / Ra", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "egy4", word: "𓅓𓂝𓏛", phonetic: "Ma'at", translation: "Truth / Order", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "egy5", word: "𓊹", phonetic: "Netjer", translation: "God / Divine", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "egy6", word: "𓈖𓏏𓏯", phonetic: "Net", translation: "Water", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "egy7", word: "𓏏𓊪𓅓", phonetic: "Tep", translation: "Head / Top", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage },
      { id: "egy8", word: "𓏠𓏎𓏛", phonetic: "Men", translation: "To remain / Endure", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: displayLanguage }
    ];
  }
  // Default to Farsi
  return [
    { id: "f1", word: "سلام", phonetic: "Salaam", translation: "Hello", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Farsi" },
    { id: "f2", word: "خداحافظ", phonetic: "Khodaahaafez", translation: "Goodbye", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Farsi" },
    { id: "f3", word: "تشکر", phonetic: "Tashakkor", translation: "Thank you", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Farsi" },
    { id: "f4", word: "بله", phonetic: "Baleh", translation: "Yes", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Farsi" },
    { id: "f5", word: "نخیر", phonetic: "Nakheyr", translation: "No", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Farsi" },
    { id: "f6", word: "آب", phonetic: "Aab", translation: "Water", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Farsi" },
    { id: "f7", word: "نان", phonetic: "Naan", translation: "Bread", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Farsi" },
    { id: "f8", word: "کتاب", phonetic: "Ketaab", translation: "Book", timesCorrect: 0, timesIncorrect: 0, nextReviewDate: new Date().toISOString().split('T')[0], language: "Farsi" }
  ];
}

// Exported dynamic getter representing the active user
export function getDatabase(): DatabaseSchema {
  const fileDb = readFileDb();
  const currentEmail = fileDb.currentUserEmail;
  
  if (!currentEmail || !fileDb.users[currentEmail]) {
    // If no active user, return a structured schema indicating null user
    return {
      user: null as any,
      vocabulary: [],
      quizResults: [],
      currentLesson: null,
      usersList: Object.values(fileDb.users).map(u => ({
        name: u.profile.name,
        email: u.profile.email,
        proficiencyLevel: u.profile.proficiencyLevel,
        targetLanguage: u.profile.targetLanguage || "Farsi"
      })),
      currentUserEmail: null
    };
  }
  
  const activeUser = fileDb.users[currentEmail];
  return {
    user: activeUser.profile,
    vocabulary: activeUser.vocabulary,
    quizResults: activeUser.quizResults,
    currentLesson: activeUser.currentLesson,
    usersList: Object.values(fileDb.users).map(u => ({
      name: u.profile.name,
      email: u.profile.email,
      proficiencyLevel: u.profile.proficiencyLevel,
      targetLanguage: u.profile.targetLanguage || "Farsi"
    })),
    currentUserEmail: currentEmail
  };
}

// Exported dynamic saver that maps the modified view back to the multi-user structure
export function saveDatabase(db: DatabaseSchema): void {
  const fileDb = readFileDb();
  const currentEmail = db.currentUserEmail || fileDb.currentUserEmail;
  
  if (currentEmail) {
    if (!fileDb.users[currentEmail]) {
      fileDb.users[currentEmail] = {
        profile: db.user,
        vocabulary: db.vocabulary,
        quizResults: db.quizResults,
        currentLesson: db.currentLesson
      };
    } else {
      fileDb.users[currentEmail].profile = db.user;
      fileDb.users[currentEmail].vocabulary = db.vocabulary;
      fileDb.users[currentEmail].quizResults = db.quizResults;
      fileDb.users[currentEmail].currentLesson = db.currentLesson;
    }
  }
  fileDb.currentUserEmail = currentEmail;
  writeFileDb(fileDb);
}

// Support User Registration
export function registerUser(name: string, email: string, level: 'Beginner' | 'Intermediate' | 'Advanced', targetLanguage: string = "Farsi"): DatabaseSchema {
  const fileDb = readFileDb();
  const cleanEmail = email.trim().toLowerCase();
  
  // Seed basic vocabulary and greetings for new user based on selected language
  const initialVocab = getDefaultVocabulary(targetLanguage).map(v => ({
    ...v,
    id: Math.random().toString(36).substring(2, 9),
    timesCorrect: 0,
    timesIncorrect: 0,
    nextReviewDate: new Date().toISOString().split('T')[0]
  }));
  
  fileDb.users[cleanEmail] = {
    profile: {
      name: name.trim(),
      email: cleanEmail,
      proficiencyLevel: level,
      targetLanguage: targetLanguage,
      xp: 0,
      streak: 0,
      completedLessons: 0
    },
    vocabulary: initialVocab,
    quizResults: [],
    currentLesson: null
  };
  fileDb.currentUserEmail = cleanEmail;
  writeFileDb(fileDb);
  return getDatabase();
}

// Support User Login / Context Switch
export function loginUser(email: string): DatabaseSchema {
  const fileDb = readFileDb();
  const cleanEmail = email.trim().toLowerCase();
  
  if (fileDb.users[cleanEmail]) {
    fileDb.currentUserEmail = cleanEmail;
    writeFileDb(fileDb);
  }
  return getDatabase();
}

// Support Logout
export function logoutUser(): DatabaseSchema {
  const fileDb = readFileDb();
  fileDb.currentUserEmail = null;
  writeFileDb(fileDb);
  return getDatabase();
}

export function updateUserProfile(updates: Partial<UserProfile>): UserProfile {
  const db = getDatabase();
  db.user = { ...db.user, ...updates };
  
  // If targetLanguage was changed, make sure they have that language's vocab seeded
  if (updates.targetLanguage) {
    const lang = updates.targetLanguage;
    const existingLangVocab = db.vocabulary.some(v => v.language === lang);
    if (!existingLangVocab) {
      const newVocab = getDefaultVocabulary(lang).map(v => ({
        ...v,
        id: Math.random().toString(36).substring(2, 9),
        timesCorrect: 0,
        timesIncorrect: 0,
        nextReviewDate: new Date().toISOString().split('T')[0]
      }));
      db.vocabulary = [...db.vocabulary, ...newVocab];
    }
  }
  
  saveDatabase(db);
  return db.user;
}

export function upsertVocabulary(word: string, translation: string, phonetic: string, isCorrect: boolean, language?: string): VocabularyItem {
  const db = getDatabase();
  const lang = language || db.user.targetLanguage || "Farsi";
  let item = db.vocabulary.find(v => (v.word === word || v.translation.toLowerCase() === translation.toLowerCase()) && (v.language === lang));
  
  const today = new Date();
  
  if (item) {
    if (isCorrect) {
      item.timesCorrect += 1;
      const daysToAdd = Math.max(1, item.timesCorrect * 2);
      today.setDate(today.getDate() + daysToAdd);
    } else {
      item.timesIncorrect += 1;
      today.setDate(today.getDate() + 1);
    }
    item.nextReviewDate = today.toISOString().split('T')[0];
  } else {
    const daysToAdd = isCorrect ? 2 : 1;
    today.setDate(today.getDate() + daysToAdd);
    item = {
      id: Math.random().toString(36).substring(2, 9),
      word,
      phonetic,
      translation,
      timesCorrect: isCorrect ? 1 : 0,
      timesIncorrect: isCorrect ? 0 : 1,
      nextReviewDate: today.toISOString().split('T')[0],
      language: lang
    };
    db.vocabulary.push(item);
  }
  
  saveDatabase(db);
  return item;
}

export function addQuizResult(score: number, feedback: string, topic: string, language?: string): QuizResult {
  const db = getDatabase();
  const lang = language || db.user.targetLanguage || "Farsi";
  const newResult: QuizResult = {
    id: 'q_' + Math.random().toString(36).substring(2, 9),
    score,
    feedback,
    date: new Date().toISOString(),
    topic,
    language: lang
  };
  
  db.quizResults.push(newResult);
  
  db.user.xp += Math.round(score * 1.5);
  db.user.completedLessons += 1;
  db.user.streak += 1;
  
  saveDatabase(db);
  return newResult;
}

export function resetDatabase(): DatabaseSchema {
  const fileDb = readFileDb();
  const currentEmail = fileDb.currentUserEmail;
  
  if (currentEmail && fileDb.users[currentEmail]) {
    const targetLanguage = fileDb.users[currentEmail].profile.targetLanguage || "Farsi";
    // Reset specific user's progress
    fileDb.users[currentEmail] = {
      profile: {
        name: fileDb.users[currentEmail].profile.name,
        email: currentEmail,
        proficiencyLevel: "Beginner",
        targetLanguage,
        xp: 0,
        streak: 0,
        completedLessons: 0
      },
      vocabulary: getDefaultVocabulary(targetLanguage).map(v => ({
        ...v,
        id: Math.random().toString(36).substring(2, 9),
        timesCorrect: 0,
        timesIncorrect: 0,
        nextReviewDate: new Date().toISOString().split('T')[0]
      })),
      quizResults: [],
      currentLesson: null
    };
    writeFileDb(fileDb);
  } else {
    // Total hard reset
    writeFileDb(DEFAULT_FILE_DB);
  }
  
  return getDatabase();
}
