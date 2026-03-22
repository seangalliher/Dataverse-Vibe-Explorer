import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getDomainColors, type CDMDomain } from '@/utils/colors'
import { useAppStore } from '@/store/appStore'
import { livePositions } from './positionRegistry'

interface RelationshipBeamProps {
  sourcePosition: [number, number, number]
  targetPosition: [number, number, number]
  sourceDomain: CDMDomain
  type: 'one-to-many' | 'many-to-many'
  sourceTableId: string
  targetTableId: string
}

export function RelationshipBeam({
  sourcePosition,
  targetPosition,
  sourceDomain,
  type,
  sourceTableId,
  targetTableId,
}: RelationshipBeamProps) {
  const lineRef = useRef<THREE.Mesh>(null!)
  const colors = getDomainColors(sourceDomain)

  // Build initial curved tube between source and target
  const curveRef = useRef((() => {
    const start = new THREE.Vector3(...sourcePosition)
    const end = new THREE.Vector3(...targetPosition)
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5)
    mid.y += start.distanceTo(end) * 0.2
    return new THREE.QuadraticBezierCurve3(start, mid, end)
  })())

  // Track last known positions to avoid unnecessary geometry rebuilds
  const lastSrcPos = useRef(new THREE.Vector3(...sourcePosition))
  const lastTgtPos = useRef(new THREE.Vector3(...targetPosition))

  const tubeRadius = type === 'many-to-many' ? 0.04 : 0.025

  // Reusable Vector3 for midpoint calculation (avoids per-frame allocation)
  const midVec = useRef(new THREE.Vector3())

  useFrame(({ clock }) => {
    if (!lineRef.current) return
    const mat = lineRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = clock.getElapsedTime()

    // Read highlight state imperatively (avoids re-rendering all beams on hover)
    const store = useAppStore.getState()
    const isHighlighted =
      store.selectedTableId === sourceTableId ||
      store.selectedTableId === targetTableId ||
      store.hoveredTableId === sourceTableId ||
      store.hoveredTableId === targetTableId
    mat.uniforms.uHighlight.value = isHighlighted ? 1.0 : 0.0

    // Read live positions from the registry for animated transitions
    const liveSrc = livePositions.get(sourceTableId)
    const liveTgt = livePositions.get(targetTableId)
    if (!liveSrc || !liveTgt) return

    // Only rebuild geometry if positions have moved significantly
    const srcDist = lastSrcPos.current.distanceToSquared(liveSrc)
    const tgtDist = lastTgtPos.current.distanceToSquared(liveTgt)
    if (srcDist > 0.25 || tgtDist > 0.25) {
      lastSrcPos.current.copy(liveSrc)
      lastTgtPos.current.copy(liveTgt)

      // Reuse existing curve object — update control points in place
      const curve = curveRef.current
      curve.v0.copy(liveSrc)
      curve.v2.copy(liveTgt)
      midVec.current.lerpVectors(liveSrc, liveTgt, 0.5)
      midVec.current.y += liveSrc.distanceTo(liveTgt) * 0.2
      curve.v1.copy(midVec.current)

      // Replace tube geometry
      const oldGeom = lineRef.current.geometry
      lineRef.current.geometry = new THREE.TubeGeometry(curve, 32, tubeRadius, 6, false)
      oldGeom.dispose()
    }
  })

  const initialGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curveRef.current, 32, tubeRadius, 6, false)
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: colors.three.clone() },
      uHighlight: { value: 0 },
    }),
    [sourceDomain],
  )

  return (
    <mesh ref={lineRef} geometry={initialGeometry}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uHighlight;
          varying vec2 vUv;

          void main() {
            // Energy flow animation along the beam
            float flow = fract(vUv.x * 3.0 - uTime * 0.8);
            flow = smoothstep(0.0, 0.3, flow) * smoothstep(1.0, 0.7, flow);

            // Base opacity with highlight
            float baseAlpha = mix(0.15, 0.6, uHighlight);
            float alpha = baseAlpha + flow * mix(0.2, 0.5, uHighlight);

            // Edge fade for tube cross-section
            float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
            alpha *= smoothstep(0.0, 0.3, edge);

            vec3 color = uColor * (1.0 + flow * 0.5);
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  )
}
