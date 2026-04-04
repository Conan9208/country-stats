# 🌍 WorldStats — CLAUDE.md

> 이 파일은 Claude Code for VS Code가 프로젝트 맥락을 이해하기 위한 가이드입니다.
> 코드 작성 전 반드시 이 파일을 참고하세요.

---

## 📌 프로젝트 개요

- **프로젝트명**: WorldStats
- **설명**: 3D 지구본으로 세계를 탐험하고 가볍게 즐기는 인터랙티브 국가 정보 사이트
- **방향성**: 가볍고 재미있게 즐기고 가는 경험 — 퀴즈, 배틀, 히트맵, 스핀 등 지구본과의 놀이
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
| 다국어 | i18n-iso-countries (KO/EN) |
| 폰트 | Geist (기본) + Bangers + Pacifico (layout.tsx `<link>` 로드) |
| 수익화 | Google AdSense |
| 저장소 | GitHub |
| 개발 AI | Claude |

### 외부 API 요약

| API | 용도 | 캐싱 |
|---|---|---|
| restcountries.com/v3.1 | 국가 목록, 국기, 기본 정보 | 없음 (클라이언트) / 24h (서버) |
| api.worldbank.org/v2 | GDP, 부채비율, 금리 | 24h |
| open.er-api.com/v6 | 실시간 환율 | 1h |
| IMF API | (미구현 — 낮은 우선순위) | — |

---

## 📋 구현 기능 로드맵

### ✅ Phase 1 — 기초 뼈대 (완료)
- [x] Next.js 프로젝트 생성
- [x] Tailwind CSS + shadcn/ui 설치
- [x] REST Countries API 국가 목록 + 카드 UI
- [x] 검색 (국가명/수도) + 지역 필터 (6개 권역)
- [x] Vercel 배포 연동
- [x] Supabase 프로젝트 생성 + 테이블 설계 + RPC 함수

### ✅ Phase 2 — 핵심 기능 (완료)
- [x] 3D 인터랙티브 지구본 (D3.js canvas, 드래그/줌/관성/자동 회전)
- [x] 나라별 클릭수 카운트 (Supabase 실시간 구독 + 낙관적 업데이트)
- [x] 클릭 티어 시스템 (8단계: 입문 → 👑레전드, 색상 그라데이션)
- [x] 쇼크파동·파티클·플래시 클릭 이펙트
- [x] 국가 컨텍스트 메뉴 (우클릭 → 기본 정보 / 댓글 보기)
- [x] 오늘의 나라 투표 (55개 질문 매일 자정 갱신, IP 기반 1일 1회)
- [x] 투표 이유 입력 + 축하 모달 (자동 닫힘 카운트다운)
- [x] 실시간 투표 결과 + 트위터/클립보드 공유
- [x] 투표 취소 기능
- [x] 국가별 댓글 시스템 (신고 3회 자동 숨김, URL 스팸 필터, 1일 1회 제한)
- [x] 국가 상세 정보 모달 (수도·인구·면적·언어·통화·시간대 등)
- [x] 국가 부채 시각화 코드 (World Bank API — 메뉴 미노출, 코드 보존)

### ✅ Phase 3 — 부가 기능 (완료)
- [x] 환율 계산기 (open.er-api.com 실시간)
- [x] 국가 비교 (2개국 나란히 비교)
- [x] 세계 랭킹 (인구/면적 Top 20, 지역 필터)
- [x] 애드센스 필수 페이지 (About, Privacy, Contact, Donate)
- [x] Google AdSense 연동
- [x] 랜덤 스핀 (슬롯머신 스타일 국가 선택 + 폭죽 이펙트)

### 🔜 Phase 4 — 재미 기능 강화 (다음 목표)
- [ ] **스핀 후 팩트 카드** — 스핀 착륙 시 해당 국가의 흥미로운 한 줄 팩트 표시 (인구/면적 세계 순위, 독특한 기록 등)
- [ ] **클릭 히트맵** — 전체 유저 클릭 집계를 지구본 위에 펄스 애니메이션으로 시각화 (TOP10 강조)
- [ ] **국가 1:1 배틀** — 지구본에서 두 나라 선택 → 인구/면적/GDP 승패 비교 카드

