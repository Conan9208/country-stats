import Link from 'next/link'

export default function NotFound() {
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
      <div style={{ fontSize: '3rem' }}>🌐</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
        페이지를 찾을 수 없어요
      </h1>
      <p style={{ color: '#a1a1aa', margin: 0, textAlign: 'center', maxWidth: 360 }}>
        주소가 잘못됐거나 삭제된 페이지입니다.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '0.5rem',
          padding: '0.6rem 1.6rem',
          borderRadius: '0.5rem',
          background: '#7c3aed',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
        }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
