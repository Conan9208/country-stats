import { createClient } from '@supabase/supabase-js'

// 서버 전용 — API 라우트(src/app/api/)에서만 import.
// 클라이언트 컴포넌트에 절대 사용 금지.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) {
  console.error('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다! RLS 오류가 발생할 수 있습니다.')
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  serviceRoleKey || 'placeholder'
)
