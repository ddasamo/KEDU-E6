import type { VocabWord, SentenceQuestion } from './types';

export const VOCABULARY: VocabWord[] = [
  { id: 1, present: 'am / is', past: 'was', korean: '~이다' },
  { id: 2, present: 'are', past: 'were', korean: '~이다' },
  { id: 3, present: 'do', past: 'did', korean: '하다' },
  { id: 4, present: 'paint', past: 'painted', korean: '칠하다' },
  { id: 5, present: 'build', past: 'built', korean: '짓다' },
  { id: 6, present: 'draw', past: 'drew', korean: '그리다' },
  { id: 7, present: 'invent', past: 'invented', korean: '발명하다' },
  { id: 8, present: 'make', past: 'made', korean: '만들다' },
  { id: 9, present: 'write', past: 'wrote', korean: '쓰다' },
  { id: 10, present: 'swim', past: 'swam', korean: '수영하다' },
  { id: 11, present: 'meet', past: 'met', korean: '만나다' },
  { id: 12, present: 'read', past: 'read', korean: '읽다' },
  { id: 13, present: 'learn', past: 'learned', korean: '배우다' },
  { id: 14, present: 'go', past: 'went', korean: '가다' },
  { id: 15, present: 'play', past: 'played', korean: '놀다' },
  { id: 16, present: 'visit', past: 'visited', korean: '방문하다' },
  { id: 17, present: 'eat', past: 'ate', korean: '먹다' },
  { id: 18, present: 'study', past: 'studied', korean: '공부하다' },
  { id: 19, present: 'watch', past: 'watched', korean: '보다' },
];

export const SENTENCE_QUESTIONS: SentenceQuestion[] = [
  { id: 1, korean: '누가 그림을 그렸니?', scrambled: ['drew', 'who', 'picture', 'the', '?'], answer: 'Who drew the picture?' },
  { id: 2, korean: '누가 이야기를 썼니?', scrambled: ['story', 'who', 'the', 'wrote', '.'], answer: 'Who wrote the story.' },
  { id: 3, korean: '누가 여자들을 위한 학교를 만들었니?', scrambled: ['women', 'school', 'who', 'for', 'made', '?'], answer: 'Who made school for women?' },
  { id: 4, korean: '누가 와이파이를 발명했니?', scrambled: ['invented', 'Wifi', 'who', '?'], answer: 'Who invented Wifi?' },
  { id: 5, korean: '누가 DDP를 지었니?', scrambled: ['built', 'who', 'DDP', '?'], answer: 'Who built DDP?' },
  { id: 6, korean: '누가 침팬지를 연구했니?', scrambled: ['studied', 'who', 'Chimpanzees', '?'], answer: 'Who studied Chimpanzees?' },
  { id: 7, korean: '제인 구달이 연구했어.', scrambled: ['did', 'Jane Goodall', '.'], answer: 'Jane Goodall did.' },
  { id: 8, korean: '그녀는 훌륭한 예술가였어.', scrambled: ['a', 'artist', 'she', 'was', 'great', '.'], answer: 'She was a great artist.' },
  { id: 9, korean: '너는 \'권기옥\'이라고 말했니?', scrambled: ['Kwon Ki Ok', 'did', 'say', 'you', '?'], answer: 'Did you say Kwon Ki Ok?' },
  { id: 10, korean: '응, 내가 그랬어.', scrambled: ['did', 'yes', 'I', ',', '.'], answer: 'Yes, I did.' },
];
