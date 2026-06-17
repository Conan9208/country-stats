'use client'

import { useEffect, useState, memo } from 'react'
import Particles from '@tsparticles/react'
import { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { ISourceOptions } from '@tsparticles/engine'

const starOptions: ISourceOptions = {
  background: { color: { value: '#050a10' } },
  fpsLimit: 60,
  particles: {
    // density.enable:true 였을 때 4K처럼 큰 화면에서 입자 수가 면적 비례로 폭증했음 →
    // 고정 개수로 캡. opacity 애니메이션을 끄면 매 프레임 리드로우가 사라져 거의 정적(0 비용)이 됨.
    number: { value: 800, density: { enable: false } },
    color: { value: ['#ffffff', '#cce0ff', '#ffeedd', '#e0ccff'] },
    opacity: {
      value: { min: 0.15, max: 0.9 },
    },
    size: {
      value: { min: 0.2, max: 2.2 },
    },
    move: { enable: false },
    shape: { type: 'circle' },
  },
  // 4K에서 retina(×2~×4 픽셀) 렌더 비용 제거 — 정적 배경이라 선명도 손실 체감 작음
  detectRetina: false,
}

function StarField() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setReady(true))
  }, [])

  if (!ready) return null

  return (
    <Particles
      id="starfield"
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      options={starOptions}
    />
  )
}

export default memo(StarField)
