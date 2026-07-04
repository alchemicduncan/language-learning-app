import { GoogleGenAI, Type } from "@google/genai";
import { getDatabase, upsertVocabulary, addQuizResult, updateUserProfile, DatabaseSchema } from "./db.js";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("GEMINI_API_KEY not defined. Falling back to dynamic rule-based mock agents.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Interfaces for our A2UI elements
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

// --- AGENT 1: THE ADAPTIVE TUTOR ---
export async function generateLesson(level: 'Beginner' | 'Intermediate' | 'Advanced', db: DatabaseSchema): Promise<LessonPayload> {
  const ai = getGeminiClient();
  const targetLanguage = db.user.targetLanguage || "Farsi";
  
  // Create review suggestions based on spacing repetition
  const reviews = db.vocabulary
    .filter(v => v.language === targetLanguage && new Date(v.nextReviewDate) <= new Date())
    .slice(0, 3)
    .map(v => `${v.word} (${v.translation})`);

  const topicSelection = getNextTopic(level, db);
  
  if (!ai) {
    return generateMockLesson(level, topicSelection, reviews);
  }

  const prompt = `
  You are an expert English-${targetLanguage} Language Tutor.
  Generate an interactive, immersive lesson tailored for a user learning ${targetLanguage} at the '${level}' level.
  Overarching Topic: ${topicSelection}.
  Words to review / include if possible: ${reviews.join(", ")}.

  You must output a single JSON object matching this TypeScript interface exactly:
  interface LessonPayload {
    topic: string; // The topic name
    level: string; // "Beginner", "Intermediate", or "Advanced"
    concept: string; // A short description of the grammar/conversational concept
    vocabulary: Array<{
      word: string; // The ${targetLanguage} word/phrase
      translation: string; // English translation
      phonetic: string; // Phonetic transliteration (e.g. "Hola", "Salaam")
    }>;
    ui: A2UIComponent[]; // Recursively rendered lesson interface components
  }

  Where A2UIComponent is:
  type A2UIComponent = {
    id: string; // unique random string (e.g., "id_123")
    type: 'Column' | 'Row' | 'Card' | 'Text' | 'TextField' | 'ChoicePicker' | 'Button' | 'AudioPlayer';
    text?: string; // used for Text (content) and Button (label)
    usageHint?: 'heading' | 'subheading' | 'body' | 'success' | 'error' | 'instruction' | 'farsi' | 'english'; // used for Text styling
    placeholder?: string; // used for TextField placeholder
    label?: string; // used for TextField/ChoicePicker label
    bindPath?: string; // key in dataModel where value is bound (e.g., "translate_word_1", "multiple_choice_1")
    options?: string[]; // used for ChoicePicker options (multiple choice answers)
    action?: string; // used for Button actions. The final submission button MUST have action="submit_quiz"
    textToPronounce?: string; // used for AudioPlayer to read a ${targetLanguage} word aloud
    children?: A2UIComponent[]; // children for layouts (Card, Column, Row)
  }

  Design Requirements for UI:
  1. Start with a Card layout container containing Heading and Subheading Text components.
  2. Provide a vocabulary section containing cards with the ${targetLanguage} words, phonetic pronunciation, and English translations. Include an AudioPlayer component with textToPronounce set to the ${targetLanguage} word for active oral listening.
  3. Formulate an interactive Quiz section:
     - At least one multiple-choice question using ChoicePicker (with bindPath e.g. "q_multiple_choice_1").
     - At least one translation or typing exercise using TextField (with bindPath e.g. "q_text_input_1").
  4. End with a Button labeled "Submit Quiz" with action="submit_quiz" so the user can submit their dataModel.
  5. The UI must be clean, balanced, and encourage learning. Use RTL-safe formatting if the target language is Farsi, Arabic, or another RTL language.

  Respond strictly with the valid JSON object. Do not wrap in markdown block backticks other than raw json.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    const text = response.text || "";
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanText) as LessonPayload;
    return result;
  } catch (error) {
    console.error("Gemini failed to generate lesson, fallback to mock:", error);
    return generateMockLesson(level, topicSelection, reviews);
  }
}

// --- AGENT 2: THE GRADER ---
export async function gradeLesson(lesson: LessonPayload, dataModel: Record<string, any>): Promise<GraderResult> {
  const ai = getGeminiClient();
  const db = getDatabase();
  const targetLanguage = db?.user?.targetLanguage || "Farsi";
  
  if (!ai) {
    return generateMockGrading(lesson, dataModel);
  }

  const prompt = `
  You are an expert ${targetLanguage} Language Grader.
  Evaluate the user's answers submitted for the following lesson:
  
  LESSON TITLE: ${lesson.topic}
  CONCEPT: ${lesson.concept}
  VOCABULARY TAUGHT: ${JSON.stringify(lesson.vocabulary)}
  
  LESSON QUESTIONS & BINDINGS:
  ${JSON.stringify(lesson.ui.filter(item => item.type === 'TextField' || item.type === 'ChoicePicker' || (item.children && item.children.length > 0)))}
  
  USER ANSWERS (dataModel):
  ${JSON.stringify(dataModel)}

  Your task:
  1. Go through each quiz binding in the lesson (e.g., fields bound to text/multiple choice keys in dataModel).
  2. Check if the user answer matches the correct translation or option. Be forgiving of minor typos, but strict on correctness.
  3. Formulate a final score from 0 to 100.
  4. Provide a constructive, encouraging overall feedback string.
  5. Provide an array of individual grades, mapping the 'bindPath' to whether they got it correct, what their answer was, what the correct answer was, and an explanation of the grammar or vocabulary point.

  Output a single JSON object matching this interface:
  interface GraderResult {
    score: number; // 0 to 100
    feedback: string; // General feedback (Markdown-safe)
    grades: Array<{
      bindPath: string; // The dataModel key evaluated
      correct: boolean;
      userAnswer: string;
      correctAnswer: string;
      explanation: string; // Explaining why or teaching the point
    }>;
  }

  Respond strictly with valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const text = response.text || "";
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanText) as GraderResult;
  } catch (error) {
    console.error("Gemini failed to grade lesson, fallback to mock:", error);
    return generateMockGrading(lesson, dataModel);
  }
}

