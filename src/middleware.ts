import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: [
    // API 라우트, Next.js 내부 경로, 정적 파일 제외
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
}
