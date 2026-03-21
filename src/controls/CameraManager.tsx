import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '@/store/appStore'
import { easeInOutCubic } from '@/utils/easing'
import { sharedEuler } from './FlyControls'

/** Manages cinematic camera transitions (fly-to-table, orbit, auto-orbit) */
export function CameraManager() {
  const { camera } = useThree()
  const { cameraMode, setCameraMode, selectedTableId, tables, flyToTarget, setFlyToTarget, addVisited } = useAppStore()

  const transitionStart = useRef<THREE.Vector3>(new THREE.Vector3())
  const transitionTarget = useRef<THREE.Vector3>(new THREE.Vector3())
  const transitionLookAt = useRef<THREE.Vector3>(new THREE.Vector3())
  const transitionProgress = useRef(0)
  const transitionActive = useRef(false)
  const orbitAngle = useRef(0)
  const idleTime = useRef(0)
  const lastMovePos = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    // Detect camera movement for idle tracking
    const movedDist = camera.position.distanceTo(lastMovePos.current)
    if (movedDist > 0.05) {
      idleTime.current = 0
      lastMovePos.current.copy(camera.position)
    } else {
      idleTime.current += delta
    }

    // Handle fly-to transition
    if (flyToTarget && !transitionActive.current) {
      transitionStart.current.copy(camera.position)
      transitionTarget.current.set(...flyToTarget.position)
      transitionLookAt.current.set(...flyToTarget.lookAt)
      transitionProgress.current = 0
      transitionActive.current = true
    }

    if (transitionActive.current) {
      transitionProgress.current += delta * 0.65 // ~1.5s total
      const t = Math.min(transitionProgress.current, 1)
      const eased = easeInOutCubic(t)

      // Arc through a midpoint above
      const mid = new THREE.Vector3().lerpVectors(
        transitionStart.current,
        transitionTarget.current,
        0.5,
      )
      mid.y += transitionStart.current.distanceTo(transitionTarget.current) * 0.15

      // Quadratic bezier
      const p0 = transitionStart.current
      const p1 = mid
      const p2 = transitionTarget.current
      const pos = new THREE.Vector3()
      pos.x = (1 - eased) * (1 - eased) * p0.x + 2 * (1 - eased) * eased * p1.x + eased * eased * p2.x
      pos.y = (1 - eased) * (1 - eased) * p0.y + 2 * (1 - eased) * eased * p1.y + eased * eased * p2.y
      pos.z = (1 - eased) * (1 - eased) * p0.z + 2 * (1 - eased) * eased * p1.z + eased * eased * p2.z

      camera.position.copy(pos)
      camera.lookAt(transitionLookAt.current)

      if (t >= 1) {
        transitionActive.current = false
        setFlyToTarget(null)

        // Sync FlyControls' euler to the camera's current orientation
        // so it doesn't snap back to the pre-transition direction
        const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
        sharedEuler.set(e.x, e.y, e.z, 'YXZ')

        setCameraMode('fly')

        // Record visit
        if (selectedTableId) {
          const table = tables.find((t) => t.id === selectedTableId)
          if (table) addVisited(table.id, table.position)
        }
      }
      return // Skip other camera modes during transition
    }

    // Auto-orbit when idle in fly mode
    if (cameraMode === 'fly' && idleTime.current > 20) {
      const speed = Math.min((idleTime.current - 20) * 0.01, 0.3)
      camera.position.x += Math.cos(Date.now() * 0.00008) * delta * speed
      camera.position.z += Math.sin(Date.now() * 0.00008) * delta * speed
    }

    // Manual orbit mode around selected table
    if (cameraMode === 'orbit' && selectedTableId) {
      const table = tables.find((t) => t.id === selectedTableId)
      if (!table) return

      orbitAngle.current += delta * 0.3
      const radius = 12
      const tablePos = new THREE.Vector3(...table.position)

      camera.position.x = tablePos.x + Math.cos(orbitAngle.current) * radius
      camera.position.y = tablePos.y + 5
      camera.position.z = tablePos.z + Math.sin(orbitAngle.current) * radius
      camera.lookAt(tablePos)
    }
  })

  return null
}
