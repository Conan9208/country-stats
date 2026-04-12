# WorldStats 런치 전 감사 보고서

> 생성일: 2026-04-12  
> 감사 범위: 전체 컴포넌트, API 라우트, 번역 파일  
> 목적: 도메인 등록 전 사용자 경험 저해 요소 식별

---

## 🔴 크리티컬 — 반드시 수정

### [1] CommentPanel — 네트워크 에러 처리 전무
**파일:** `src/components/CommentPanel.tsx` 줄 49, 77, 93

fetch가 3곳 모두 try-catch 없이 호출됨. 사용자 네트워크가 불안정하거나
서버 오류 발생 시 JavaScript 에러로 컴포넌트 전체가 멈춤.

**현재 코드:**
```ts
// 줄 49-50
const res  = await fetch(`/api/comments?country=${countryCode}&page=${p}`)
const data = await res.json()  // 네트워크 오류면 여기서 crash

// 줄 77-82 (댓글 작성)
const res = await fetch('/api/comments', { method: 'POST', ... })
const data = await res.json()  // crash 가능

// 줄 93-98 (신고)
const res = await fetch('/api/comments/report', { method: 'POST', ... })
const data = await res.json()  // crash 가능
```

**사용자 경험:** 댓글 패널이 "로딩 중"에서 멈추거나, 댓글 등록/신고 버튼 클릭 후 무반응.

**수정 방법:** 세 함수 모두 try-catch 추가, catch에서 `showNotice(t('error'), false)`.

---

## 🟡 권장 — 수정하면 완성도가 크게 오름

### [2] CommentPanel — '신고했어요' 한글 하드코딩
**파일:** `src/components/CommentPanel.tsx` 줄 105

```ts
showNotice('신고했어요', true)  // 한글 직접 입력
```

messages에 이미 `"reported": "신고됨"` / `"Reported"` 키가 있는데 사용 안 함.
영어 설정 사용자에게 한글이 뜸.

**수정:** `showNotice(t('reported'), true)`

---

### [3] CommentFeed — 피드 로드 실패 시 빈 화면
**파일:** `src/components/CommentFeed.tsx` 줄 39-44

```ts
fetch('/api/comments/feed?limit=50')
  .then(r => r.json())
  .then(d => { setComments(d.comments ?? []); setLoading(false) })
  // .catch() 없음 → 오류 시 로딩 스피너가 영원히 돌아감
```

**사용자 경험:** 피드 탭을 눌렀을 때 스피너가 멈추지 않음.

**수정:** `.catch(() => setLoading(false))` 추가.

---

### [4] 핀 등록 — DNS 조회에 타임아웃 없음
**파일:** `src/app/api/pins/route.ts` 줄 60-69

```ts
async function checkDomainExists(url: string): Promise<boolean> {
  try {
    const { hostname } = new URL(url)
    await dnsLookup(hostname)  // 타임아웃 없음 — 최대 30초 대기 가능
    return true
  } catch { return false }
}
```

Safe Browsing API는 3초 타임아웃이 있지만 DNS 조회는 없음.
느린 DNS 응답 시 핀 등록 폼이 "등록 중..." 상태로 최대 30초 멈춤 (Vercel timeout).

**수정:** `Promise.race([dnsLookup(hostname), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3000))])`

---

### [5] Donate 이메일 — senderName XSS 미처리
**파일:** `src/app/api/donate/message/route.ts` 줄 56

```ts
// message는 이스케이프됨 ✓
${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}

// senderName은 이스케이프 안 함 ❌
<td style="...">${from}</td>  // from = senderName
```

관리자 이메일 클라이언트에서 senderName에 HTML 태그가 렌더링될 수 있음.
(일반 사용자에게는 영향 없음. 관리자 이메일만 영향받음)

**수정:** `const escapedFrom = from.replace(/</g, '&lt;').replace(/>/g, '&gt;')` 후 사용.

---

### [6] 댓글 URL 필터 — 일부 우회 가능
**파일:** `src/app/api/comments/route.ts` 줄 62-64

```ts
if (/https?:\/\/|www\./i.test(content)) { ... }
```

`http://`, `https://`, `www.` 만 차단. 우회 가능한 패턴:
- `bit.ly/abcd` (단축 URL, www 없음)
- `google.com` (프로토콜 없음)
- `ftp://` 등 다른 프로토콜

현재 핀 시스템에는 단축 URL 차단 등 정교한 필터가 있지만 댓글은 단순함.

**수정 (선택):** 마침표(`.`) 기반으로 도메인 패턴 추가 탐지,
또는 현재 수준 유지 (댓글은 180자 제한이라 링크 홍보 공간이 적음).

---

### [7] 관리자 페이지 — 신고된 콘텐츠 숨기기 불편
**파일:** `src/app/api/admin/reports/route.ts`

