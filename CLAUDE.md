# 🌍 WorldStats — CLAUDE.md

> 이 파일은 Claude Code for VS Code가 프로젝트 맥락을 이해하기 위한 가이드입니다.
> 코드 작성 전 반드시 이 파일을 참고하세요.

---

## 📌 프로젝트 개요

- **프로젝트명**: WorldStats
- **설명**: 3D 지구본으로 세계를 탐험하고 가볍게 즐기는 인터랙티브 국가 정보 사이트
- **방향성**: 지구본을 중심으로 한 UGC(유저 생성 콘텐츠) + 재방문 유도 기능으로 트래픽/수익화
- **목적**: 연습용 + 실제 배포 (Vercel에서 운영 중)
- **GitHub**: https://github.com/Conan9208/country-stats

---

## 🛠️ 기술 스택

| 항목 | 기술 |
|---|---|
| 호스팅 | Vercel |
| 프론트엔드 | Next.js 16 (App Router) + TypeScript 5 |
| 스타일링 | Tailwind CSS 4 + shadcn/ui (Nova 프리셋, Radix 기반) |
| DB | Supabase (PostgreSQL + Realtime 구독) |
| 지도/시각화 | D3.js (d3-geo, d3-drag, d3-selection) + topojson-client + world-atlas |
| 다국어 | next-intl (KO/EN), i18n-iso-countries |
| 폰트 | Geist (기본) + Bangers + Pacifico (layout.tsx `<link>` 로드) |
| 수익화 | Google AdSense + 지구본 핀 (유료 플랜 예정) |
| 저장소 | GitHub |
| 개발 AI | Claude |

### 외부 API 요약

| API | 용도 | 캐싱 |
|---|---|---|
| restcountries.com/v3.1 | 국가 목록, 국기, 기본 정보 | 없음 (클라이언트) / 24h (서버) |
| api.worldbank.org/v2 | GDP, 부채비율, 금리 | 24h |
| open.er-api.com/v6 | 실시간 환율 | 1h |

---

## 📋 구현 현황

### ✅ 완료된 기능 전체

**기초 인프라**
- Next.js + Tailwind CSS + shadcn/ui + Vercel 배포
- Supabase 프로젝트 + 테이블 설계 + RPC 함수
- 다국어 (KO/EN) — next-intl

**지구본 핵심**
- 3D 인터랙티브 지구본 (D3.js canvas, 드래그/줌/관성/자동 회전)
- 나라별 클릭수 카운트 (Supabase 실시간 구독 + 낙관적 업데이트)
- 클릭 티어 시스템 (8단계: 입문 → 👑레전드, 색상 그라데이션)
- 쇼크파동·파티클·플래시 클릭 이펙트
- 랜덤 스핀 (슬롯머신 스타일 + 폭죽 이펙트)
- 국가 컨텍스트 메뉴 (우클릭 → 기본 정보 / 댓글 / 핀 남기기)
- 실시간 뷰어 표시 (Supabase Presence)

**참여 기능**
- 오늘의 나라 투표 (55개 질문 매일 자정 갱신, IP 기반 1일 1회)
- 투표 이유 입력 + 축하 모달 + X(트위터)/클립보드 공유
- 국가별 댓글 시스템 (신고 3회 자동 숨김, URL 스팸 필터, 1일 1회 제한)
- **지구본 핀 시스템** — 나라 위에 이모지+메시지 핀 꽂기, 7일 유효, 공유 기능

**정보/유틸**
- 국가 상세 정보 모달 (수도·인구·면적·언어·통화·시간대)
- 환율 계산기 (open.er-api.com 실시간)
- 국가 비교 (2개국 나란히)
- 세계 랭킹 (인구/면적 Top 20, 지역 필터)

**인프라/수익화**
- Google AdSense 연동
- About / Privacy / Contact / Donate 페이지

**코드 보존 중 (미노출)**
- DebtModal + `/api/country/[code]/route.ts` — 우클릭 메뉴에서 제거, 코드는 유지

---

## 🔜 앞으로 할 것

### 지구본 핀 — 수익화 연장
- [ ] 유료 프리미엄 핀 (더 긴 기간, 링크 포함, 강조 표시)
- [ ] 결제 연동 (Stripe 또는 Ko-fi)
- [ ] 핀 피드 탭 통합 (최근 핀 목록)

### 재방문 강화
- [ ] **스핀 후 팩트 카드** — 스핀 착륙 시 국가의 흥미로운 한 줄 팩트 (이미 `countryFacts.ts` 데이터 있음)
- [ ] **클릭 히트맵** — 전체 유저 클릭 집계를 지구본 위에 펄스 시각화 (TOP10 강조)

