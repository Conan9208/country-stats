'use client'

import dynamic from 'next/dynamic'

const HomeClientPage = dynamic(() => import('./HomeClient'), {
  ssr: false,
  loading: () => <div className="h-dvh bg-zinc-950" />,
})

export default function HomeClientWrapper() {
  return <HomeClientPage />
}
