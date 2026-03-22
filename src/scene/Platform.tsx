import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { CDMDomain } from '@/utils/colors'
import { formatRecordCount } from '@/data/dataverse'
import { getDomainColors } from '@/utils/colors'
import { useAppStore } from '@/store/appStore'
import { damp, dampV3 } from '@/utils/easing'
import { livePositions } from './positionRegistry'
import { Pillar } from './Pillar'

interface PlatformProps {
  id: string
  name: string
  domain: CDMDomain
  position: [number, number, number]
  targetPosition: [number, number, number]
  isConstellation: boolean
  recordCount: number
  columns: Array<{ name: string; dataType: string }>
}

/** Create a hexagonal shape */
function createHexShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = radius * Math.cos(angle)
    const y = radius * Math.sin(angle)
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

export function Platform({ id, name, domain, position, targetPosition, isConstellation, recordCount, columns }: PlatformProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const contentRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)

  // Animated position state
  const currentPos = useRef(new THREE.Vector3(...position))
  const targetVec = useRef(new THREE.Vector3(...targetPosition))

  // Animated rotation state: 0 = flat (grid), 1 = upright (constellation)
  const tiltProgress = useRef(0)

  // Update target when targetPosition prop changes
  useEffect(() => {
    targetVec.current.set(...targetPosition)
  }, [targetPosition])

  // Register initial live position
  useEffect(() => {
    if (!livePositions.has(id)) {
      livePositions.set(id, currentPos.current.clone())
    }
    return () => { livePositions.delete(id) }
  }, [id])

  const selectedTableId = useAppStore((s) => s.selectedTableId)
  const setSelectedTable = useAppStore((s) => s.setSelectedTable)
  const setHoveredTable = useAppStore((s) => s.setHoveredTable)
  const isSelected = selectedTableId === id

  const colors = getDomainColors(domain)

  // Scale platform size logarithmically by record count
  const scale = 0.8 + Math.log10(Math.max(recordCount, 10)) * 0.3

  const hexShape = useMemo(() => createHexShape(2 * scale), [scale])
  const extrudeSettings = useMemo(
    () => ({
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3,
    }),
    [],
  )

  // Animate position, tilt, and pulse glow
  useFrame(({ clock, camera }, delta) => {
    // Check if position and tilt have settled (skip heavy math when static)
    const posSettled = currentPos.current.distanceToSquared(targetVec.current) < 0.001
    const tiltTarget = isConstellation ? 1 : 0
    const tiltSettled = Math.abs(tiltProgress.current - tiltTarget) < 0.001

    if (!posSettled) {
      // Smooth position interpolation
      dampV3(currentPos.current, targetVec.current, 3, delta)
      if (groupRef.current) {
        groupRef.current.position.copy(currentPos.current)
      }

      // Update live position registry for RelationshipBeams
      const live = livePositions.get(id)
      if (live) {
        live.copy(currentPos.current)
      } else {
        livePositions.set(id, currentPos.current.clone())
      }
    }

    if (!tiltSettled) {
      // Animate tilt
      tiltProgress.current = damp(tiltProgress.current, tiltTarget, 3, delta)
    }

    if (contentRef.current) {
      // Interpolate X rotation: flat = -PI/2, upright = 0
      contentRef.current.rotation.x = -Math.PI / 2 * (1 - tiltProgress.current)

      // Y-axis billboard in constellation mode: face the camera
      if (tiltProgress.current > 0.01 && groupRef.current) {
        const camPos = camera.position
        const myPos = currentPos.current
        const angle = Math.atan2(camPos.x - myPos.x, camPos.z - myPos.z)
        groupRef.current.rotation.y = damp(groupRef.current.rotation.y, angle, 4, delta)
      } else if (groupRef.current && Math.abs(groupRef.current.rotation.y) > 0.001) {
        // Reset rotation when back in grid mode
        groupRef.current.rotation.y = damp(groupRef.current.rotation.y, 0, 3, delta)
      }
    }

    // Pulse glow
    if (!glowRef.current) return
    const t = clock.getElapsedTime()
    const baseIntensity = isSelected ? 0.8 : hovered ? 0.5 : 0.2
    const pulse = Math.sin(t * 2) * 0.1
    const mat = glowRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = baseIntensity + pulse
  })

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    setSelectedTable(isSelected ? null : id)
  }

  // Place pillars in a ring on top of the platform
  const pillarData = columns.slice(0, 8)

  return (
    <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.3}>
      <group ref={groupRef} position={position}>
        {/* Content group handles tilt rotation (flat ↔ upright) */}
        <group ref={contentRef} rotation={[-Math.PI / 2, 0, 0]}>
        {/* Main hex platform — no individual rotation, parent group handles it */}
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            setHoveredTable(id)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            setHoveredTable(null)
            document.body.style.cursor = 'default'
          }}
          castShadow
          receiveShadow
        >
          <extrudeGeometry args={[hexShape, extrudeSettings]} />
          <meshPhysicalMaterial
            color={colors.primary}
            transparent
            opacity={0.25}
            transmission={0.4}
            roughness={0.1}
            metalness={0.1}
            emissive={colors.three}
            emissiveIntensity={isSelected ? 0.4 : hovered ? 0.25 : 0.15}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Glow ring underneath */}
        <mesh ref={glowRef} rotation={[0, 0, -0.15]} position={[0, 0, -0.1]}>
          <ringGeometry args={[2 * scale - 0.1, 2 * scale + 0.2, 6]} />
          <meshBasicMaterial
            color={colors.primary}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Point light behind platform */}
        <pointLight
          color={colors.primary}
          intensity={isSelected ? 3 : hovered ? 2 : 1}
          distance={15}
          position={[0, 0, -1]}
        />

        {/* Table name label */}
        <Text
          position={[0, 2 * scale + 1.0 + pillarData.length * 0.1, 0.2]}
          fontSize={0.5}
          color={colors.accent}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {name}
        </Text>

        {/* Record count badge */}
        <Text
          position={[0, 2 * scale + 0.5 + pillarData.length * 0.1, 0.2]}
          fontSize={0.25}
          color="#94a3b8"
          anchorX="center"
          anchorY="bottom"
        >
          {formatRecordCount(recordCount)} records
        </Text>

        {/* Column pillars */}
        {pillarData.map((col, i) => {
          const angle = (i / pillarData.length) * Math.PI * 2
          const r = 1.2 * scale
          const px = Math.cos(angle) * r
          const py = Math.sin(angle) * r
          return (
            <Pillar
              key={col.name}
              name={col.name}
              dataType={col.dataType}
              position={[px, py, 0.3]}
              domain={domain}
              index={i}
            />
          )
        })}

        {/* Selection ring */}
        {isSelected && (
          <mesh position={[0, 0, 0.05]}>
            <ringGeometry args={[2 * scale + 0.3, 2 * scale + 0.6, 6]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.6}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
        </group>
      </group>
    </Float>
  )
}