// --- AGENT 3: CURRICULUM MANAGER ---
export function updateCurriculumProgress(lesson: LessonPayload, grader: GraderResult): any {
  // Silent agent that updates vocabulary SRS times and proficiency recommendations
  console.log("Updating curriculum progress based on quiz result...");
  const db = getDatabase();
  const targetLanguage = db.user.targetLanguage || "Farsi";
  
  // 1. Log Quiz result in DB (triggers completedLessons ++, updates user XP, increments streak)
  const result = addQuizResult(grader.score, grader.feedback, lesson.topic, targetLanguage);
  
  // 2. Loop through individual grades and update SRS vocabulary items
  grader.grades.forEach(grade => {
    // Attempt to map graded item back to vocabulary taught in lesson
    // Try to find if user answer was related to any words
    lesson.vocabulary.forEach(vocab => {
      const containsWord = grade.explanation.includes(vocab.word) || 
                          grade.explanation.toLowerCase().includes(vocab.translation.toLowerCase()) ||
                          vocab.translation.toLowerCase().includes(grade.userAnswer.toString().toLowerCase());
                          
      if (containsWord) {
        upsertVocabulary(vocab.word, vocab.translation, vocab.phonetic, grade.correct, targetLanguage);
      }
    });
  });

  // 3. Evaluate if we should recommend leveling up
  const currentDb = getDatabase();
  const results = currentDb.quizResults.filter(q => q.language === targetLanguage);
  const recentGrades = results.slice(-3); // Get last 3 quizzes for this language
  
  let levelUpMessage = "";
  if (recentGrades.length >= 3 && recentGrades.every(r => r.score >= 90)) {
    if (currentDb.user.proficiencyLevel === 'Beginner') {
      updateUserProfile({ proficiencyLevel: 'Intermediate' });
      levelUpMessage = `Congratulations! Based on your high scores, you have been promoted to Intermediate level in ${targetLanguage}!`;
    } else if (currentDb.user.proficiencyLevel === 'Intermediate') {
      updateUserProfile({ proficiencyLevel: 'Advanced' });
      levelUpMessage = `Outstanding! You have reached Advanced level in ${targetLanguage}!`;
    }
  }

  return {
    dbState: getDatabase(),
    levelUpMessage,
    quizId: result.id
  };
}

