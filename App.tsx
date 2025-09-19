import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { VOCABULARY, SENTENCE_QUESTIONS } from './constants';
import { ResultState, QuizMode, AppMode } from './types';
import type { VocabWord, SentenceQuestion } from './types';

// FIX: Add types for the Web Speech API to fix TypeScript errors.
// These APIs are not part of the standard DOM typings.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof webkitSpeechRecognition;
  }
}


// Helper function to shuffle array
const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

// Helper function to get random quiz mode for WordQuiz
const getRandomQuizMode = (): QuizMode => {
    return Math.random() < 0.5 ? QuizMode.PRESENT_TO_PAST : QuizMode.PAST_TO_PRESENT;
};

// Pronunciation checker utility
const compareAndHighlight = (correctAnswer: string, userTranscript: string): { score: number; diff: React.ReactNode } => {
  const normalize = (text: string) => text.toLowerCase().replace(/[.,?]/g, '').trim();

  const normalizedCorrect = normalize(correctAnswer);
  const normalizedUser = normalize(userTranscript);

  if (!normalizedUser) {
    return { score: 0, diff: <p className="text-slate-500">아무 말도 감지되지 않았어요.</p> };
  }

  const correctWords = normalizedCorrect.split(/\s+/);
  const userWords = normalizedUser.split(/\s+/);

  let correctCount = 0;
  const diffElements = userWords.map((userWord, index) => {
    if (index < correctWords.length && userWord === correctWords[index]) {
      correctCount++;
      return <span key={index}>{userWord} </span>;
    } else {
      return <span key={index} className="text-red-500 font-semibold underline decoration-wavy">{userWord} </span>;
    }
  });

  const score = Math.round((correctCount / correctWords.length) * 100);
  
  return { score, diff: <div className="p-2 bg-slate-100 rounded-md">{diffElements}</div> };
};


// --- ICONS ---
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// FIX: Update CrossIcon component to accept a className prop to allow styling from call site.
const CrossIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const StopIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z" />
    </svg>
);

const SpinnerIcon = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// --- START SCREEN COMPONENT ---
const StartScreen: React.FC<{ onSelectMode: (mode: AppMode) => void }> = ({ onSelectMode }) => {
  return (
    <div className="w-full max-w-xl mx-auto text-center">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-2">English Practice</h1>
        <p className="text-slate-600 mt-2 mb-8">Choose an activity to start.</p>
        <div className="space-y-4">
          <button
            onClick={() => onSelectMode(AppMode.WORD_QUIZ)}
            className="w-full py-4 px-6 bg-indigo-600 text-white font-bold text-xl rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105"
          >
            단어 익히기 (Learn Words)
          </button>
          <button
            onClick={() => onSelectMode(AppMode.SENTENCE_QUIZ)}
            className="w-full py-4 px-6 bg-teal-600 text-white font-bold text-xl rounded-lg shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-transform transform hover:scale-105"
          >
            문장 만들기 (Make Sentences)
          </button>
        </div>
      </div>
    </div>
  );
};


