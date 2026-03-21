import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { AppMetadata } from '@/data/metadata'
import type { TableNode } from '@/store/appStore'
import { getDomainColors, type CDMDomain } from '@/utils/colors'
import { getDomainBlockCenter } from '@/data/sceneGraph'

const SOLUTION_DOMAIN_MAP: Record<string, CDMDomain> = {
  Sales: 'Sales',
  Service: 'Service',
  Marketing: 'Marketing',
  System: 'Core',
  'Custom Projects': 'Custom',
}

interface AppPortalProps {
  app: AppMetadata
  index: number
  tableMap: Map<string, TableNode>
}

/**
 * Determine which domain an app belongs to by looking at its associated
 * tables (majority vote) or falling back to its solution name.
 */
function resolveAppDomain(app: AppMetadata, tableMap: Map<string, TableNode>): CDMDomain {
  // Count domains of associated tables
  const domainVotes = new Map<CDMDomain, number>()
  for (const id of app.associatedTables) {
    const t = tableMap.get(id)
    if (t) domainVotes.set(t.domain, (domainVotes.get(t.domain) ?? 0) + 1)
  }
  // Pick the domain with the most associated tables
  let best: CDMDomain | null = null
  let bestCount = 0
  for (const [d, count] of domainVotes) {
    if (count > bestCount) { best = d; bestCount = count }
  }
  if (best) return best

  // Fallback: match solution name
  const byName = SOLUTION_DOMAIN_MAP[app.solutionName]
  if (byName) return byName

  // Try partial match on solution name or app name
  const text = `${app.solutionName} ${app.displayName} ${app.name}`.toLowerCase()
  if (text.includes('sales')) return 'Sales'
  if (text.includes('service') || text.includes('case') || text.includes('support')) return 'Service'
  if (text.includes('market') || text.includes('campaign')) return 'Marketing'
  if (text.includes('finance') || text.includes('product') || text.includes('price')) return 'Finance'
  if (text.includes('custom') || text.includes('project')) return 'Custom'

  return 'Core'
}