`GET /api/admin/reports` 는 신고된 댓글/핀 목록 조회만 가능.
숨기기/삭제는 별도 API(`DELETE /api/admin/comments/[id]`, `DELETE /api/admin/pins/[id]`)가 있지만
관리자 UI에서 이것들이 연결되어 있는지 확인 필요.

**확인 사항:** `src/app/[locale]/admin/page.tsx`에서 신고 목록 → 숨기기 버튼 흐름이 동작하는지.

---

### [8] Rate limit — Vercel 다중 인스턴스 불안정
**파일:** `src/app/api/clicks/route.ts` 줄 7-17

```ts
const rateLimitMap = new Map<string, number[]>()  // 서버 메모리에 저장
```

Vercel은 요청마다 다른 serverless 인스턴스가 처리할 수 있어서,
같은 IP가 다른 인스턴스로 요청하면 rate limit을 우회 가능.
댓글 rate limit도 동일 방식.

**영향:** 초기 트래픽이 적을 땐 괜찮지만 유입이 생기면 클릭 어뷰징 가능.

**수정 (선택):** Upstash Redis로 교체 (CLAUDE.md에 이미 TODO로 기록됨).
지금 당장은 OK, 트래픽 생기기 전에 전환 권장.

---

## 🟢 마이너 — 선택 사항

### [9] og:image 파일 없음
**경로:** `public/og-image.png`

코드에서 `/og-image.png`를 참조하도록 설정했지만 실제 파일이 없음.
SNS 공유 시 이미지 없이 텍스트만 표시됨.

**수정:** 지구본 화면 스크린샷을 1200×630으로 잘라 `public/og-image.png`에 저장.

---

### [10] 도메인 URL 미설정
**파일:** `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/[locale]/layout.tsx`

현재 `worldstats.cc`로 임시 설정. 실제 구매 도메인으로 변경 필요.

---

### [11] WorldMap — 소규모 국가 클릭 히트박스
**파일:** `src/components/WorldMap.tsx` 줄 712

Canvas `isPointInPath` 기반 hit detection 사용.
몰타, 룩셈부르크, 싱가포르 같은 작은 나라는 클릭하기 매우 어려움.
(실제 테스트 전까지는 얼마나 심각한지 불명확)

---

### [12] 핀 등록 — country_alpha2 형식 미검증
**파일:** `src/app/api/pins/route.ts`

```ts
if (!country_alpha2 || !business_name?.trim()) { ... }
```

`country_alpha2` 값 형식 검증 없음. 예: `"XYZABC"` 같은 잘못된 코드 저장 가능.
저장되면 나중에 지구본 렌더링 시 예상치 못한 동작 가능.

**수정:** `/^[A-Z]{2}$/.test(country_alpha2)` 검증 추가.

---

## ✅ 확인된 정상 항목

| 항목 | 상태 |
|------|------|
| comments API 에러 응답 형식 | ✓ 모두 `{ error: "..." }` 통일 |
| 댓글 `is_hidden` 필터 | ✓ 목록 조회 / 피드 모두 적용됨 |
| ko.json ↔ en.json 번역 키 | ✓ 100% 일치 |
| 핀 등록 URL 검증 | ✓ 5단계 (형식 → 단축URL → DNS → Safe Browsing → 중복) |
| 댓글 중복 방지 (1일 1회) | ✓ IP 해시 기반, DB 저장 |
| 신고 3회 자동 숨김 | ✓ `is_hidden` 자동 처리 |
| 스핀 후 팩트 카드 | ✓ 완전 구현됨 |
| AdSense 스크립트 | ✓ layout.tsx에 추가됨 |
| ads.txt | ✓ public/ads.txt 생성됨 |
| sitemap.ts / robots.ts | ✓ 생성됨 |
| error.tsx / not-found.tsx | ✓ 생성됨 |
| SiteHeader (탭 바 유지) | ✓ About/Privacy/Contact/Donate 적용됨 |

---

## 우선순위 요약

| 순위 | 항목 | 난이도 | 영향 |
|------|------|--------|------|
| 1 | [1] CommentPanel try-catch | 쉬움 | 크래시 방지 |
| 2 | [2] 신고 메시지 번역 | 매우 쉬움 | i18n |
| 3 | [3] CommentFeed .catch() | 매우 쉬움 | UX |
| 4 | [5] senderName 이스케이프 | 쉬움 | 보안 |
| 5 | [4] DNS 타임아웃 | 쉬움 | 성능 |
| 6 | [9] og:image 생성 | 중간 | 소셜 공유 |
| 7 | [10] 도메인 URL 교체 | 매우 쉬움 | SEO |
| 8 | [8] Rate limit Redis | 어려움 | 장기 안정성 |