// --- HELPER UTILS FOR TOPIC SELECTION ---
function getNextTopic(level: string, db: DatabaseSchema): string {
  const targetLanguage = db.user.targetLanguage || "Farsi";
  const completedTopics = db.quizResults.filter(r => r.language === targetLanguage).map(r => r.topic);
  const topics = {
    Beginner: ["Greetings & Polite Greetings", "Counting Numbers (1-10)", "Everyday Food & Water", "Immediate Family Members", "Expressing Simple Needs"],
    Intermediate: ["Asking for Directions", "At a local Restaurant", "Telling Time & Dates", "Expressing Likes & Dislikes", "Shopping in a Bazaar"],
    Advanced: ["Idiomatic Sayings & Culture", "Complex Conversation & Grammar", "Complex Past & Future Verbs", "Debating Current Events", "Professional & Business Terms"]
  };
  
  const pool = topics[level as 'Beginner' | 'Intermediate' | 'Advanced'] || topics.Beginner;
  const uncompleted = pool.filter(t => !completedTopics.includes(t));
  
  return uncompleted.length > 0 ? uncompleted[0] : pool[Math.floor(Math.random() * pool.length)];
}

// --- MOCK FALLBACKS ---
function generateMockLesson(level: string, topic: string, reviews: string[]): LessonPayload {
  const db = getDatabase();
  const targetLanguage = db?.user?.targetLanguage || "Farsi";
  console.log("Generating high-quality mock lesson for level:", level, "topic:", topic, "language:", targetLanguage);
  
  // Set up mock content based on targetLanguage
  let vocab: Array<{ word: string; translation: string; phonetic: string }> = [
    { word: "سلام", translation: "Hello", phonetic: "Salaam" },
    { word: "خداحافظ", translation: "Goodbye", phonetic: "Khodaahaafez" }
  ];
  let q1Label = "What is the phonetic pronunciation of 'خداحافظ' (Goodbye)?";
  let q1Options = ["Salaam", "Khodaahaafez", "Sobh bekheyr", "Tashakkor"];
  let q2Label = "Translate 'Hello' (Farsi script or Phonetic):";
  let q2Placeholder = "Type 'سلام' or 'salaam'";
  
  const normalized = targetLanguage.toLowerCase();
  if (normalized === "farsi" || normalized === "persian") {
    vocab = [
      { word: "سلام", translation: "Hello", phonetic: "Salaam" },
      { word: "خداحافظ", translation: "Goodbye", phonetic: "Khodaahaafez" }
    ];
    q1Label = "What is the phonetic pronunciation of 'خداحافظ' (Goodbye)?";
    q1Options = ["Salaam", "Khodaahaafez", "Sobh bekheyr", "Tashakkor"];
    q2Label = "Translate 'Hello' (Farsi script or Phonetic):";
    q2Placeholder = "Type 'سلام' or 'salaam'";
  } else if (normalized === "spanish") {
    vocab = [
      { word: "Hola", translation: "Hello", phonetic: "Oh-lah" },
      { word: "Adiós", translation: "Goodbye", phonetic: "Ah-dee-ohs" }
    ];
    q1Label = "What is the phonetic pronunciation of 'Adiós' (Goodbye)?";
    q1Options = ["Oh-lah", "Ah-dee-ohs", "Gracias", "Sí"];
    q2Label = "Translate 'Hello' to Spanish:";
    q2Placeholder = "Type 'hola'";
  } else if (normalized === "french") {
    vocab = [
      { word: "Bonjour", translation: "Hello", phonetic: "Bon-zhoor" },
      { word: "Au revoir", translation: "Goodbye", phonetic: "Oh-ruh-vwar" }
    ];
    q1Label = "What is the phonetic pronunciation of 'Au revoir' (Goodbye)?";
    q1Options = ["Bonjour", "Au revoir", "Merci", "Oui"];
    q2Label = "Translate 'Hello' to French:";
    q2Placeholder = "Type 'bonjour'";
  } else if (normalized === "german") {
    vocab = [
      { word: "Hallo", translation: "Hello", phonetic: "Hah-loh" },
      { word: "Tschüss", translation: "Goodbye", phonetic: "Tshooss" }
    ];
    q1Label = "What is the phonetic pronunciation of 'Tschüss' (Goodbye)?";
    q1Options = ["Hallo", "Tschüss", "Danke", "Ja"];
    q2Label = "Translate 'Hello' to German:";
    q2Placeholder = "Type 'hallo'";
  } else if (normalized === "arabic") {
    vocab = [
      { word: "مرحبا", translation: "Hello", phonetic: "Marhaban" },
      { word: "مع السلامة", translation: "Goodbye", phonetic: "Ma'a salama" }
    ];
    q1Label = "What is the phonetic pronunciation of 'مع السلامة' (Goodbye)?";
    q1Options = ["Marhaban", "Ma'a salama", "Shukran", "Na'am"];
    q2Label = "Translate 'Hello' to Arabic:";
    q2Placeholder = "Type 'مرحبا' or 'marhaban'";
  } else if (normalized === "japanese") {
    vocab = [
      { word: "こんにちは", translation: "Hello", phonetic: "Konnichiwa" },
      { word: "さようなら", translation: "Goodbye", phonetic: "Sayounara" }
    ];
    q1Label = "What is the phonetic pronunciation of 'さようなら' (Goodbye)?";
    q1Options = ["Konnichiwa", "Sayounara", "Arigatou", "Hai"];
    q2Label = "Translate 'Hello' to Japanese:";
    q2Placeholder = "Type 'こんにちは' or 'konnichiwa'";
  } else if (normalized.includes("egyptian") || normalized.includes("hieroglyph")) {
    vocab = [
      { word: "𓋹𓈖𓆓𓏛", translation: "Life (Ankh)", phonetic: "Ankh" },
      { word: "𓉐𓉻", translation: "Pharaoh (Per-a'a)", phonetic: "Per-a'a" }
    ];
    q1Label = "What is the phonetic pronunciation of the Pharaoh Hieroglyph '𓉐𓉻' (Per-a'a)?";
    q1Options = ["Ankh", "Per-a'a", "Ra", "Netjer"];
    q2Label = "Translate the Hieroglyphic '𓋹𓈖𓆓𓏛' (type the English meaning or phonetic):";
    q2Placeholder = "Type 'Life' or 'ankh'";
  }

  const payload: LessonPayload = {
    topic: topic,
    level: level,
    concept: `Introductory lesson on ${targetLanguage} ${topic}.`,
    vocabulary: vocab,
    ui: [
      {
        id: "container",
        type: "Card",
        children: [
          { id: "title", type: "Text", text: `Lesson: ${topic}`, usageHint: "heading" },
          { id: "desc", type: "Text", text: `Welcome to this dynamically tailored lesson exploring ${targetLanguage} vocabulary for '${topic}'.`, usageHint: "body" },
          {
            id: "v1_card",
            type: "Card",
            children: [
              { id: "v1_farsi", type: "Text", text: vocab[0].word, usageHint: (normalized === "farsi" || normalized === "persian") ? "farsi" : "english" },
              { id: "v1_ap", type: "AudioPlayer", textToPronounce: vocab[0].word },
              { id: "v1_phon", type: "Text", text: `Phonetic: ${vocab[0].phonetic}`, usageHint: "subheading" },
              { id: "v1_mean", type: "Text", text: `Meaning: ${vocab[0].translation}`, usageHint: "body" }
            ]
          },
          {
            id: "v2_card",
            type: "Card",
            children: [
              { id: "v2_farsi", type: "Text", text: vocab[1].word, usageHint: (normalized === "farsi" || normalized === "persian") ? "farsi" : "english" },
              { id: "v2_ap", type: "AudioPlayer", textToPronounce: vocab[1].word },
              { id: "v2_phon", type: "Text", text: `Phonetic: ${vocab[1].phonetic}`, usageHint: "subheading" },
              { id: "v2_mean", type: "Text", text: `Meaning: ${vocab[1].translation}`, usageHint: "body" }
            ]
          },
          { id: "q_head", type: "Text", text: "Practice Exercises", usageHint: "heading" },
          {
            id: "q1",
            type: "ChoicePicker",
            label: q1Label,
            bindPath: "q_multiple_choice_1",
            options: q1Options
          },
          {
            id: "q2",
            type: "TextField",
            label: q2Label,
            placeholder: q2Placeholder,
            bindPath: "q_text_input_1"
          },
          {
            id: "submit_btn",
            type: "Button",
            text: "Submit Topic Quiz",
            action: "submit_quiz"
          }
        ]
      }
    ]
  };

  return payload;
}

