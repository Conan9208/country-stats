'use client'

import { useEffect, useState } from 'react'
import Particles from '@tsparticles/react'
import { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'

export default function StarField() {
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
      options={{
        background: { color: { value: '#050a10' } },
        fpsLimit: 60,
        particles: {
          number: { value: 3000, density: { enable: true } },
          color: { value: ['#ffffff', '#cce0ff', '#ffeedd', '#e0ccff'] },
          opacity: {
            value: { min: 0.1, max: 0.9 },
            animation: { enable: true, speed: 0.4, sync: false },
          },
          size: {
            value: { min: 0.2, max: 2.2 },
          },
          move: { enable: false },
          shape: { type: 'circle' },
        },
        detectRetina: true,
      }}
    />
  )
}
