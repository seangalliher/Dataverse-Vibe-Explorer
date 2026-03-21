import { useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '@/store/appStore'

const MOVE_SPEED = 15
const BOOST_MULTIPLIER = 2.5
const LOOK_SPEED = 0.002
const DAMPING = 5

/** Shared euler so CameraManager can sync orientation after transitions */
export const sharedEuler = new THREE.Euler(0, 0, 0, 'YXZ')

export function FlyControls() {
  const { camera, gl } = useThree()
  const cameraModeRef = useRef(useAppStore.getState().cameraMode)

  // Keep cameraModeRef in sync without re-creating callbacks
  useEffect(() => {
    const unsub = useAppStore.subscribe((s) => {
      cameraModeRef.current = s.cameraMode
      // Release pointer lock when entering a transition
      if (s.cameraMode === 'transition' && document.pointerLockElement) {
        document.exitPointerLock()
      }
    })
    return unsub
  }, [])

  const keysRef = useRef<Set<string>>(new Set())
  const velocityRef = useRef(new THREE.Vector3())
  const isLockedRef = useRef(false)

  const onPointerLockChange = useCallback(() => {
    isLockedRef.current = document.pointerLockElement === gl.domElement
  }, [gl])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isLockedRef.current) return
    sharedEuler.y -= e.movementX * LOOK_SPEED
    sharedEuler.x -= e.movementY * LOOK_SPEED
    sharedEuler.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, sharedEuler.x))
  }, [])

  const onCanvasClick = useCallback(() => {
    // Only lock pointer when in fly mode (not during transitions)
    if (!isLockedRef.current && cameraModeRef.current === 'fly') {
      gl.domElement.requestPointerLock()
    }
  }, [gl])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.code.toLowerCase())
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code.toLowerCase())

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('mousemove', onMouseMove)
    gl.domElement.addEventListener('click', onCanvasClick)

    // Set initial camera position
    camera.position.set(0, 12, 40)
    sharedEuler.set(-0.2, 0, 0, 'YXZ')

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      gl.domElement.removeEventListener('click', onCanvasClick)
    }
  }, [camera, gl, onPointerLockChange, onMouseMove, onCanvasClick])

  useFrame((_, delta) => {
    if (cameraModeRef.current !== 'fly') return

    const keys = keysRef.current
    const speed = keys.has('shiftleft') || keys.has('shiftright') ? MOVE_SPEED * BOOST_MULTIPLIER : MOVE_SPEED

    const target = new THREE.Vector3()
    if (keys.has('keyw') || keys.has('arrowup')) target.z -= 1
    if (keys.has('keys') || keys.has('arrowdown')) target.z += 1
    if (keys.has('keya') || keys.has('arrowleft')) target.x -= 1
    if (keys.has('keyd') || keys.has('arrowright')) target.x += 1
    if (keys.has('space')) target.y += 1
    if (keys.has('keyc')) target.y -= 1

    if (target.lengthSq() > 0) target.normalize()
    target.multiplyScalar(speed)

    const vel = velocityRef.current
    vel.lerp(target, 1 - Math.exp(-DAMPING * delta))

    camera.quaternion.setFromEuler(sharedEuler)

    const moveDir = vel.clone().applyQuaternion(camera.quaternion)
    camera.position.addScaledVector(moveDir, delta)

    if (vel.lengthSq() > 1) {
      const bobAmount = Math.sin(Date.now() * 0.003) * 0.02
      camera.position.y += bobAmount
    }
  })

  return null
}