### 기술 부채
- [ ] 클릭 rate limit → Upstash Redis 전환 (현재 in-memory, Vercel 다중 인스턴스에서 불안정)
- [ ] Ko-fi Donate 링크 실제 연결 (현재 placeholder)

---

## 🎨 디자인 가이드

- **테마**: 다크 모드 기반 (`bg-zinc-950`)
- **컬러**: zinc 계열 + white 포인트, 투표/지구본 UI는 보라(violet/purple) 계열 강조
- **폰트**: Geist (기본 UI) + Bangers (가이드 텍스트) + Pacifico (투표 카드 타이틀)
- **인터랙션**: hover 시 scale + border 변화
- **글래스 모피즘**: 지구본 위 오버레이 카드 — `mapConstants.ts`의 `glass` 상수 재사용

---

## ⚙️ 개발 환경

- **OS**: Windows 11
- **에디터**: VSCode + Claude Code 익스텐션
- **Node.js**: v25.2.1
- **패키지 매니저**: npm
- **로컬 주소**: http://localhost:4000

---

## 📁 주요 파일 구조

```
src/
├── app/
│   ├── [locale]/          # 다국어 라우트 (ko/en)
│   └── api/
│       ├── clicks/        # 나라 클릭 카운트
│       ├── comments/      # 댓글 CRUD + 신고
│       ├── pins/          # 지구본 핀 CRUD + 신고
│       ├── polls/         # 투표
│       └── stats/         # 방문자 통계
├── components/
│   ├── WorldMap.tsx       # 지구본 핵심 (draw loop, 이벤트 전체)
│   ├── PinSubmitModal.tsx # 핀 등록 모달
│   ├── PinPopup.tsx       # 핀 클릭 팝업
│   ├── CommentPanel.tsx   # 국가별 댓글
│   ├── CountryInfoModal.tsx
│   └── StatsPanelOverlay.tsx
├── lib/
│   ├── mapConstants.ts    # glass 상수, TIERS 등
│   ├── mapUtils.ts        # countryColor, topN 등
│   └── geoData.ts         # centroidByAlpha2, worldGeo 등
├── types/
│   ├── map.ts
│   ├── pin.ts             # GlobePin 타입
│   └── poll.ts
└── data/
    └── countryFacts.ts    # 국가별 흥미로운 팩트 데이터
```

---

## 📝 코딩 컨벤션

- **언어**: TypeScript 사용 (any 타입 지양)
- **컴포넌트**: 함수형 컴포넌트 + React Hooks
- **스타일**: 인라인 style 우선 (지구본 오버레이 특성상), 간단한 레이아웃만 Tailwind
- **API 호출**: 서버 컴포넌트 or `useEffect` 클라이언트 fetch
- **타입**: 기능별 `types/*.ts`에 인터페이스 정의
- **파일명**: PascalCase (컴포넌트), camelCase (유틸/lib)
- **성능**: 핫 경로(draw loop, click handler)는 ref + useCallback으로 리렌더 최소화

---

## 🚨 주의사항

- Supabase KEY는 반드시 `.env.local`에 보관 (절대 커밋 금지)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `IP_SALT` — IP 해싱용 salt (댓글/핀 공통)
- 지구본 `draw()` 루프는 매 프레임 실행 — 불필요한 React 상태 업데이트 금지, ref 사용
- 클릭 rate limit은 현재 **in-memory** → Vercel 다중 인스턴스 환경에서 불안정
- `npm run build` 시 `.next/dev/types/validator.ts` route type 에러는 **기존 pre-existing 에러** (next-intl + Next.js 16 호환 이슈) — 내 코드 문제 아님

---

## ✅ 구현 완료 기준 (Definition of Done)

### 기본 검증
1. `npx tsc --noEmit` — 새로 추가한 파일에 타입 에러 없는지 확인
2. 변경 파일 및 연관 컴포넌트 목록 명시

### 기능 동작 검증 (필수)
3. **시나리오 추적**: 요청한 기능의 핵심 유저 플로우를 코드에서 함수 단위로 직접 추적하고 결과 보고
4. **충돌 체크**: 같은 이벤트/조건에서 트리거되는 다른 UI/함수가 있는지 확인 (특히 모달, 팝업, 상태값)
5. **상태 간섭**: 관련 useState/useRef가 기존 기능과 겹치는지 확인

### 보고 형식
- ✅ 확인된 것 (근거 파일명 포함)
- ❌ 확인 못한 것 (브라우저 실행 필요한 것)
- ⚠️ 잠재적 충돌 가능성
