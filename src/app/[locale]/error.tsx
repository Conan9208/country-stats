'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090b',
        color: '#fff',
        fontFamily: 'var(--font-geist-sans), sans-serif',
        gap: '1.5rem',
        padding: '2rem',
      }}
    >
      <div style={{ fontSize: '3rem' }}>🌍</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
        문제가 발생했어요
      </h1>
      <p style={{ color: '#a1a1aa', margin: 0, textAlign: 'center', maxWidth: 360 }}>
        일시적인 오류입니다. 다시 시도하거나 잠시 후 돌아와 주세요.
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: '0.5rem',
          padding: '0.6rem 1.6rem',
          borderRadius: '0.5rem',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.95rem',
        }}
      >
        다시 시도
      </button>
    </div>
  )
}
