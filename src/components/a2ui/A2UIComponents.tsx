import React, { useState } from 'react';
import { Volume2, VolumeX, CheckCircle2, XCircle, AlertCircle, Play, Sparkles } from 'lucide-react';
import { A2UIComponent } from '../../types.js';
import { useApp } from '../../lib/state.js';

// Helper to play raw 16-bit PCM little-endian audio at 24000 Hz
function playPcmBase64(base64Str: string) {
  try {
    const binaryString = window.atob(base64Str);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const numSamples = len / 2;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = audioContext.createBuffer(1, numSamples, 24000);
    const channelData = buffer.getChannelData(0);
    
    const dataView = new DataView(bytes.buffer);
    for (let i = 0; i < numSamples; i++) {
      // 16-bit signed little-endian PCM
      const sample = dataView.getInt16(i * 2, true);
      channelData[i] = sample / 32768.0; // normalize
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    console.error("Error playing PCM audio:", error);
  }
}

// 1. TYPOGRAPHY TEXT COMPONENT
export function A2UIText({ text, usageHint }: { text: string; usageHint?: A2UIComponent['usageHint'] }) {
  const isFarsi = usageHint === 'farsi' || (/[\u0600-\u06FF]/.test(text));
  const dir = isFarsi ? 'rtl' : 'ltr';

  let classes = "text-slate-600 text-sm md:text-base leading-relaxed";

  switch (usageHint) {
    case 'heading':
      classes = "text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 font-sans mb-2 mt-4 block border-b border-slate-100 pb-2";
      break;
    case 'subheading':
      classes = "text-base md:text-lg font-bold text-slate-700 tracking-wide mt-2 block";
      break;
    case 'body':
      classes = "text-slate-600 text-sm md:text-base leading-relaxed mb-1";
      break;
    case 'instruction':
      classes = "text-slate-400 text-xs md:text-sm italic font-medium bg-slate-50 border-l-2 border-slate-300 px-3 py-1.5 rounded-r-lg my-1 block";
      break;
    case 'success':
      classes = "text-emerald-800 bg-emerald-50/80 border border-emerald-100 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5 my-2 shadow-sm font-medium";
      break;
    case 'error':
      classes = "text-rose-800 bg-rose-50/80 border border-rose-100 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5 my-2 shadow-sm font-medium";
      break;
    case 'farsi':
      classes = "font-sans text-3xl md:text-4xl font-semibold text-indigo-700 tracking-wide text-center leading-loose py-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 shadow-inner block";
      break;
    case 'english':
      classes = "text-slate-800 text-base font-semibold border-b-2 border-dashed border-indigo-100 pb-1 w-max block";
      break;
  }

  return (
    <span dir={dir} className={`${classes} transition-all duration-300`}>
      {usageHint === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
      {usageHint === 'error' && <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
      {text}
    </span>
  );
}

// 2. TEXT INPUT FIELD COMPONENT
export function A2UITextField({ label, placeholder, bindPath }: { label?: string; placeholder?: string; bindPath?: string }) {
  const { dataModel, updateDataModel, graderResult } = useApp();
  const value = bindPath ? (dataModel[bindPath] || "") : "";
  
  // Check if we have grader feedback for this field
  const fieldGrade = graderResult?.grades.find(g => g.bindPath === bindPath);
  const isEvaluated = !!fieldGrade;
  const isCorrect = fieldGrade?.correct ?? false;

  return (
    <div className="flex flex-col gap-1.5 w-full my-3">
      {label && (
        <label className="text-xs md:text-sm font-bold text-slate-700 select-none flex items-center gap-1.5">
          {label}
          {isEvaluated && (
            isCorrect ? (
              <span className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
              </span>
            ) : (
              <span className="text-rose-600 text-xs font-semibold flex items-center gap-0.5">
                <XCircle className="w-3.5 h-3.5" /> Incorrect
              </span>
            )
          )}
        </label>
      )}
      
      <div className="relative">
        <input
          id={`input_${bindPath}`}
          type="text"
          value={value}
          disabled={isEvaluated}
          onChange={(e) => bindPath && updateDataModel(bindPath, e.target.value)}
          placeholder={placeholder || "Type your answer..."}
          className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all duration-200 outline-none
            ${isEvaluated 
              ? (isCorrect 
                ? "bg-emerald-50/50 border-emerald-300 text-emerald-900 font-semibold" 
                : "bg-rose-50/50 border-rose-300 text-rose-950") 
              : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            }`}
        />
      </div>

      {isEvaluated && fieldGrade && (
        <div className={`mt-1.5 p-3 rounded-xl border text-xs leading-relaxed transition-all duration-300 shadow-inner
          ${isCorrect 
            ? "bg-emerald-50/40 border-emerald-100 text-emerald-800" 
            : "bg-rose-50/40 border-rose-100 text-rose-800"
          }`}
        >
          {!isCorrect && (
            <div className="mb-1 font-bold">
              Correct Answer: <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs select-all">{fieldGrade.correctAnswer}</span>
            </div>
          )}
          <p className="font-medium text-slate-600">{fieldGrade.explanation}</p>
        </div>
      )}
    </div>
  );
}

// 3. MULTIPLE CHOICE SELECTION COMPONENT
export function A2UIChoicePicker({ label, options, bindPath }: { label?: string; options?: string[]; bindPath?: string }) {
  const { dataModel, updateDataModel, graderResult } = useApp();
  const selectedValue = bindPath ? dataModel[bindPath] : null;

  const fieldGrade = graderResult?.grades.find(g => g.bindPath === bindPath);
  const isEvaluated = !!fieldGrade;
  const isCorrect = fieldGrade?.correct ?? false;

  return (
    <div className="flex flex-col gap-2 w-full my-3">
      {label && (
        <label className="text-xs md:text-sm font-bold text-slate-700 flex items-center gap-1.5 select-none">
          {label}
          {isEvaluated && (
            isCorrect ? (
              <span className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
              </span>
            ) : (
              <span className="text-rose-600 text-xs font-semibold flex items-center gap-0.5">
                <XCircle className="w-3.5 h-3.5" /> Incorrect
              </span>
            )
          )}
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {options?.map((opt) => {
          const isSelected = selectedValue === opt;
          
          let buttonClass = "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white text-slate-700";
          
          if (isEvaluated) {
            if (isSelected) {
              buttonClass = isCorrect 
                ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-sm" 
                : "border-rose-500 bg-rose-50 text-rose-950 font-bold shadow-sm";
            } else if (opt === fieldGrade.correctAnswer) {
              buttonClass = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold";
            } else {
              buttonClass = "opacity-40 border-slate-100 bg-slate-50 text-slate-400";
            }
          } else if (isSelected) {
            buttonClass = "border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold shadow-sm ring-2 ring-indigo-100";
          }

          return (
            <button
              id={`choice_${bindPath}_${opt.replace(/\s+/g, '_')}`}
              key={opt}
              type="button"
              disabled={isEvaluated}
              onClick={() => bindPath && updateDataModel(bindPath, opt)}
              className={`${buttonClass} border p-3.5 rounded-xl text-sm transition-all duration-200 text-left outline-none cursor-pointer flex items-center justify-between`}
            >
              <span className="truncate">{opt}</span>
              {isSelected && (
                isEvaluated ? (
                  isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                )
              )}
            </button>
          );
        })}
      </div>

      {isEvaluated && fieldGrade && (
        <div className={`mt-1 p-3 rounded-xl border text-xs leading-relaxed transition-all duration-300 shadow-inner
          ${isCorrect 
            ? "bg-emerald-50/40 border-emerald-100 text-emerald-800" 
            : "bg-rose-50/40 border-rose-100 text-rose-800"
          }`}
        >
          <p className="font-medium text-slate-600">{fieldGrade.explanation}</p>
        </div>
      )}
    </div>
  );
}

// 4. ACTION TRIGGER BUTTON COMPONENT
export function A2UIButton({ text, action }: { text?: string; action?: string }) {
  const { submitQuiz, isSubmitting, graderResult } = useApp();

  const isFinalSubmit = action === "submit_quiz";
  const label = text || (isFinalSubmit ? "Submit Assessment" : "Continue");

  if (isFinalSubmit && graderResult) {
    // Hide or disable submit if we already have grades
    return null;
  }

  const handleClick = () => {
    if (isFinalSubmit) {
      submitQuiz();
    }
  };

  return (
    <button
      id={`btn_action_${action || 'submit'}`}
      type="button"
      disabled={isSubmitting}
      onClick={handleClick}
      className={`mt-4 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] transition-all duration-200 outline-none flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isSubmitting ? (
        <>
          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          <span>Grader AI Evaluating Answers...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-4.5 h-4.5 text-indigo-200" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

// 5. AUDIO PLAYER PRONUNCIATION COMPONENT
export function A2UIAudioPlayer({ textToPronounce }: { textToPronounce?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePlay = async () => {
    if (!textToPronounce || isPlaying || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pronounce?text=${encodeURIComponent(textToPronounce)}`);
      const data = await res.json();
      
      if (data.audio) {
        setIsPlaying(true);
        playPcmBase64(data.audio);
        // Approximately 1-2 seconds of playing simulation
        setTimeout(() => setIsPlaying(false), 2000);
      } else {
        // FALLBACK: Browser native text to speech
        setIsPlaying(true);
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(textToPronounce);
        utterance.lang = 'fa-IR'; // Persian language code
        
        // Try to find a native Persian voice
        const voices = synth.getVoices();
        const farsiVoice = voices.find(v => v.lang.startsWith('fa') || v.lang.startsWith('fa-IR'));
        if (farsiVoice) utterance.voice = farsiVoice;
        
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        synth.speak(utterance);
      }
    } catch (err) {
      setIsPlaying(false);
      console.error("Audio playback error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      id={`audio_${textToPronounce}`}
      type="button"
      onClick={handlePlay}
      disabled={loading}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 select-none transition-all duration-200 border cursor-pointer outline-none active:scale-95
        ${isPlaying 
          ? "bg-indigo-600 border-indigo-600 text-white animate-pulse" 
          : "bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100"
        }`}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 rounded-full border border-indigo-300 border-t-indigo-700 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="w-3.5 h-3.5 animate-bounce" />
      ) : (
        <Volume2 className="w-3.5 h-3.5" />
      )}
      <span>{isPlaying ? "Speaking..." : loading ? "Loading..." : "Listen Pronunciation"}</span>
    </button>
  );
}
