import * as THREE from 'three';

export function pointOnPolyline(path: THREE.Vector3[], t: number): { position: THREE.Vector3; heading: number } {
  if (path.length < 2) return { position: path[0]?.clone() ?? new THREE.Vector3(), heading: 0 };

  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const len = path[i].distanceTo(path[i + 1]);
    segLens.push(len);
    total += len;
  }

  let d = (t % 1) * total;
  for (let i = 0; i < segLens.length; i++) {
    const len = segLens[i];
    if (d <= len || i === segLens.length - 1) {
      const localT = len === 0 ? 0 : d / len;
      const position = new THREE.Vector3().lerpVectors(path[i], path[i + 1], localT);
      const dir = new THREE.Vector3().subVectors(path[i + 1], path[i]);
      return { position, heading: Math.atan2(dir.x, dir.z) };
    }
    d -= len;
  }

  return { position: path[path.length - 1].clone(), heading: 0 };
}
