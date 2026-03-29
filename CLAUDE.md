# 🌍 WorldStats — CLAUDE.md

> 이 파일은 Claude Code for VS Code가 프로젝트 맥락을 이해하기 위한 가이드입니다.
> 코드 작성 전 반드시 이 파일을 참고하세요.

---

## 📌 프로젝트 개요

- **프로젝트명**: WorldStats
- **설명**: 글로벌 국가 비교 및 통계 정보 사이트 (3D 지구본, 실시간 투표, 국가 댓글, 경제 계산기)
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
| IMF API | (미구현 — Phase 4 예정) | — |

---

## 🗂️ 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx                    # 메인 허브 (3탭: 국가목록 / 지구본 / 계산기)
│   ├── about/page.tsx              # 서비스 소개
│   ├── contact/page.tsx            # 문의
│   ├── donate/page.tsx             # 후원 (Buy Me a Coffee)
│   ├── privacy/page.tsx            # 개인정보처리방침
│   ├── countries/[code]/page.tsx   # 국가 부채 상세 페이지
│   ├── api/
│   │   ├── clicks/route.ts         # GET(전체 클릭수) / POST(클릭 기록)
│   │   ├── comments/route.ts       # GET(댓글 목록) / POST(댓글 작성)
│   │   ├── comments/report/route.ts # POST(댓글 신고)
│   │   ├── country/[code]/route.ts  # GET(World Bank + 환율 집계)
│   │   ├── polls/today/route.ts    # GET(오늘 질문 + 결과 + 내 투표)
│   │   └── polls/vote/route.ts     # POST(투표) / PATCH(이유 저장) / DELETE(취소)
│   ├── layout.tsx                  # 글로벌 레이아웃, 폰트, AdSense 메타
│   └── globals.css
├── components/
│   ├── WorldMap.tsx                # 3D 지구본 (D3 canvas 렌더링, 드래그/줌/이펙트)
│   ├── PollPanel.tsx               # 투표 결과 패널 (Top5, 공유)
│   ├── VoteReasonModal.tsx         # 투표 이유 입력 + 축하 화면
│   ├── CommentPanel.tsx            # 국가별 댓글 목록/작성/신고
│   ├── Calculator.tsx              # 환율 계산기 + 국가 비교 + 세계 랭킹
│   ├── DebtModal.tsx               # 국가 부채 실시간 시각화 (애니메이션 ticker)
│   ├── CountryInfoModal.tsx        # 국가 기본 정보 모달
│   ├── StarField.tsx               # 배경 별빛 애니메이션
│   └── ui/                         # shadcn/ui 컴포넌트
├── lib/
│   ├── supabase.ts                 # Supabase 클라이언트
│   ├── pollQuestions.ts            # 55개 일별 투표 질문 (UTC 날짜 기반 로테이션)
│   ├── mapConstants.ts             # 클릭 티어 정의(8단계), 글래스 스타일
│   ├── mapUtils.ts                 # 포맷팅, 색상, 티어 유틸
│   └── utils.ts
└── types/
    ├── poll.ts                     # 투표 관련 인터페이스
    └── map.ts                      # 지도 관련 인터페이스
