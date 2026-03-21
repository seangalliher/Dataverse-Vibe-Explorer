import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '@/store/appStore'

/** Renders a glowing breadcrumb trail in 3D connecting previously visited tables */
export function BreadcrumbTrail() {
  const visitedPositions = useAppStore((s) => s.visitedPositions)

  const lineGeometry = useMemo(() => {
    if (visitedPositions.length < 2) return null

    const points = visitedPositions.map(
      (v) => new THREE.Vector3(v.position[0], v.position[1] + 0.5, v.position[2]),
    )

    // Create smooth curve through points
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
    const tubeGeo = new THREE.TubeGeometry(curve, points.length * 8, 0.04, 5, false)
    return tubeGeo
  }, [visitedPositions])

  if (!lineGeometry) return null

  return (
    <mesh geometry={lineGeometry}>
      <meshBasicMaterial
        color="#00f0ff"
        transparent
        opacity={0.25}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}
