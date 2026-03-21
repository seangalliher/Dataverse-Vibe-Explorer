import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getDomainColors, type CDMDomain } from '@/utils/colors'
import { useAppStore } from '@/store/appStore'

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
  const { selectedTableId, hoveredTableId } = useAppStore()
  const colors = getDomainColors(sourceDomain)

  const isHighlighted =
    selectedTableId === sourceTableId ||
    selectedTableId === targetTableId ||
    hoveredTableId === sourceTableId ||
    hoveredTableId === targetTableId

  // Build a curved tube between source and target
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...sourcePosition)
    const end = new THREE.Vector3(...targetPosition)
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5)
    // Arc upward at the midpoint
    const dist = start.distanceTo(end)
    mid.y += dist * 0.2

    return new THREE.QuadraticBezierCurve3(start, mid, end)
  }, [sourcePosition, targetPosition])

  const tubeRadius = type === 'many-to-many' ? 0.04 : 0.025

  useFrame(({ clock }) => {
    if (!lineRef.current) return
    const mat = lineRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = clock.getElapsedTime()
    mat.uniforms.uHighlight.value = isHighlighted ? 1.0 : 0.0
  })

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: colors.three.clone() },
      uHighlight: { value: 0 },
    }),
    [colors],
  )

  return (
    <mesh ref={lineRef}>
      <tubeGeometry args={[curve, 32, tubeRadius, 6, false]} />
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