```

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
- [x] 국가 컨텍스트 메뉴 (우클릭 → 정보/댓글/부채 조회)
- [x] 오늘의 나라 투표 (55개 질문 매일 자정 갱신, IP 기반 1일 1회)
- [x] 투표 이유 입력 + 축하 모달 (자동 닫힘 카운트다운)
- [x] 실시간 투표 결과 + 트위터/클립보드 공유
- [x] 투표 취소 기능
- [x] 국가별 댓글 시스템 (신고 3회 자동 숨김, URL 스팸 필터, 1일 1회 제한)
- [x] 국가 상세 정보 모달 (수도·인구·면적·언어·통화·시간대 등)
- [x] 국가 부채 시각화 (World Bank API — GDP·부채비율·금리 + 초당 부채 ticker)

### ✅ Phase 3 — 부가 기능 (완료)
- [x] 환율 계산기 (open.er-api.com 실시간)
- [x] 국가 비교 (2개국 나란히 비교)
- [x] 세계 랭킹 (인구/면적 Top 20, 지역 필터)
- [x] 애드센스 필수 페이지 (About, Privacy, Contact, Donate)
- [x] Google AdSense 연동
- [ ] IMF API 데이터 추가 (미구현 — 우선순위 낮음)

### 🔜 Phase 4 — 추후 논의
- [ ] 클릭 rate limit → Upstash Redis 전환 (현재 in-memory, 다중 인스턴스 간 공유 안 됨)
- [ ] Buy Me a Coffee 링크 실제 연결 (현재 placeholder)
- [ ] 로그인 기능 (미정)
- [ ] 결제 기능 (미정)

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

## 🔌 외부 API 상세

### REST Countries API
- **URL**: `https://restcountries.com/v3.1/all?fields=name,flags,population,region,subregion,capital,languages,cca2`
- **용도**: 국가 목록 카드, 계산기 국가 선택
- **문서**: https://restcountries.com

### World Bank API
- **URL**: `https://api.worldbank.org/v2/country/{code}/indicator/{indicator}?format=json&mrv=5`
- **사용 지표**:
  - `NY.GDP.MKTP.CD` — GDP (USD)
  - `GC.DOD.TOTL.GD.ZS` — 국가 부채 (% of GDP)
  - `FR.INR.RINR` — 실질 금리
- **캐싱**: 24시간

### Open Exchange Rates API
- **URL**: `https://open.er-api.com/v6/latest/USD`
- **용도**: 환율 계산기, 국가 부채 현지 통화 환산
- **캐싱**: 1시간

---

## 🗄️ Supabase 실제 스키마

### `country_views` — 전체 클릭수
```sql
country_code  text primary key     -- cca2 코드 (예: KR)
view_count    integer default 0
name          text                 -- 국가 한국어/영어명 캐시
updated_at    timestamp
```

### `country_daily_views` — 일별 클릭수
```sql
country_code  text not null
view_date     date not null
view_count    integer default 0
updated_at    timestamp
primary key (country_code, view_date)
```

### `country_comments` — 국가별 댓글
```sql
id            uuid primary key
country_code  text not null
content       text not null        -- 최대 50자, URL 금지
ip_hash       text not null        -- SHA-256 해시 (평문 저장 안 함)
created_at    timestamp
report_count  integer default 0
reported_by   text[]               -- 신고한 ip_hash 배열
is_hidden     boolean default false -- report_count >= 3 시 자동 숨김
```

### `poll_votes` — 오늘의 나라 투표
```sql
id            uuid primary key
poll_date     date not null
question_idx  integer not null
country_code  text not null        -- 투표한 나라
ip_hash       text not null        -- SHA-256 해시
reason        text                 -- 선택 이유 (최대 200자, 선택 입력)
created_at    timestamp
unique (poll_date, ip_hash)        -- 1일 1회 제한
```

### RPC 함수
| 함수명 | 파라미터 | 반환값 | 용도 |
|---|---|---|---|
| `increment_view_count` | `p_country_code, p_name` | `{total, today}` | 원자적 클릭 카운트 증가 |
| `get_poll_results` | `p_date` | `[{country_code, vote_count}]` | 일별 투표 집계 조회 |
| `cast_poll_vote` | `p_date, p_question_idx, p_country_code, p_ip_hash` | `{ok, reason?}` | 투표 원자적 삽입 (중복 방지) |

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
- 클릭 rate limit은 현재 **in-memory 저장** → Vercel 다중 인스턴스 환경에서 불안정, Upstash Redis 전환 예정 (Phase 4)
- 지구본 `draw()` 루프는 매 프레임 실행 — 불필요한 React 상태 업데이트 금지, ref 사용