function generateMockGrading(lesson: LessonPayload, dataModel: Record<string, any>): GraderResult {
  console.log("Generating automated mock grading for dataModel:", dataModel);
  const grades: GraderResult['grades'] = [];
  let correctCount = 0;
  const totalCount = 2;

  // Grab the correct answers from the vocab generated
  const correctOpt1 = lesson.vocabulary[1]?.phonetic || "";
  const correctTxt2 = lesson.vocabulary[0]?.word || "";
  const correctTxt2Phon = lesson.vocabulary[0]?.phonetic || "";

  // Evaluates ChoicePicker q_multiple_choice_1
  const q1Ans = dataModel["q_multiple_choice_1"] || dataModel["q_goodbye_pronunciation"] || dataModel["q_num_three"] || "";
  const q1Correct = q1Ans.toString().toLowerCase() === correctOpt1.toLowerCase();
  if (q1Correct) correctCount++;
  grades.push({
    bindPath: "q_multiple_choice_1",
    correct: q1Correct,
    userAnswer: q1Ans || "None",
    correctAnswer: correctOpt1,
    explanation: q1Correct 
      ? `Excellent job! '${correctOpt1}' is correct.` 
      : `The correct option is '${correctOpt1}'.`
  });

  // Evaluates TextField q_text_input_1
  const q2Ans = (dataModel["q_text_input_1"] || dataModel["q_hello_translation"] || dataModel["q_num_one"] || "").toString().trim().toLowerCase();
  const q2Correct = q2Ans === correctTxt2.toLowerCase() || q2Ans === correctTxt2Phon.toLowerCase();
  if (q2Correct) correctCount++;
  grades.push({
    bindPath: "q_text_input_1",
    correct: q2Correct,
    userAnswer: q2Ans || "None",
    correctAnswer: `${correctTxt2} (${correctTxt2Phon})`,
    explanation: q2Correct 
      ? `Correct! You successfully matched it to '${correctTxt2}'.` 
      : `Not quite. The correct answer is '${correctTxt2}' (pronounced '${correctTxt2Phon}').`
  });

  const score = Math.round((correctCount / totalCount) * 100);
  let feedback = "";
  if (score === 100) {
    feedback = "Perfect Score! 🌟 Outstanding mastery. Your language skill is progressing beautifully!";
  } else if (score >= 50) {
    feedback = "Good Effort! 👍 You got some of the concepts. Review the vocabulary cards and try again.";
  } else {
    feedback = "Keep Practicing! 📚 Learning a new language takes time. Use the audio player to train your ear.";
  }

  return {
    score,
    feedback,
    grades
  };
}
