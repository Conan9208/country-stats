'use client'

type Props = {
  /** 좁은 화면(<640px)이면 하단, 아니면 상단(탭 아래)에 배치 */
  isMobileUI: boolean
  title: string
  body: string
}

// 홍보 모드 진입 시 5초간 떴다 사라지는 온보딩 안내.
// 표시/제거 타이밍은 부모(WorldMap)가 mount/unmount로 제어하고, 페이드 인·아웃은 CSS 애니메이션이 자체 완결.
export function PromoteHintToast({ isMobileUI, title, body }: Props) {
  return (
    <div className={`promote-hint ${isMobileUI ? 'promote-hint--bottom' : 'promote-hint--top'}`} aria-live="polite">
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fcd34d', marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.45 }}>{body}</div>
    </div>
  )
}
