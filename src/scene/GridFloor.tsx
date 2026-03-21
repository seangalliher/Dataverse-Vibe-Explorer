import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GRID_COLOR } from '@/utils/colors'

export function GridFloor() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(GRID_COLOR) },
    }),
    [],
  )

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[800, 800, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColor;
          varying vec2 vUv;
          varying vec3 vWorldPos;

          float gridLine(float coord, float lineWidth) {
            float a = abs(fract(coord - 0.5) - 0.5);
            return smoothstep(lineWidth, lineWidth + 0.02, a);
          }

          void main() {
            // Grid coordinates
            float scale = 4.0;
            float gx = gridLine(vWorldPos.x / scale, 0.02);
            float gz = gridLine(vWorldPos.z / scale, 0.02);
            float grid = 1.0 - min(gx, gz);

            // Larger grid every 5 units
            float lgx = gridLine(vWorldPos.x / (scale * 5.0), 0.015);
            float lgz = gridLine(vWorldPos.z / (scale * 5.0), 0.015);
            float largeGrid = 1.0 - min(lgx, lgz);

            float combinedGrid = max(grid * 0.4, largeGrid * 0.8);

            // Radial pulse wave from center
            float dist = length(vWorldPos.xz);
            float pulse = sin(dist * 0.15 - uTime * 1.5) * 0.5 + 0.5;
            pulse = smoothstep(0.3, 0.7, pulse) * 0.3;

            // Distance fade
            float fade = 1.0 - smoothstep(50.0, 300.0, dist);

            float alpha = (combinedGrid + pulse * grid) * fade;
            vec3 color = uColor * (1.0 + pulse * 0.5);

            gl_FragColor = vec4(color, alpha * 0.35);
          }
        `}
      />
    </mesh>
  )
}