### 🔜 Phase 5 — 소셜/공유 강화
- [ ] 배틀 결과 / 스핀 팩트 카드 이미지 공유
- [ ] "내가 탐험한 나라 수" 개인 트래킹 + 공유

### 🔜 Phase 6 — 품질/인프라
- [ ] 클릭 rate limit → Upstash Redis 전환 (현재 in-memory, 다중 인스턴스 간 공유 안 됨)
- [ ] Buy Me a Coffee 링크 실제 연결 (현재 placeholder)
- [ ] IMF API 데이터 추가 (우선순위 낮음)

---

## 🎨 디자인 가이드

- **테마**: 다크 모드 기반 (`bg-zinc-950`)
- **컬러**: zinc 계열 + white 포인트, 투표/지구본 UI는 보라(violet/purple) 계열 강조
- **폰트**: Geist (기본 UI) + Bangers (가이드 텍스트) + Pacifico (투표 카드 타이틀)
- **카드**: 국기 이미지 상단, 국가 정보 하단
- **인터랙션**: hover 시 scale + border 변화
- **레이아웃**: 반응형 그리드 (1→2→3→4 컬럼)
- **글래스 모피즘**: 지구본 위 오버레이 카드 — `mapConstants.ts`의 `glass` 상수 재사용

---

## ⚙️ 개발 환경

- **OS**: macOS
- **에디터**: VSCode + Claude Code 익스텐션
- **Node.js**: v25.2.1
- **패키지 매니저**: npm
- **로컬 주소**: http://localhost:3000

---

## 📝 코딩 컨벤션

- **언어**: TypeScript 사용 (any 타입 지양)
- **컴포넌트**: 함수형 컴포넌트 + React Hooks
- **스타일**: Tailwind CSS 클래스 우선 (복잡한 오버레이/애니메이션은 인라인 style 허용)
- **API 호출**: 서버 컴포넌트 or `useEffect` 클라이언트 fetch
- **타입**: 기능별 `types/*.ts`에 인터페이스 정의
- **파일명**: PascalCase (컴포넌트), camelCase (유틸/lib)
- **성능**: 핫 경로(draw loop, click handler)는 ref + useCallback으로 리렌더 최소화

---

## 🚨 주의사항

- Supabase KEY는 반드시 `.env.local`에 보관 (절대 커밋 금지)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `IP_SALT` — 댓글 IP 해싱용 salt
- `.env.local`은 `.gitignore`에 포함 확인
- 이미지 최적화: Next.js `<Image>` 컴포넌트 사용 권장 (국기 SVG는 `<img>` 그대로 사용 중)
- 클릭 rate limit은 현재 **in-memory 저장** → Vercel 다중 인스턴스 환경에서 불안정, Upstash Redis 전환 예정 (Phase 6)
- 지구본 `draw()` 루프는 매 프레임 실행 — 불필요한 React 상태 업데이트 금지, ref 사용
- DebtModal / `/api/country/[code]/route.ts` 는 코드 보존 중 (우클릭 메뉴에서 제거된 상태)

 ## ✅ 구현 완료 기준 (Definition of Done)

### 기본 검증
1. `npm run build` 성공
2. `npx tsc --noEmit` TypeScript 오류 0개
3. 변경 파일 및 연관 컴포넌트 목록 명시

### 기능 동작 검증 (필수)
4. **시나리오 추적**: 요청한 기능의 핵심 유저 플로우를
   코드에서 함수 단위로 직접 추적하고 결과 보고
5. **충돌 체크**: 같은 이벤트/조건에서 트리거되는 
   다른 UI/함수가 있는지 확인 (특히 모달, 팝업, 상태값)
6. **상태 간섭**: 관련 useState/useRef/전역 상태가 
   기존 기능과 겹치는지 확인

### 보고 형식
- ✅ 확인된 것 (근거 파일명 포함)
- ❌ 확인 못한 것 (브라우저 실행 필요한 것)
- ⚠️ 잠재적 충돌 가능성
 