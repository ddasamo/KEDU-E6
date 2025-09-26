export interface VocabWord {
  id: number;
  present: string;
  past: string;
  korean: string;
}

export interface SentenceQuestion {
  id: number;
  korean: string;
  scrambled: string[];
  answer: string;
}

export enum ResultState {
  IDLE = 'IDLE',
  CORRECT = 'CORRECT',
  INCORRECT = 'INCORRECT',
}

export enum QuizMode {
  PRESENT_TO_PAST = 'PRESENT_TO_PAST',
  PAST_TO_PRESENT = 'PAST_TO_PRESENT',
}

export enum AppMode {
  START = 'START',
  WORD_QUIZ = 'WORD_QUIZ',
  SENTENCE_QUIZ = 'SENTENCE_QUIZ',
}
