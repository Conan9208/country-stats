import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Rate limit: IP 기반 1일 1회 (in-memory)
const rateLimitMap = new Map<string, number>()

function getMaxChars(tier: string, amount?: number): number {
  if (tier === 'coffee') return 100
  if (tier === 'lunch') return 1000
  // free tier
  const n = Number(amount) || 0
  if (n < 3)   return 50
  if (n < 10)  return 100
  if (n < 30)  return 1000
  return Math.min(5000, Math.floor(n * 100))
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Rate limit 체크
  const lastSent = rateLimitMap.get(ip)
  const now = Date.now()
  if (lastSent && now - lastSent < 86_400_000) {
    return NextResponse.json({ error: '하루에 한 번만 메시지를 보낼 수 있어요.' }, { status: 429 })
  }

  let body: { tier: string; amount?: number; senderName?: string; message: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { tier, amount, senderName, message } = body

  if (!tier || !message?.trim()) {
    return NextResponse.json({ error: '티어와 메시지를 입력해주세요.' }, { status: 400 })
  }

  const maxChars = getMaxChars(tier, amount)
  if (message.length > maxChars) {
    return NextResponse.json({ error: `메시지가 너무 깁니다. (최대 ${maxChars}자)` }, { status: 400 })
  }

  const tierLabel =
    tier === 'coffee' ? '☕ Coffee $3' :
    tier === 'lunch'  ? '🍜 Lunch $10' :
    `💸 Free $${amount ?? '?'}`

  const from = senderName?.trim() || '익명'

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    await resend.emails.send({
      from: 'WorldStats <onboarding@resend.dev>',
      to: 'whitecw0820@gmail.com',
      subject: `💌 WorldStats 기부 메시지 — ${tierLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #09090b; color: #f1f5f9; border-radius: 12px;">
          <h2 style="color: #a78bfa; margin-top: 0;">💌 새 메시지가 도착했어요!</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; width: 100px;">보낸 사람</td>
              <td style="padding: 8px 0; font-weight: 600;">${from}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">기부 티어</td>
              <td style="padding: 8px 0; font-weight: 600;">${tierLabel}</td>
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
