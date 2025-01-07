import * as THREE from 'three';
import { createRevolutionGeometry } from './draw3d';

function geometryToSTL(geometry: THREE.BufferGeometry): string {
  // Create rotation matrix for 90 degrees around X axis
  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeRotationX(Math.PI / 2);
  
  // Apply rotation to geometry
  geometry.applyMatrix4(rotationMatrix);
  
  const vector = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  let output = 'solid exported\n';

  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const indices = geometry.index;

  if (!positions || !normals || !indices) {
    return output + 'endsolid exported\n';
  }

  for (let i = 0; i < indices.count; i += 3) {
    output += 'facet normal ';

    // Get normal for this face
    vector.fromBufferAttribute(normals, indices.getX(i));
    normalMatrix.getNormalMatrix(new THREE.Matrix4());
    vector.applyMatrix3(normalMatrix);

    output += `${vector.x} ${vector.y} ${vector.z}\n`;
    output += '  outer loop\n';

    // Add vertices
    for (let j = 0; j < 3; j++) {
      const vertexIndex = indices.getX(i + j);
      vector.fromBufferAttribute(positions, vertexIndex);

      output += `    vertex ${vector.x} ${vector.y} ${vector.z}\n`;
    }

    output += '  endloop\nendfacet\n';
  }

  output += 'endsolid exported\n';
  return output;
}

export function exportToSTL(
  points: { x: number; y: number }[], 
  revolutionCycles: number,
  wfHeight: number
): void {
  if (points.length < 2) {
    console.error('Not enough points to generate STL');
    return;
  }

  // Create geometry
  const geometry = createRevolutionGeometry(points, revolutionCycles, wfHeight);
  
  // Convert to STL string
  const stlString = geometryToSTL(geometry);
  
  // Create blob and download
  const blob = new Blob([stlString], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'model.stl';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}