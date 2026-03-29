import type { PollQuestion } from '@/types/poll'

export const POLL_QUESTIONS: PollQuestion[] = [
  { emoji: '✈️', text: '가장 여행 가고 싶은 나라는?' },
  { emoji: '🍜', text: '음식이 가장 맛있을 것 같은 나라는?' },
  { emoji: '🏠', text: '살고 싶은 나라는?' },
  { emoji: '🎓', text: '유학 가고 싶은 나라는?' },
  { emoji: '💼', text: '일하고 싶은 나라는?' },
  { emoji: '🌊', text: '바다가 가장 아름다운 나라는?' },
  { emoji: '🏔️', text: '자연경관이 가장 멋진 나라는?' },
  { emoji: '🎶', text: '음악이 가장 좋은 나라는?' },
  { emoji: '🎬', text: '영화·드라마가 가장 재미있는 나라는?' },
  { emoji: '🤝', text: '사람들이 가장 친절한 나라는?' },
  { emoji: '🛡️', text: '치안이 가장 좋을 것 같은 나라는?' },
  { emoji: '💰', text: '부자가 되기 가장 쉬울 것 같은 나라는?' },
  { emoji: '🏥', text: '의료 시스템이 가장 좋은 나라는?' },
  { emoji: '🌿', text: '환경이 가장 깨끗한 나라는?' },
  { emoji: '🎮', text: '게임 문화가 가장 발달한 나라는?' },
  { emoji: '⚽', text: '축구가 가장 재미있는 나라는?' },
  { emoji: '🏀', text: '농구 팬이 가장 많은 나라는?' },
  { emoji: '🎭', text: '문화·예술이 가장 풍부한 나라는?' },
  { emoji: '📚', text: '교육 수준이 가장 높은 나라는?' },
  { emoji: '🚀', text: '기술이 가장 앞선 나라는?' },
  { emoji: '🧠', text: '가장 스마트한 사람들이 사는 나라는?' },
  { emoji: '😄', text: '사람들이 가장 행복해 보이는 나라는?' },
  { emoji: '🍺', text: '맥주가 가장 맛있는 나라는?' },
  { emoji: '☕', text: '카페 문화가 가장 발달한 나라는?' },
  { emoji: '🛒', text: '쇼핑하기 가장 좋은 나라는?' },
  { emoji: '🏛️', text: '역사 유적이 가장 많은 나라는?' },
  { emoji: '🌃', text: '야경이 가장 아름다운 나라는?' },
  { emoji: '🎄', text: '크리스마스 분위기가 가장 좋은 나라는?' },
  { emoji: '🌸', text: '봄 풍경이 가장 아름다운 나라는?' },
  { emoji: '❄️', text: '겨울 여행하기 가장 좋은 나라는?' },
  { emoji: '☀️', text: '여름 휴가 가기 가장 좋은 나라는?' },
  { emoji: '🍁', text: '단풍이 가장 아름다운 나라는?' },
  { emoji: '🐘', text: '동물을 가장 가까이 볼 수 있는 나라는?' },
  { emoji: '🦁', text: '야생동물이 가장 다양한 나라는?' },
  { emoji: '🍣', text: '해산물이 가장 맛있는 나라는?' },
  { emoji: '🥩', text: '고기 요리가 가장 맛있는 나라는?' },
  { emoji: '🍰', text: '디저트가 가장 맛있는 나라는?' },
  { emoji: '🎪', text: '축제가 가장 신나는 나라는?' },
  { emoji: '🏎️', text: '자동차 문화가 가장 발달한 나라는?' },
  { emoji: '🚆', text: '대중교통이 가장 편한 나라는?' },
  { emoji: '💡', text: '스타트업 하기 가장 좋은 나라는?' },
  { emoji: '🧘', text: '명상·힐링하기 가장 좋은 나라는?' },
  { emoji: '🏖️', text: '해변이 가장 아름다운 나라는?' },
  { emoji: '⛷️', text: '스키·스노우보드 타기 가장 좋은 나라는?' },
  { emoji: '🎨', text: '미술·디자인이 가장 발달한 나라는?' },
  { emoji: '🏰', text: '성(Castle)이 가장 멋진 나라는?' },
  { emoji: '🌮', text: '길거리 음식이 가장 맛있는 나라는?' },
  { emoji: '🍷', text: '와인이 가장 맛있는 나라는?' },
  { emoji: '👗', text: '패션이 가장 세련된 나라는?' },
  { emoji: '🤿', text: '다이빙하기 가장 좋은 나라는?' },
  { emoji: '🎯', text: '올림픽을 개최하기 가장 좋은 나라는?' },
  { emoji: '🌐', text: '인터넷 속도가 가장 빠른 나라는?' },
  { emoji: '🏡', text: '노후를 보내기 가장 좋은 나라는?' },
]

export function getTodayQuestion(): { idx: number; question: PollQuestion; date: string } {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  // UTC 날짜 기준 일수로 배열 인덱스 결정 → 매일 같은 질문 유지
  const daysSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60 * 24))
  const idx = daysSinceEpoch % POLL_QUESTIONS.length
  return { idx, question: POLL_QUESTIONS[idx], date }
}
