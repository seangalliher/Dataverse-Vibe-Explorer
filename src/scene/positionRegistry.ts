/**
 * Shared position registry — Platform components write their current animated
 * position here each frame so RelationshipBeams can read live positions
 * during transitions.
 */
import * as THREE from 'three'

export const livePositions = new Map<string, THREE.Vector3>()
