import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 만료된 refresh token이 localStorage에 남아 있으면 자동으로 제거
if (typeof window !== 'undefined') {
  supabase.auth.getSession().then(({ error }) => {
    if (error) supabase.auth.signOut()
  })
}
