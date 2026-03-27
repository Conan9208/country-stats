# 🌍 WorldStats — CLAUDE.md

> 이 파일은 Claude Code for VS Code가 프로젝트 맥락을 이해하기 위한 가이드입니다.
> 코드 작성 전 반드시 이 파일을 참고하세요.

---

## 📌 프로젝트 개요

- **프로젝트명**: WorldStats
- **설명**: 글로벌 국가 비교 및 통계 정보 사이트
- **목적**: 연습용 + 실제 배포 목표
- **GitHub**: https://github.com/Conan9208/country-stats

---

## 🛠️ 기술 스택

| 항목 | 기술 |
|---|---|
| 호스팅 | Vercel |
| 프론트엔드 | Next.js (App Router) + TypeScript |
| 스타일링 | Tailwind CSS + shadcn/ui (Nova 프리셋, Radix 기반) |
| DB | Supabase (실시간 기능 사용) |
| 외부 API | REST Countries → World Bank API → IMF API (단계적 추가) |
| 저장소 | GitHub |
| 개발 AI | Claude |

---

## 🗂️ 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 메인 (국가 목록)
│   ├── countries/
│   │   └── [code]/
│   │       └── page.tsx      # 국가 상세 페이지
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                   # shadcn/ui 컴포넌트
│   ├── CountryCard.tsx       # 국가 카드 컴포넌트
│   ├── SearchFilter.tsx      # 검색 + 필터
│   └── Header.tsx            # 공통 헤더
├── lib/
│   ├── supabase.ts           # Supabase 클라이언트
│   └── utils.ts
└── types/
    └── country.ts            # 타입 정의
```

---

## 📋 구현 기능 로드맵

### ✅ Phase 1 — 기초 뼈대 (진행 중)
- [x] Next.js 프로젝트 생성
- [x] Tailwind CSS + shadcn/ui 설치
- [ ] REST Countries API로 국가 목록/기본정보 표시
- [ ] 국가 카드 UI 구현
- [ ] 검색 + 지역 필터 기능
- [ ] Vercel 배포 연동
- [ ] Supabase 프로젝트 생성 + 테이블 설계

### 🔜 Phase 2 — 핵심 기능
- [ ] 국가 상세 페이지 (World Bank API 연동)
- [ ] 나라별 클릭수 카운트 (Supabase 실시간)
- [ ] 나라별 투표 기능 (Supabase 실시간)

### 🔜 Phase 3 — 부가 기능
- [ ] 경제 관련 계산기
- [ ] 추가요청 게시판
- [ ] IMF API 데이터 추가

### 🔒 Phase 4 — 추후 논의
- [ ] 로그인 기능
- [ ] 결제 기능

---

## 🎨 디자인 가이드

- **테마**: 다크 모드 기반 (`bg-zinc-950`)
- **컬러**: zinc 계열 + white 포인트
- **폰트**: Geist (shadcn Nova 프리셋 기본)
- **카드**: 국기 이미지 상단, 국가 정보 하단
- **인터랙션**: hover 시 scale + border 변화
- **레이아웃**: 반응형 그리드 (1→2→3→4 컬럼)

---

## 🔌 외부 API

### REST Countries API
- **URL**: `https://restcountries.com/v3.1/all`
- **사용 필드**: `name, flags, population, region, subregion, capital, languages, cca2`
- **문서**: https://restcountries.com

### World Bank API (Phase 2)
- **URL**: `https://api.worldbank.org/v2/country/{code}/indicator/{indicator}`
- **주요 지표**: GDP, 부채비율, 경제성장률, 취업률

### IMF API (Phase 3)
- 추후 추가 예정

---

## 🗄️ Supabase 테이블 설계 (Phase 2)

### `country_views` — 클릭수 카운트
```sql
id          uuid primary key
country_code  text not null        -- cca2 코드 (예: KR)
view_count    integer default 0
updated_at    timestamp
```

### `country_votes` — 투표
```sql
id            uuid primary key
country_code  text not null
category      text not null        -- 예: 'best_food', 'travel', 'kpop'
vote_count    integer default 0
updated_at    timestamp
```

---

## ⚙️ 개발 환경

- **OS**: macOS
- **에디터**: VSCode
- **Node.js**: v25.2.1
- **패키지 매니저**: npm
- **로컬 주소**: http://localhost:3000

---

## 📝 코딩 컨벤션

- **언어**: TypeScript 사용 (any 타입 지양)
- **컴포넌트**: 함수형 컴포넌트 + React Hooks
- **스타일**: Tailwind CSS 클래스 사용 (인라인 style 지양)
- **API 호출**: 서버 컴포넌트 or `useEffect` 클라이언트 fetch
- **타입**: `types/country.ts`에 인터페이스 정의
- **파일명**: PascalCase (컴포넌트), camelCase (유틸)

---

## 🚨 주의사항

- Supabase KEY는 반드시 `.env.local`에 보관 (절대 커밋 금지)
- `.env.local`은 `.gitignore`에 포함되어 있는지 확인
- 이미지 최적화: Next.js `<Image>` 컴포넌트 사용 권장
- 국기 이미지는 REST Countries SVG URL 그대로 사용