export function AppPortal({ app, index, tableMap }: AppPortalProps) {
  const portalRef = useRef<THREE.Group>(null!)
  const swirlRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)
  const [launching, setLaunching] = useState(false)

  const domain = useMemo(() => resolveAppDomain(app, tableMap), [app, tableMap])
  const colors = getDomainColors(domain)

  // Position portal centered in front of its domain's table cluster
  const position = useMemo(() => {
    // Collect all tables in this app's domain
    const domainTables: TableNode[] = []
    for (const t of tableMap.values()) {
      if (t.domain === domain) domainTables.push(t)
    }

    if (domainTables.length > 0) {
      // Find the bounding box of all tables in the domain
      let minX = Infinity, maxX = -Infinity
      let minZ = Infinity, maxZ = -Infinity
      for (const t of domainTables) {
        minX = Math.min(minX, t.position[0])
        maxX = Math.max(maxX, t.position[0])
        minZ = Math.min(minZ, t.position[2])
        maxZ = Math.max(maxZ, t.position[2])
      }

      // Place the portal centered on X, in front of the block (negative Z side)
      const centerX = (minX + maxX) / 2
      return [centerX, 0, minZ - 8] as [number, number, number]
    }

    // Fallback: use domain block center
    const center = getDomainBlockCenter(domain, 1)
    return [center[0], 0, center[2] - 8] as [number, number, number]
  }, [domain, tableMap])

  const portalWidth = 2.5
  const portalHeight = 4

  // Swirl animation
  useFrame(({ clock }) => {
    if (!swirlRef.current) return
    const mat = swirlRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = clock.getElapsedTime()
    mat.uniforms.uHovered.value = hovered ? 1.0 : 0.0
    mat.uniforms.uLaunching.value = launching ? 1.0 : 0.0
  })

  const swirlUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: colors.three.clone() },
      uHovered: { value: 0 },
      uLaunching: { value: 0 },
    }),
    [colors],
  )

  const handleClick = () => {
    setLaunching(true)
    // Simulate app launch effect
    setTimeout(() => {
      if (app.url && app.url !== '#') {
        window.open(app.url, '_blank')
      }
      setLaunching(false)
    }, 1200)
  }

  return (
    <group ref={portalRef} position={position}>
      {/* Portal arch - left pillar */}
      <mesh position={[-portalWidth / 2, portalHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.15, portalHeight, 0.15]} />
        <meshPhysicalMaterial
          color={colors.primary}
          emissive={colors.three}
          emissiveIntensity={hovered ? 0.5 : 0.2}
          transparent
          opacity={0.7}
          metalness={0.3}
          roughness={0.1}
        />
      </mesh>

      {/* Portal arch - right pillar */}
      <mesh position={[portalWidth / 2, portalHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.15, portalHeight, 0.15]} />
        <meshPhysicalMaterial
          color={colors.primary}
          emissive={colors.three}
          emissiveIntensity={hovered ? 0.5 : 0.2}
          transparent
          opacity={0.7}
          metalness={0.3}
          roughness={0.1}
        />
      </mesh>

      {/* Portal arch - top curve */}
      <mesh position={[0, portalHeight, 0]}>
        <torusGeometry args={[portalWidth / 2, 0.08, 8, 16, Math.PI]} />
        <meshPhysicalMaterial
          color={colors.primary}
          emissive={colors.three}
          emissiveIntensity={hovered ? 0.5 : 0.2}
          transparent
          opacity={0.7}
          metalness={0.3}
          roughness={0.1}
        />
      </mesh>

      {/* Swirling energy surface inside portal */}
      <mesh
        ref={swirlRef}
        position={[0, portalHeight / 2 + 0.3, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'default'
        }}
      >
        <planeGeometry args={[portalWidth - 0.3, portalHeight - 0.5]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          uniforms={swirlUniforms}
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
            uniform float uHovered;
            uniform float uLaunching;
            varying vec2 vUv;

            float hash(vec2 p) {
              return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            float noise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              float a = hash(i);
              float b = hash(i + vec2(1.0, 0.0));
              float c = hash(i + vec2(0.0, 1.0));
              float d = hash(i + vec2(1.0, 1.0));
              return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            void main() {
              vec2 center = vUv - 0.5;
              float dist = length(center);
              float angle = atan(center.y, center.x);

              // Swirling distortion
              float swirl = noise(vec2(angle * 2.0 + uTime * 0.5, dist * 4.0 - uTime * 0.3)) * 0.6;
              swirl += noise(vec2(angle * 4.0 - uTime * 0.7, dist * 8.0 + uTime * 0.2)) * 0.3;

              // Radial gradient (brighter in center)
              float radial = 1.0 - smoothstep(0.0, 0.5, dist);

              float intensity = swirl * radial;
              float baseAlpha = mix(0.15, 0.35, uHovered);
              baseAlpha = mix(baseAlpha, 0.8, uLaunching);

              // Launch acceleration effect
              float launch = uLaunching * (1.0 - smoothstep(0.0, 0.3, dist));

              vec3 color = uColor * (1.0 + swirl * 0.5 + launch);
              float alpha = intensity * baseAlpha + launch * 0.5;

              // Soft edge
              float edge = smoothstep(0.5, 0.35, dist);
              alpha *= edge;

              gl_FragColor = vec4(color, alpha);
            }
          `}
        />
      </mesh>

      {/* App name */}
      <Text
        position={[0, portalHeight + 0.6, 0]}
        fontSize={0.35}
        color={colors.accent}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.015}
        outlineColor="#000000"
      >
        {app.displayName}
      </Text>

      {/* App type badge */}
      <Text
        position={[0, -0.3, 0]}
        fontSize={0.18}
        color="#64748b"
        anchorX="center"
        anchorY="top"
      >
        {app.appType.toUpperCase()}
      </Text>

      {/* Base light */}
      <pointLight
        color={colors.primary}
        intensity={hovered ? 3 : 1}
        distance={12}
        position={[0, 0.5, 1]}
      />
    </group>
  )
}
