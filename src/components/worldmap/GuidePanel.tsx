'use client'
import type { ReactNode } from 'react'
import { Heart, Search } from 'lucide-react'

type TranslateFn = (key: string) => string

type Props = {
  pollMode?: boolean
  isMobile: boolean
  t: TranslateFn
}

export function GuidePanel({ pollMode, isMobile, t }: Props) {
  return (
    <div
      className="glass-panel"
      style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, borderRadius: 12, padding: '8px 12px', lineHeight: 1.35 }}
    >
      {pollMode ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="animate-pulse"
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', whiteSpace: 'nowrap' }}>
            {t('pollModeGuide')}
          </span>
        </div>
      ) : isMobile ? (
        <>
          <GuideRow icon={<Heart size={10} />} label={t('guideTap')} desc={t('guideTapDesc')} accentColor="#34d399" />
          <GuideRow icon={<Search size={10} />} label={t('guideLongPress')} desc={t('guideLongPressDesc')} accentColor="#a78bfa" topGap />
          <GuideFooter text={t('guideDragMobile')} />
        </>
      ) : (
        <>
          <GuideRow icon={<Heart size={10} />} label={t('guideLeftClick')} desc={t('guideLeftClickDesc')} accentColor="#34d399" />
          <GuideRow icon={<Search size={10} />} label={t('guideRightClick')} desc={t('guideRightClickDesc')} accentColor="#a78bfa" topGap />
          <GuideFooter text={t('guideDrag')} />
        </>
      )}
    </div>
  )
}

function GuideRow({
  icon,
  label,
  desc,
  accentColor,
  topGap,
}: {
  icon: ReactNode
  label: string
  desc: string
  accentColor: string
  topGap?: boolean
}) {
  return (
    <div style={{ fontSize: 11, color: '#f1f5f9', marginTop: topGap ? 3 : 0, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
      <span style={{ color: accentColor, fontFamily: "'Montserrat', sans-serif", fontWeight: 700, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 3 }}>
        {icon} {label}
      </span>
      <span style={{ color: '#64748b', fontFamily: "'Montserrat', sans-serif" }}>—</span>
      <span style={{ color: '#cbd5e1', fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif", fontWeight: 500 }}>{desc}</span>
    </div>
  )
}

function GuideFooter({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 9, color: '#334155', marginTop: 5, fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif", letterSpacing: '0.03em' }}>
      {text}
    </div>
  )
}
