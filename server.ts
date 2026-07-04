import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { getDatabase, resetDatabase, updateUserProfile, saveDatabase, registerUser, loginUser, logoutUser, upsertVocabulary } from "./server/db.js";
import { generateLesson, gradeLesson, updateCurriculumProgress } from "./server/agents.js";
import { GoogleGenAI, Modality } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTE: GET USER DB PROGRESS & STATS ---
  app.get("/api/db/progress", (req, res) => {
    try {
      const db = getDatabase();
      res.json(db);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read database progress: " + err.message });
    }
  });

  // --- API ROUTE: RESET DATABASE ---
  app.post("/api/db/reset", (req, res) => {
    try {
      const db = resetDatabase();
      res.json({ message: "Database successfully reset to defaults", db });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to reset database: " + err.message });
    }
  });

  // --- API ROUTE: MANUALLY UPDATE USER PROFILE ---
  app.post("/api/db/profile", (req, res) => {
    try {
      const { name, proficiencyLevel, targetLanguage } = req.body;
      const updated = updateUserProfile({ name, proficiencyLevel, targetLanguage });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update profile: " + err.message });
    }
  });

  // --- API ROUTE: REGISTER NEW USER ---
  app.post("/api/db/register", (req, res) => {
    try {
      const { name, email, proficiencyLevel, targetLanguage } = req.body;
      if (!name || !email || !proficiencyLevel) {
        return res.status(400).json({ error: "Name, email, and starting level are required." });
      }
      const db = registerUser(name, email, proficiencyLevel, targetLanguage || "Farsi");
      res.json(db);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to register: " + err.message });
    }
  });

  // --- API ROUTE: USER LOGIN / SWITCH ACCOUNT ---
  app.post("/api/db/login", (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required to login." });
      }
      const db = loginUser(email);
      res.json(db);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to login: " + err.message });
    }
  });

  // --- API ROUTE: LOGOUT USER SESSION ---
  app.post("/api/db/logout", (req, res) => {
    try {
      const db = logoutUser();
      res.json(db);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to logout: " + err.message });
    }
  });

  // --- API ROUTES: GOOGLE SIGN-IN OAUTH ---
  app.get("/api/auth/google/url", (req, res) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return res.status(400).json({ 
          error: "Google Sign-In is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as secrets in your AI Studio Settings first." 
        });
      }

      const clientRedirectUri = req.query.redirect_uri as string;
      if (!clientRedirectUri) {
        return res.status(400).json({ error: "redirect_uri query parameter is required" });
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: clientId,
        redirect_uri: clientRedirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "online",
        prompt: "select_account"
      }).toString();

      res.json({ url: authUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get(["/api/auth/google/callback", "/api/auth/google/callback/"], async (req, res) => {
    const { code, error: queryError } = req.query;

    if (queryError) {
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_FAILURE', error: '${queryError}' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication failed: ${queryError}</p>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send("No authorization code provided by Google.");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).send("Google OAuth Client ID or Client Secret is missing in server environment.");
    }

    try {
      // Reconstruct the redirect_uri used originally
      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

      console.log("Exchanging auth code with Google using redirect_uri:", redirectUri);

      // Exchange authorization code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errBody = await tokenResponse.text();
        throw new Error(`Failed to exchange code for tokens: ${errBody}`);
      }

      const tokenData = await tokenResponse.json() as any;
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        throw new Error("No access_token returned by Google.");
      }

      // Fetch user info from Google API
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResponse.ok) {
        const errBody = await userResponse.text();
        throw new Error(`Failed to fetch userinfo from Google: ${errBody}`);
      }

      const userInfo = await userResponse.json() as any;
      const email = userInfo.email;
      const name = userInfo.name || email.split("@")[0];

      if (!email) {
        throw new Error("No email address returned in Google user profile.");
      }

      // Authenticate or Register user in local database
      const db = getDatabase();
      const existingUser = db.usersList.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (existingUser) {
        console.log(`Logging in existing user: ${email} via Google Sign-In`);
        loginUser(email);
      } else {
        console.log(`Registering brand new user: ${email} via Google Sign-In`);
        const defaultLevel = "Beginner";
        const defaultLang = "Persian";
        registerUser(name, email, defaultLevel, defaultLang);
      }

      // Respond with success HTML message and close popup
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', email: '${email}' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);

    } catch (err: any) {
      console.error("Google authentication error:", err);
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_FAILURE', error: '${encodeURIComponent(err.message)}' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication failed: ${err.message}</p>
          </body>
        </html>
      `);
    }
  });

  // --- API ROUTE: VOCABULARY SRS REVIEW ---
  app.post("/api/db/review", (req, res) => {
    try {
      const { word, isCorrect } = req.body;
      if (!word) {
        return res.status(400).json({ error: "Word is required for review evaluation." });
      }
      const db = getDatabase();
      const targetLanguage = db.user.targetLanguage || "Farsi";
      const item = db.vocabulary.find(v => v.word === word && v.language === targetLanguage);
      if (item) {
        upsertVocabulary(item.word, item.translation, item.phonetic, isCorrect, targetLanguage);
        // Award XP for reviewing!
        if (isCorrect) {
          db.user.xp += 10;
        } else {
          db.user.xp += 2; // consolation XP for trying!
        }
        saveDatabase(db);
      }
      res.json(getDatabase());
    } catch (err: any) {
      res.status(500).json({ error: "Failed to process word review: " + err.message });
    }
  });

  // --- API ROUTE: PROMPT GEMINI FOR REAL FARSI PRONUNCIATION TTS ---
  app.get("/api/pronounce", async (req, res) => {
    const text = req.query.text as string;
    if (!text) {
      return res.status(400).json({ error: "Text query parameter is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("No GEMINI_API_KEY detected for pronunciation. Falling back to native SpeechSynthesis.");
      return res.json({ audio: null });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      console.log(`Generating native TTS for Farsi word: '${text}' using gemini-3.1-flash-tts-preview...`);
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Say clearly in a native, precise Persian accent: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is an excellent voice for speech
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({ audio: base64Audio });
      } else {
        return res.json({ audio: null });
      }
    } catch (err: any) {
      console.error("Pronunciation TTS failed:", err);
      return res.status(500).json({ error: err.message, audio: null });
    }
  });

  // --- API ROUTE: THE ADAPTIVE TUTOR ENGINE ---
  app.post("/api/agents/orchestrator", async (req, res) => {
    const { action, dataModel } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: "An action string is required for curriculum engine" });
    }

    const db = getDatabase();

    try {
      console.log(`Curriculum engine received action: '${action}'`);

      if (action === "get_next_lesson") {
        // Trigger adaptive tutor to create dynamic lesson
        const level = db.user.proficiencyLevel || "Beginner";
        const lesson = await generateLesson(level, db);
        
        // Save lesson in DB as current lesson
        db.currentLesson = lesson;
        saveDatabase(db);

        return res.json({
          success: true,
          lesson,
          dbState: db
        });
      } 
      
      if (action === "submit_quiz") {
        // Verify active lesson exists
        if (!db.currentLesson) {
          return res.status(400).json({ 
            error: "No active lesson session found. Please request a new lesson first." 
          });
        }

        const activeLesson = db.currentLesson;

        // Trigger Grader to evaluate answers
        console.log("Evaluating quiz answers via Tutor Grader...");
        const graderResult = await gradeLesson(activeLesson, dataModel || {});

        // Trigger Curriculum Manager to record progress, update vocabulary SRS, adjust levels
        console.log("Updating curriculum progress logs...");
        const updateResult = updateCurriculumProgress(activeLesson, graderResult);

        // Reset current active lesson
        const finalDb = getDatabase();
        finalDb.currentLesson = null;
        saveDatabase(finalDb);

        return res.json({
          success: true,
          grader: graderResult,
          levelUpMessage: updateResult.levelUpMessage,
          dbState: updateResult.dbState
        });
      }

      return res.status(400).json({ error: `Unsupported curriculum action: '${action}'` });
    } catch (err: any) {
      console.error("Curriculum engine error:", err);
      res.status(500).json({ error: "Curriculum engine encountered error: " + err.message });
    }
  });

  // --- VITE MIDDLEWARE OR STATIC ASSETS ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Development server integrated with Vite middleware.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Production static server configured serving from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`===================================================`);
    console.log(` Server actively running on http://localhost:${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`===================================================`);
  });
}

startServer();
