'use client'

type Props = {
  quizMode: boolean
  isSpinning: boolean
  onToggleQuizMode: () => void
  onRandomSpin: () => void
  labels: {
    quizButton: string
    exitQuiz: string
    spinning: string
    quizSpin: string
    randomSpin: string
  }
}

export function GlobeBottomControls({ quizMode, isSpinning, onToggleQuizMode, onRandomSpin, labels }: Props) {
  return (
    <>
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
