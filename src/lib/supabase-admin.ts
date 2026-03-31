import { createClient } from '@supabase/supabase-js'

// 서버 전용 — API 라우트(src/app/api/)에서만 import.
// 클라이언트 컴포넌트에 절대 사용 금지.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)
