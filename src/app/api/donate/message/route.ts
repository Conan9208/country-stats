import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Rate limit: IP 기반 1일 1회 (in-memory)
const rateLimitMap = new Map<string, number>()

const MAX_CHARS = 500

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Rate limit 체크
  const lastSent = rateLimitMap.get(ip)
  const now = Date.now()
  if (lastSent && now - lastSent < 86_400_000) {
    return NextResponse.json({ error: '하루에 한 번만 메시지를 보낼 수 있어요.' }, { status: 429 })
  }

  // 만료된 항목 정리 (메모리 누수 방지)
  for (const [k, t] of rateLimitMap) {
    if (now - t > 86_400_000) rateLimitMap.delete(k)
  }

  let body: { senderName?: string; message: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { senderName, message } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
  }

  if (message.length > MAX_CHARS) {
    return NextResponse.json({ error: `메시지가 너무 깁니다. (최대 ${MAX_CHARS}자)` }, { status: 400 })
  }

  const rawFrom = senderName?.trim() || '익명'
  const from = rawFrom.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    await resend.emails.send({
      from: 'PostMyGlobe <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL ?? '',
      subject: `💌 PostMyGlobe 메시지`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #09090b; color: #f1f5f9; border-radius: 12px;">
          <h2 style="color: #a78bfa; margin-top: 0;">💌 새 메시지가 도착했어요!</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; width: 100px;">보낸 사람</td>
              <td style="padding: 8px 0; font-weight: 600;">${from}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">발송 시각</td>
              <td style="padding: 8px 0;">${new Date().toUTCString()}</td>
            </tr>
          </table>
          <div style="background: #18181b; border-radius: 8px; padding: 20px; border: 1px solid #27272a;">
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.7;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('Resend error:', err)
    return NextResponse.json({ error: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }

  rateLimitMap.set(ip, now)
  return NextResponse.json({ ok: true })
}
