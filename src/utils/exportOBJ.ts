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

  try {
    const { mainGeometry, cylinderGeometry } = createRevolutionGeometry(
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

    // Rotacionar para exportação
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationX(Math.PI / 2);
    
    mainGeometry.applyMatrix4(rotationMatrix);
    if (cylinderGeometry) {
      cylinderGeometry.applyMatrix4(rotationMatrix);
    }

    let output = '# Exported OBJ\n';
    let vertexCount = 0;

    // Helper function to write geometry
    const writeGeometry = (geometry: THREE.BufferGeometry) => {
      const positions = geometry.getAttribute('position');
      const normals = geometry.getAttribute('normal');
      const indices = geometry.index;

      if (!positions || !normals || !indices) return;

      // Write vertices
      for (let i = 0; i < positions.count; i++) {
        output += `v ${positions.getX(i)} ${positions.getY(i)} ${positions.getZ(i)}\n`;
      }

      // Write normals
      for (let i = 0; i < normals.count; i++) {
        output += `vn ${normals.getX(i)} ${normals.getY(i)} ${normals.getZ(i)}\n`;
      }

      // Write faces
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i) + vertexCount + 1;
        const b = indices.getX(i + 1) + vertexCount + 1;
        const c = indices.getX(i + 2) + vertexCount + 1;
        output += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      }

      vertexCount += positions.count;
    };

    // Write main geometry
    writeGeometry(mainGeometry);

    // Write cylinder if exists
    if (cylinderGeometry) {
      writeGeometry(cylinderGeometry);
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
  } catch (error) {
    console.error('Error during OBJ export:', error);
  }
}