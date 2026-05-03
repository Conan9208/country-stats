# 🌍 PostMyGlobe

> **3D 인터랙티브 지구본으로 세계를 탐험하는 UGC 기반 국가 정보 플랫폼**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-postmyglobe.com-4f46e5?style=for-the-badge)](https://postmyglobe.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

---

## 📌 프로젝트 소개

D3.js Canvas로 직접 구현한 3D 지구본 위에서 전 세계 195개국을 탐색하고, 국가별 클릭수·댓글·핀·투표를 실시간으로 기록하는 인터랙티브 웹 서비스입니다.

**핵심 가치**: 지구본이라는 직관적인 UI + Supabase Realtime으로 구현된 실시간 UGC 피드백 루프

---

## ✨ 주요 기능

| 기능 | 설명 |
|---|---|
| 🌐 **3D 인터랙티브 지구본** | D3.js `geoOrthographic` 투영, Canvas 렌더링, 드래그·줌·관성 회전 |
| 📊 **실시간 클릭 집계** | 나라 클릭 → Supabase RPC atomic increment → Realtime 구독으로 전체 유저에게 반영 |
| 🎯 **클릭 티어 시스템** | 8단계 (입문 → 👑레전드) 색상 그라데이션, 낙관적 업데이트 + 서버 확정값 교정 |
| 📍 **지구본 핀** | 나라 위에 이모지+메시지 꽂기, 7일 유효기간, URL 안전성 검증 (DNS + Safe Browsing) |
| 🗳️ **오늘의 나라 투표** | 55개 질문 매일 자정 갱신, IP 해시 기반 1일 1회 제한 |
| 💬 **국가별 댓글** | URL 스팸 필터, 신고 3회 자동 숨김, 페이지네이션 |
| 🔄 **랜덤 스핀 룰렛** | 슬롯머신 스타일 무작위 국가 선택 + 파티클 이펙트 |
| 💱 **실시간 환율 계산기** | open.er-api.com 1h 캐시 |
| 🏆 **세계 랭킹** | 인구·면적 Top 20, 지역 필터 |
| 🌐 **다국어 지원** | 한국어 / 영어 (next-intl) |
| 👥 **실시간 접속자** | Supabase Presence 채널 |

---

## 🛠️ 기술 스택

| 분류 | 기술 | 선택 이유 |
|---|---|---|
| **프레임워크** | Next.js 16 (App Router) | 서버 컴포넌트 + Route Handlers로 BFF 패턴 구현 |
| **언어** | TypeScript 5 | 복잡한 GeoJSON·Supabase 타입을 안전하게 관리 |
| **DB / Realtime** | Supabase (PostgreSQL + Realtime + Storage) | RPC 함수로 원자적 카운터 구현, Presence로 접속자 실시간 동기화 |
| **지구본 렌더링** | D3.js (d3-geo, d3-drag, d3-selection) | SVG 대비 Canvas가 195개국 매 프레임 렌더에 적합 |
| **지도 데이터** | topojson-client + world-atlas | TopoJSON의 압축 효율로 번들 크기 최소화 |
| **스타일링** | Tailwind CSS 4 + shadcn/ui | 오버레이 카드는 인라인 style, 레이아웃만 Tailwind |
| **다국어** | next-intl + i18n-iso-countries | 국가명 로케일 변환 + 라우트 기반 i18n |
| **배포** | Vercel (서버리스) | Edge Network CDN + 서버리스 함수 자동 스케일 |

---

## 🏗️ 백엔드 아키텍처

### API Route 전체 목록

```
/api/clicks              GET  전체 + 오늘 클릭 집계 (s-maxage=30)
                         POST 클릭 카운트 atomic increment (RPC)

/api/comments            GET  국가별 댓글 목록 (페이지네이션)
                         POST 댓글 작성 (IP 해시 기반 1일 1회 제한)
/api/comments/report     POST 댓글 신고 (3회 누적 시 자동 숨김)
/api/comments/feed       GET  전체 댓글 피드

/api/pins                GET  국가별 또는 전체 핀 목록 (max-age=300)
                         POST 핀 등록 (URL 안전성 검증 + IP 해시 rate limit)
/api/pins/[id]/report    POST 핀 신고

/api/polls/today         GET  오늘의 투표 질문
/api/polls/vote          POST 투표 (IP 해시 기반 1일 1회)
/api/polls/reasons       GET  투표 이유 피드

/api/stats               GET  방문자 통계 집계
/api/track               POST 페이지 방문 기록

/api/country/[code]      GET  국가 상세 (World Bank API 24h 캐시)
/api/quiz/sessions        POST 퀴즈 세션 생성
/api/quiz/answers         POST 퀴즈 정답 제출
/api/visa/[from]/[to]    GET  비자 요건 조회
/api/weather/[city]      GET  날씨 정보

/api/admin/*             GET/DELETE 관리자 전용 (댓글·핀·신고 관리)
```

### 실시간 데이터 흐름

```
클라이언트 클릭
    │
    ▼
[낙관적 업데이트] clickDataRef +1 → 즉시 UI 반영
    │
    ▼
POST /api/clicks → supabase.rpc('increment_view_count')
    │                  └─ DB atomic UPSERT (race condition 없음)
    ▼
서버 확정값 반환 → confirmedCountRef 업데이트 (UI 교정)
    │
    ▼
Supabase Realtime 채널 → 다른 접속자들의 UI도 동기화
```

### 캐싱 전략

| 데이터 | TTL | 방식 | 이유 |
|---|---|---|---|
| 클릭 집계 | 30s (s-maxage) + 60s SWR | HTTP Cache-Control | 실시간성 vs CDN 부하 균형 |
| 국가 상세 (World Bank) | 24h | `next: { revalidate }` | 연간 갱신 데이터 |
| 환율 (open.er-api) | 1h | `next: { revalidate }` | 시세 변동 빈도 반영 |
| 전체 핀 목록 | 5m (max-age=300) | HTTP Cache-Control | 핀 등록 빈도 낮음 |

---

## 🗄️ 데이터베이스 설계

### 주요 테이블

```sql
country_views          -- 나라별 누적 클릭수 (country_code PK)
country_daily_views    -- 날짜별 클릭수 (country_code + view_date PK)

globe_pins             -- 지구본 핀 (is_approved, expires_at, ip_hash)
country_comments       -- 국가별 댓글 (is_hidden, report_count, ip_hash)
comment_reports        -- 댓글 신고 (pin_id FK + reporter_ip_hash)

daily_polls            -- 오늘의 투표 질문 (date PK)
poll_votes             -- 투표 결과 (question_id + ip_hash, UNIQUE 제약)
poll_vote_reasons      -- 투표 이유

page_views             -- 방문자 트래킹
```

### RPC 함수

| 함수명 | 설명 | 원자성이 필요한 이유 |
|---|---|---|
| `increment_view_count` | 클릭수 +1 (total + daily 동시 업데이트) | 다중 서버리스 인스턴스 동시 요청 시 race condition 방지 |

```sql
-- 단일 RPC 호출로 total + daily를 트랜잭션 내에서 처리
SELECT * FROM increment_view_count(
  p_country_code := 'KR',
  p_name := '대한민국'
);
-- 반환: { total: 1234, today: 56 }
```

---

## 🔒 보안 / 스팸 방지

### IP 익명화
```typescript
// SHA-256(IP + SALT) → 앞 16자리만 보관
// 원본 IP 복원 불가 (단방향 해시)
createHash('sha256').update(ip + process.env.IP_SALT).digest('hex').slice(0, 16)
```

### 핀 URL 다중 검증 (병렬 실행)
```typescript
const [exists, isSafe] = await Promise.all([
  checkDomainExists(url),     // DNS lookup (3s timeout)
  checkSafeBrowsing(url),     // Google Safe Browsing API v4
])
```
- 단축 URL(bit.ly 등) 6종 차단
- HTTP HEAD 대신 DNS lookup 사용 (한국 서버의 봇 차단 우회)
- 악성/피싱 사이트 자동 거부

### Rate Limiting 현황

| 기능 | 제한 | 방식 |
|---|---|---|
| 클릭 | IP당 10회/분 | In-memory (serverless instance별) |
| 핀 등록 | IP 해시당 3개/일 | Supabase 쿼리 기반 |
| 댓글 | IP 해시당 1개/일/국가 | Supabase 쿼리 기반 |
| 투표 | IP 해시당 1회/일 | Supabase UNIQUE 제약 |

> ⚠️ **알려진 한계**: 클릭 rate limit은 in-memory → Vercel 다중 인스턴스 환경에서 인스턴스별 독립 카운터. 트래픽 증가 시 **Upstash Redis** 전환 예정.

---

## 🚀 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# → .env.local 에 아래 값 입력

# 3. 개발 서버 실행 (포트 4000)
npm run dev
```

### 환경변수 목록

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 서버 전용 (admin 작업)

# 보안
IP_SALT=your-random-salt            # IP 해싱용 시크릿 (필수)

# 선택 (없으면 해당 기능 스킵)
GOOGLE_SAFE_BROWSING_API_KEY=      # 핀 URL 악성 사이트 검사
DISABLE_PIN_RATE_LIMIT=false       # 개발 환경 rate limit 비활성화
```

---

## 📁 주요 파일 구조

```
src/
├── app/
│   ├── [locale]/              # 다국어 라우트 (ko/en)
│   └── api/                   # Route Handlers (BFF 레이어)
│       ├── clicks/            # 클릭 집계 + RPC
│       ├── pins/              # 핀 CRUD + URL 보안 검증
│       ├── comments/          # 댓글 + 신고 자동화
│       ├── polls/             # 투표 시스템
│       └── admin/             # 관리자 API
├── components/
│   ├── WorldMap.tsx           # 지구본 핵심 (Canvas draw loop, 모든 이벤트)
│   └── WorldMapOverlay.tsx    # 지구본 위 오버레이 UI
├── lib/
│   ├── mapConstants.ts        # TIERS, glass 스타일 상수
│   ├── mapUtils.ts            # countryColor, topN 등 순수 함수
│   └── geoData.ts             # GeoJSON 파싱, centroid 계산
├── data/
│   └── countryFacts.ts        # 국가별 큐레이션 팩트 (KO/EN)
└── hooks/
    ├── useRealtimeViewers.ts  # Supabase Presence 구독
    └── useSpinRoulette.ts     # 스핀 룰렛 로직
```

---

## ⚙️ 성능 최적화

- **draw loop 리렌더 방지**: `useRef` + `useCallback`으로 매 프레임 React 상태 업데이트 없이 Canvas 직접 조작
- **클릭 데이터 캐시**: `clickedAlpha2sRef (Set)` — draw() 핫패스에서 `Object.keys()` 순회 대신 Set.has() O(1) 조회
- **핀 그룹핑 캐시**: `pinsByCountryRef (Map)` — 매 프레임 Map 재생성 방지
- **외부 API 병렬 페치**: `Promise.all([GDP, 환율, 국가 정보])` 동시 요청

---

## 🔜 기술 부채 (예정 작업)

| 항목 | 현황 | 개선 계획 |
|---|---|---|
| 클릭 rate limit | In-memory (인스턴스별 독립) | **Upstash Redis** 전환 → 전역 카운터 |
| Ko-fi Donate 링크 | Placeholder | 실제 링크 연결 |
| 스핀 팩트 카드 | `countryFacts.ts` 데이터 준비됨 | 스핀 착륙 시 국가 팩트 표시 UI 연결 |
| 유료 핀 티어 | 무료 3일만 제공 | Stripe 결제 연동 + 프리미엄 핀 |

---

## 📄 라이선스

Private — All rights reserved.