// --- WORD QUIZ COMPONENT ---
const WordQuiz: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState<ResultState>(ResultState.IDLE);
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [quizMode, setQuizMode] = useState<QuizMode>(getRandomQuizMode());
  
  // Pronunciation practice state
  const [isPracticing, setIsPracticing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [pronunciationResult, setPronunciationResult] = useState<{ score: number; diff: React.ReactNode; transcript: string } | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setWords(shuffleArray(VOCABULARY));
    setQuizMode(getRandomQuizMode());
  }, []);
  
  useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (recognitionRef.current) recognitionRef.current.abort();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
    };
  }, [audioURL]);

  const currentWord = useMemo(() => words[currentIndex], [words, currentIndex]);

  const generateHint = useCallback((word: string) => {
    const length = word.length;
    if (length <= 2) return `${word[0]} _`;
    if (length === 3) return `${word[0]} _ ${word[2]}`;
    return `${word[0]} ${'_ '.repeat(length - 2)}${word[length-1]}`;
  }, []);

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const toSpeak = text.split(' / ');
      toSpeak.forEach(wordPart => {
          const utterance = new SpeechSynthesisUtterance(wordPart.trim());
          utterance.lang = 'en-US';
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
      });
    }
  };
  
  const resetPracticeState = () => {
    setIsPracticing(false);
    setIsProcessing(false);
    setAudioURL(null);
    setPronunciationResult(null);
    setPracticeError(null);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
        recognitionRef.current.abort();
    }
  };
  
  const handleStartPractice = (correctAnswer: string) => {
    resetPracticeState();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPracticeError("음성 인식이 지원되지 않는 브라우저입니다.");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPracticeError("녹음 기능이 지원되지 않는 브라우저입니다.");
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Start MediaRecorder for playback
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            setAudioURL(URL.createObjectURL(audioBlob));
            stream.getTracks().forEach(track => track.stop()); // Stop mic access after recording
        };
        mediaRecorderRef.current.start();
        
        // Start SpeechRecognition
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.interimResults = false;
        recognitionRef.current.continuous = false;

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          const result = compareAndHighlight(correctAnswer, transcript);
          setPronunciationResult({ ...result, transcript });
        };
        recognitionRef.current.onerror = (event) => {
          if (event.error === 'no-speech') {
              setPracticeError("음성이 감지되지 않았습니다. 다시 시도해주세요.");
          } else {
              setPracticeError(`음성 인식 오류: ${event.error}`);
          }
        };
        recognitionRef.current.onend = () => {
          setIsProcessing(false);
          setIsPracticing(false);
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        };
        
        recognitionRef.current.start();
        setIsPracticing(true);

      })
      .catch(err => {
        console.error("Mic access error:", err);
        setPracticeError("마이크에 접근할 수 없습니다. 권한을 확인해주세요.");
      });
  };

  const handleStopPractice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
    setIsPracticing(false);
    setIsProcessing(true);
  };
    
  const handleCheckAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    const correctAnswer = quizMode === QuizMode.PRESENT_TO_PAST ? currentWord.past : currentWord.present;
    const isCorrect = correctAnswer.toLowerCase().split(' / ').includes(userInput.trim().toLowerCase());
    setResult(isCorrect ? ResultState.CORRECT : ResultState.INCORRECT);
    setShowHint(false);
  };

  const handleNextWord = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
    setUserInput('');
    setResult(ResultState.IDLE);
    setShowHint(false);
    setQuizMode(getRandomQuizMode());
    resetPracticeState();
  };
  
  const handleRestart = () => {
    setWords(shuffleArray(VOCABULARY));
    setCurrentIndex(0);
    setUserInput('');
    setResult(ResultState.IDLE);
    setShowHint(false);
    setIsFinished(false);
    setQuizMode(getRandomQuizMode());
    resetPracticeState();
  }

  if (words.length === 0 || !currentWord) return <div className="text-xl">Loading...</div>;

  if (isFinished) {
    return (
       <div className="text-center p-10 rounded-2xl shadow-2xl bg-white">
            <h1 className="text-5xl font-bold mb-4">Congratulations!</h1>
            <p className="text-2xl mb-8">You have completed all the words.</p>
            <button onClick={handleRestart} className="px-8 py-4 bg-yellow-400 text-indigo-800 font-bold rounded-xl shadow-lg hover:bg-yellow-300">Start Over</button>
        </div>
    );
  }
  
  const isPresentToPast = quizMode === QuizMode.PRESENT_TO_PAST;
  const questionWord = isPresentToPast ? currentWord.present : currentWord.past;
  const answerWord = isPresentToPast ? currentWord.past : currentWord.present;

  return (
    <div className="w-full max-w-xl mx-auto">
      <header className="text-center mb-8 relative">
        <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-200" aria-label="Back"><BackArrowIcon/></button>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800">Vocabulary Quiz</h1>
      </header>
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2 text-slate-600"><span>Progress</span><span>Word {currentIndex + 1} / {words.length}</span></div>
          <div className="w-full bg-slate-200 rounded-full h-4"><div className="bg-indigo-500 h-4 rounded-full" style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}></div></div>
        </div>
        <div className="text-center">
          <p className="text-lg text-slate-500 mb-2">{isPresentToPast ? 'Present (현재형)' : 'Past (과거형)'}</p>
          <div className="bg-slate-100 rounded-lg p-4 mb-4"><p className="text-5xl font-bold text-indigo-700">{questionWord}</p><p className="text-2xl text-slate-600 mt-1">{currentWord.korean}</p></div>
          <p className="text-lg text-slate-500 mb-2">{isPresentToPast ? 'Past (과거형)' : 'Present (현재형)'}</p>
          <form onSubmit={handleCheckAnswer}>
            <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type the answer..." disabled={result === ResultState.CORRECT} className="w-full p-4 text-2xl text-center border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" autoFocus />
            {result !== ResultState.CORRECT && <button type="submit" className="w-full mt-4 py-4 bg-indigo-600 text-white font-bold text-xl rounded-lg shadow-md hover:bg-indigo-700">Check Answer</button>}
          </form>
          <div className="mt-6 min-h-[150px]">
            {result === ResultState.CORRECT && (
              <div className="text-green-600 bg-green-100 p-4 rounded-lg space-y-4">
                <div className="flex items-center justify-center"><CheckIcon /><p className="font-bold text-2xl ml-2">Correct!</p></div>
                <div className="text-left text-slate-800 space-y-2">
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg"><p><span className="text-sm text-slate-500">현재형:</span> <strong className="text-2xl">{currentWord.present}</strong></p><button onClick={() => handleSpeak(currentWord.present)} className="p-2 rounded-full hover:bg-slate-200"><SpeakerIcon /></button></div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg"><p><span className="text-sm text-slate-500">과거형:</span> <strong className="text-2xl">{currentWord.past}</strong></p><button onClick={() => handleSpeak(currentWord.past)} className="p-2 rounded-full hover:bg-slate-200"><SpeakerIcon /></button></div>
                </div>
                <div className="w-full pt-4 border-t-2 border-green-200 space-y-3">
                  <h3 className="text-lg font-bold text-slate-700">발음 정확도 확인하기</h3>
                  {practiceError && <p className="text-red-500 text-sm">{practiceError}</p>}
                  {pronunciationResult && (
                      <div className="text-left text-slate-800 space-y-2 p-3 bg-white rounded-lg">
                          <p className="text-2xl font-bold">정확도: <span className="text-purple-600">{pronunciationResult.score}%</span></p>
                          <p className="text-sm text-slate-500">내가 읽은 단어:</p>
                          {pronunciationResult.diff}
                      </div>
                  )}
                  {audioURL && <audio controls src={audioURL} className="w-full"></audio>}
                  <button onClick={() => isPracticing ? handleStopPractice() : handleStartPractice(answerWord)} disabled={isProcessing} className={`w-full flex items-center justify-center py-3 text-white font-bold rounded-lg shadow-md transition-all ${isPracticing ? 'bg-red-500' : 'bg-purple-600 hover:bg-purple-700'} ${isProcessing ? 'bg-slate-400' : ''}`}>
                    {isPracticing ? <><StopIcon/><span className="ml-2">녹음 중지</span></> : isProcessing ? <><SpinnerIcon/><span className="ml-2">분석 중...</span></> : <><MicrophoneIcon/><span className="ml-2">따라 읽기</span></>}
                  </button>
                </div>
                <button onClick={handleNextWord} className="w-full mt-2 py-4 bg-green-600 text-white font-bold text-xl rounded-lg shadow-md hover:bg-green-700">Next Word</button>
              </div>
            )}
            {result === ResultState.INCORRECT && (
              <div className="text-red-600 bg-red-100 p-4 rounded-lg"><CrossIcon className="mx-auto"/><p className="font-bold text-xl mt-1">Try again!</p>
                {!showHint && <button onClick={() => setShowHint(true)} className="mt-2 text-sm text-indigo-600 hover:underline">Show Hint</button>}
                {showHint && <div className="mt-2 text-lg font-mono tracking-widest bg-yellow-100 text-yellow-800 p-2 rounded">{generateHint(answerWord)}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SENTENCE QUIZ COMPONENT ---
const SentenceQuiz: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [questions, setQuestions] = useState<SentenceQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState<ResultState>(ResultState.IDLE);
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  // Pronunciation practice state
  const [isPracticing, setIsPracticing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [pronunciationResult, setPronunciationResult] = useState<{ score: number; diff: React.ReactNode; transcript: string } | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);


  useEffect(() => {
    setQuestions(shuffleArray(SENTENCE_QUESTIONS));
  }, []);
  
  useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (recognitionRef.current) recognitionRef.current.abort();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
    };
  }, [audioURL]);

  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex]);

  const normalizeAnswer = (str: string) => str.toLowerCase().replace(/[.,?]/g, '').replace(/\s+/g, ' ').trim();
  
  const resetPracticeState = () => {
    setIsPracticing(false);
    setIsProcessing(false);
    setAudioURL(null);
    setPronunciationResult(null);
    setPracticeError(null);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
        recognitionRef.current.abort();
    }
  };
  
  const handleStartPractice = (correctAnswer: string) => {
    resetPracticeState();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPracticeError("음성 인식이 지원되지 않는 브라우저입니다.");
      return;
    }
     if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPracticeError("녹음 기능이 지원되지 않는 브라우저입니다.");
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            setAudioURL(URL.createObjectURL(audioBlob));
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.start();
        
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.interimResults = false;
        recognitionRef.current.continuous = false;

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          const result = compareAndHighlight(correctAnswer, transcript);
          setPronunciationResult({ ...result, transcript });
        };
        recognitionRef.current.onerror = (event) => {
          if (event.error === 'no-speech') {
              setPracticeError("음성이 감지되지 않았습니다. 다시 시도해주세요.");
          } else {
              setPracticeError(`음성 인식 오류: ${event.error}`);
          }
        };
        recognitionRef.current.onend = () => {
          setIsProcessing(false);
          setIsPracticing(false);
           if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        };
        
        recognitionRef.current.start();
        setIsPracticing(true);
      })
      .catch(err => {
        console.error("Mic access error:", err);
        setPracticeError("마이크에 접근할 수 없습니다. 권한을 확인해주세요.");
      });
  };

  const handleStopPractice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
    setIsPracticing(false);
    setIsProcessing(true);
  };

  const handleCheckAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    const isCorrect = normalizeAnswer(userInput) === normalizeAnswer(currentQuestion.answer);
    setResult(isCorrect ? ResultState.CORRECT : ResultState.INCORRECT);
    setShowHint(false);
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
    setUserInput('');
    setResult(ResultState.IDLE);
    setShowHint(false);
    resetPracticeState();
  };
  
  const handleRestart = () => {
    setQuestions(shuffleArray(SENTENCE_QUESTIONS));
    setCurrentIndex(0);
    setUserInput('');
    setResult(ResultState.IDLE);
    setShowHint(false);
    setIsFinished(false);
    resetPracticeState();
  };

  const generateHint = useCallback(() => currentQuestion ? `Sentence starts with "${currentQuestion.answer.split(' ')[0]}".` : '', [currentQuestion]);

  if (questions.length === 0 || !currentQuestion) return <div className="text-xl">Loading...</div>;

  if (isFinished) {
    return (
      <div className="text-center p-10 rounded-2xl shadow-2xl bg-white">
        <h1 className="text-5xl font-bold mb-4">Well Done!</h1>
        <p className="text-2xl mb-8">You have completed all the sentences.</p>
        <button onClick={handleRestart} className="px-8 py-4 bg-yellow-400 text-indigo-800 font-bold rounded-xl shadow-lg hover:bg-yellow-300">Start Over</button>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-xl mx-auto">
      <header className="text-center mb-8 relative">
         <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-200" aria-label="Back"><BackArrowIcon/></button>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800">Sentence Practice</h1>
      </header>
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2 text-slate-600"><span>Progress</span><span>Question {currentIndex + 1} / {questions.length}</span></div>
          <div className="w-full bg-slate-200 rounded-full h-4"><div className="bg-teal-500 h-4 rounded-full" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div></div>
        </div>
        <div className="text-center">
          <p className="text-lg text-slate-500 mb-2">Korean</p>
          <div className="bg-slate-100 rounded-lg p-4 mb-4"><p className="text-3xl font-bold text-slate-700">{currentQuestion.korean}</p></div>
          <p className="text-lg text-slate-500 mb-2">Unscramble the words:</p>
          <p className="text-xl font-mono tracking-wide text-teal-700 mb-4 bg-teal-50 p-3 rounded-md">{currentQuestion.scrambled.join(' / ')}</p>
          <form onSubmit={handleCheckAnswer}>
            <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type the correct sentence..." disabled={result === ResultState.CORRECT} className="w-full p-4 text-xl text-center border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" autoFocus />
            {result !== ResultState.CORRECT && <button type="submit" className="w-full mt-4 py-4 bg-teal-600 text-white font-bold text-xl rounded-lg shadow-md hover:bg-teal-700">Check Answer</button>}
          </form>
          <div className="mt-6 min-h-[120px]">
            {result === ResultState.CORRECT && (
              <div className="text-green-600 bg-green-100 p-4 rounded-lg space-y-4">
                <div className="flex items-center justify-center"><CheckIcon /><p className="font-bold text-2xl ml-2">Correct!</p></div>
                <p className="text-xl text-slate-800">{currentQuestion.answer}</p>
                 <div className="w-full pt-4 border-t-2 border-green-200 space-y-3">
                  <h3 className="text-lg font-bold text-slate-700">발음 정확도 확인하기</h3>
                   {practiceError && <p className="text-red-500 text-sm">{practiceError}</p>}
                  {pronunciationResult && (
                      <div className="text-left text-slate-800 space-y-2 p-3 bg-white rounded-lg">
                          <p className="text-2xl font-bold">정확도: <span className="text-purple-600">{pronunciationResult.score}%</span></p>
                          <p className="text-sm text-slate-500">내가 읽은 문장:</p>
                          {pronunciationResult.diff}
                      </div>
                  )}
                  {audioURL && <audio controls src={audioURL} className="w-full"></audio>}
                  <button onClick={() => isPracticing ? handleStopPractice() : handleStartPractice(currentQuestion.answer)} disabled={isProcessing} className={`w-full flex items-center justify-center py-3 text-white font-bold rounded-lg shadow-md transition-all ${isPracticing ? 'bg-red-500' : 'bg-purple-600 hover:bg-purple-700'} ${isProcessing ? 'bg-slate-400' : ''}`}>
                    {isPracticing ? <><StopIcon/><span className="ml-2">녹음 중지</span></> : isProcessing ? <><SpinnerIcon/><span className="ml-2">분석 중...</span></> : <><MicrophoneIcon/><span className="ml-2">따라 읽기</span></>}
                  </button>
                </div>
                <button onClick={handleNextQuestion} className="w-full mt-2 py-4 bg-green-600 text-white font-bold text-xl rounded-lg shadow-md hover:bg-green-700">Next Question</button>
              </div>
            )}
            {result === ResultState.INCORRECT && (
              <div className="text-red-600 bg-red-100 p-4 rounded-lg"><CrossIcon className="mx-auto" /><p className="font-bold text-xl mt-1">Try again!</p>
                {!showHint && <button onClick={() => setShowHint(true)} className="mt-2 text-sm text-indigo-600 hover:underline">Show Hint</button>}
                {showHint && <div className="mt-2 text-lg font-mono bg-yellow-100 text-yellow-800 p-2 rounded">{generateHint()}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT (ROUTER) ---
const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>(AppMode.START);

  const renderContent = () => {
    switch (appMode) {
      case AppMode.WORD_QUIZ:
        return <WordQuiz onBack={() => setAppMode(AppMode.START)} />;
      case AppMode.SENTENCE_QUIZ:
        return <SentenceQuiz onBack={() => setAppMode(AppMode.START)} />;
      case AppMode.START:
      default:
        return <StartScreen onSelectMode={setAppMode} />;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex flex-col items-center justify-center p-4 font-sans">
      <h1 className="text-2xl font-bold text-slate-700 mb-6">경동초 맞춤형 영어교육 프로그램</h1>
      {renderContent()}
    </div>
  );
};

export default App;
