import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STAR_COUNT = 3000

export function Skybox() {
  const starsRef = useRef<THREE.Points>(null!)

  const { positions, opacities, sizes } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const opacities = new Float32Array(STAR_COUNT)
    const sizes = new Float32Array(STAR_COUNT)

    for (let i = 0; i < STAR_COUNT; i++) {
      // Distribute on a large sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 400 + Math.random() * 200

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      opacities[i] = 0.3 + Math.random() * 0.7
      sizes[i] = 0.5 + Math.random() * 1.5
    }
    return { positions, opacities, sizes }
  }, [])

  // Twinkle animation
  useFrame(({ clock }) => {
    const geo = starsRef.current?.geometry
    if (!geo) return
    const opAttr = geo.getAttribute('opacity') as THREE.BufferAttribute
    const arr = opAttr.array as Float32Array
    const t = clock.getElapsedTime()

    for (let i = 0; i < STAR_COUNT; i++) {
      arr[i] = opacities[i] * (0.6 + 0.4 * Math.sin(t * (0.5 + i * 0.002) + i))
    }
    opAttr.needsUpdate = true
  })

  return (
    <>
      {/* Background color gradient — deep indigo to black */}
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 200, 600]} />

      {/* Hemisphere light for subtle ambient */}
      <hemisphereLight args={['#1a1a4e', '#000000', 0.3]} />

      {/* Star field */}
      <points ref={starsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-opacity"
            args={[new Float32Array(STAR_COUNT).fill(1), 1]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[sizes, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={`
            attribute float opacity;
            attribute float size;
            varying float vOpacity;
            void main() {
              vOpacity = opacity;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * (200.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            varying float vOpacity;
            void main() {
              float d = length(gl_PointCoord - vec2(0.5));
              if (d > 0.5) discard;
              float alpha = smoothstep(0.5, 0.0, d) * vOpacity;
              gl_FragColor = vec4(0.85, 0.9, 1.0, alpha);
            }
          `}
        />
      </points>

      {/* Faint nebula glow — a large translucent sphere with gradient */}
      <mesh rotation={[0.3, 0.8, 0]}>
        <sphereGeometry args={[350, 32, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          vertexShader={`
            varying vec3 vWorldPosition;
            void main() {
              vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vWorldPosition;
            void main() {
              float y = normalize(vWorldPosition).y;
              // Horizon glow
              float horizonGlow = exp(-abs(y) * 8.0) * 0.12;
              vec3 col = mix(
                vec3(0.05, 0.0, 0.15),
                vec3(0.0, 0.3, 0.4),
                horizonGlow
              );
              gl_FragColor = vec4(col, horizonGlow);
            }
          `}
        />
      </mesh>
    </>
  )
}
