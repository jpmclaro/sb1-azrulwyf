import * as THREE from 'three';
import { createRevolutionGeometry } from './draw3d';

export function exportToOBJ(
  points: { x: number; y: number }[], 
  revolutionCycles: number,
  wfHeight: number,
  closureTop: boolean = false,
  closureBase: boolean = false,
  doubleClosure: boolean = false,
  layerValue: number = 1,
  useCustomRadius: boolean = false,
  customRadius: number = 0
): void {
  if (points.length < 2) {
    console.error('Not enough points to generate OBJ');
    return;
  }

  const geometry = createRevolutionGeometry(
    points, 
    revolutionCycles, 
    wfHeight,
    closureTop,
    closureBase,
    doubleClosure,
    layerValue,
    useCustomRadius,
    customRadius
  );
  
  // Rotate 90 degrees around X axis
  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeRotationX(Math.PI / 2);
  geometry.applyMatrix4(rotationMatrix);

  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const indices = geometry.index;

  if (!positions || !normals || !indices) return;

  let output = '# Exported OBJ\n';

  // Write vertices
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    output += `v ${x} ${y} ${z}\n`;
  }

  // Write normals
  for (let i = 0; i < normals.count; i++) {
    const x = normals.getX(i);
    const y = normals.getY(i);
    const z = normals.getZ(i);
    output += `vn ${x} ${y} ${z}\n`;
  }

  // Write faces
  for (let i = 0; i < indices.count; i += 3) {
    const a = indices.getX(i) + 1;
    const b = indices.getX(i + 1) + 1;
    const c = indices.getX(i + 2) + 1;
    output += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
  }

  const blob = new Blob([output], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'model.obj';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}