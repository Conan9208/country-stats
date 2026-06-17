'use client'

type Props = {
  quizMode: boolean
  promoteMode: boolean
  isSpinning: boolean
  onToggleQuizMode: () => void
  onTogglePromoteMode: () => void
  onRandomSpin: () => void
  labels: {
    quizButton: string
    exitQuiz: string
    promoteButton: string
    exitPromote: string
    spinning: string
    quizSpin: string
    randomSpin: string
  }
}

export function GlobeBottomControls({
  quizMode,
  promoteMode,
  isSpinning,
  onToggleQuizMode,
  onTogglePromoteMode,
  onRandomSpin,
  labels,
}: Props) {
  return (
    <>
      {/* 홍보 모드 진입 — 수익 동선이라 앰버 강조로 도드라지게 */}
      <button
        onClick={onTogglePromoteMode}
        className="glass-panel globe-overlay-btn"
        style={{
          borderRadius: 12,
          padding: '8px 16px',
          border: `1px solid ${promoteMode ? 'rgba(251,191,36,0.7)' : 'rgba(251,191,36,0.4)'}`,
          color: promoteMode ? '#fcd34d' : '#fbbf24',
          fontSize: 13,
          fontWeight: 600,
          background: promoteMode ? 'rgba(251,191,36,0.18)' : 'rgba(251,191,36,0.1)',
        }}
      >
        {promoteMode ? labels.exitPromote : labels.promoteButton}
      </button>
      <button
        onClick={onToggleQuizMode}
        className="glass-panel globe-overlay-btn"
        style={{
          borderRadius: 12,
          padding: '8px 16px',
          border: `1px solid ${quizMode ? 'rgba(167,139,250,0.6)' : 'rgba(167,139,250,0.35)'}`,
          color: quizMode ? '#c4b5fd' : '#a78bfa',
          fontSize: 13,
          fontWeight: 600,
          background: quizMode ? 'rgba(167,139,250,0.15)' : 'rgba(167,139,250,0.08)',
        }}
      >
        {quizMode ? labels.exitQuiz : labels.quizButton}
      </button>
      <button
        onClick={onRandomSpin}
        disabled={isSpinning}
        className="glass-panel globe-overlay-btn"
        style={{
          borderRadius: 12,
          padding: '8px 16px',
          border: `1px solid ${isSpinning ? 'rgba(255,255,255,0.07)' : 'rgba(167,139,250,0.35)'}`,
          color: isSpinning ? '#475569' : '#a78bfa',
          fontSize: 13,
          fontWeight: 600,
          background: isSpinning ? 'rgba(15,15,25,0.55)' : 'rgba(167,139,250,0.08)',
        }}
      >
        {isSpinning ? labels.spinning : quizMode ? labels.quizSpin : labels.randomSpin}
      </button>
    </>
  )
}
