import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';

interface Point {
  x: number;
  y: number;
}

function getMaxYFromVertices(vertices: number[]): number {
  let maxY = -Infinity;
  for (let i = 1; i < vertices.length; i += 3) {
    maxY = Math.max(maxY, vertices[i]);
  }
  return maxY;
}

function createClosureAtLayer(
  vertices: number[], 
  indices: number[], 
  layerHeight: number,
  isTop: boolean = true,
  useCustomRadius: boolean = false,
  customRadius: number = 0
): void {
  const verticesAtLayer: number[] = [];
  const epsilon = 0.001;
  let avgX = 0, avgZ = 0;
  
  for (let i = 0; i < vertices.length; i += 3) {
    if (Math.abs(vertices[i + 1] - layerHeight) < epsilon) {
      verticesAtLayer.push(i / 3);
      avgX += vertices[i];
      avgZ += vertices[i + 2];
    }
  }

  if (verticesAtLayer.length < 3) return;

  avgX /= verticesAtLayer.length;
  avgZ /= verticesAtLayer.length;

  if (isTop) {
    const centerIndex = vertices.length / 3;
    vertices.push(avgX, layerHeight, avgZ);

    for (let i = 0; i < verticesAtLayer.length - 1; i++) {
      indices.push(
        verticesAtLayer[i],
        centerIndex,
        verticesAtLayer[i + 1]
      );
    }
    indices.push(
      verticesAtLayer[verticesAtLayer.length - 1],
      centerIndex,
      verticesAtLayer[0]
    );
  } else {
    // Criar fechamento da base
    const centerIndex = vertices.length / 3;
    vertices.push(avgX, layerHeight, avgZ);

    // Se tiver furo, criar primeiro o furo e depois o anel externo
    if (useCustomRadius) {
      const segments = 32;
      const holeStartIndex = vertices.length / 3;
      const holeRadius = customRadius;

      // Criar vértices do furo
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = avgX + Math.cos(angle) * holeRadius;
        const z = avgZ + Math.sin(angle) * holeRadius;
        vertices.push(x, layerHeight, z);
      }

      // Criar anel entre borda externa e furo
      for (let i = 0; i < verticesAtLayer.length; i++) {
        const current = i;
        const next = (i + 1) % verticesAtLayer.length;
        const holeCurrentIndex = holeStartIndex + (Math.floor(i * segments / verticesAtLayer.length) % segments);
        const holeNextIndex = holeStartIndex + (Math.floor((i + 1) * segments / verticesAtLayer.length) % segments);

        // Criar quadriláteros entre a borda externa e o furo
        indices.push(
          verticesAtLayer[current],
          verticesAtLayer[next],
          holeCurrentIndex
        );
        indices.push(
          verticesAtLayer[next],
          holeNextIndex,
          holeCurrentIndex
        );
      }
    } else {
      // Fechamento normal sem furo
      for (let i = 0; i < verticesAtLayer.length - 1; i++) {
        indices.push(
          verticesAtLayer[i + 1],
          centerIndex,
          verticesAtLayer[i]
        );
      }
      indices.push(
        verticesAtLayer[0],
        centerIndex,
        verticesAtLayer[verticesAtLayer.length - 1]
      );
    }
  }
}

function createCylinderGeometry(radius: number): THREE.BufferGeometry {
  const segments = 32;
  const cylinderRadius = radius;
  
  // Criar cilindro com openEnded = true para não ter faces nas extremidades
  const cylinder = new THREE.CylinderGeometry(
    cylinderRadius,  // raio superior
    cylinderRadius,  // raio inferior
    3,              // altura
    segments,       // segmentos
    1,              // heightSegments
    true,           // openEnded = true para não criar faces nas extremidades
    0,
    Math.PI * 2
  );

  // Criar e adicionar apenas a face superior
  const topCenter = new THREE.Vector3(0, 1.5, 0);
  const topVertices: number[] = [];
  const topIndices: number[] = [];
  
  // Adicionar vértice central do topo
  topVertices.push(topCenter.x, topCenter.y, topCenter.z);
  
  // Adicionar vértices da borda superior
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * cylinderRadius;
    const z = Math.sin(angle) * cylinderRadius;
    topVertices.push(x, 1.5, z);
  }

  // Criar triângulos para a face superior
  for (let i = 0; i < segments; i++) {
    const current = i + 1;
    const next = i + 2 > segments ? 1 : i + 2;
    topIndices.push(0, current, next);
  }

  // Combinar com a geometria do cilindro
  const positions = [...cylinder.attributes.position.array, ...topVertices];
  const normalCount = cylinder.attributes.position.count + segments + 1;
  const normals = new Float32Array(normalCount * 3).fill(0);
  
  // Atualizar índices para incluir a face superior
  const cylinderIndices = [...cylinder.index.array];
  const newIndices = [
    ...cylinderIndices,
    ...topIndices.map(i => i + cylinder.attributes.position.count)
  ];

  // Criar nova geometria com tudo combinado
  const finalGeometry = new THREE.BufferGeometry();
  finalGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  finalGeometry.setIndex(newIndices);
  finalGeometry.computeVertexNormals();

  return finalGeometry;
}

export interface RevolutionResult {
  mainGeometry: THREE.BufferGeometry;
  cylinderGeometry?: THREE.BufferGeometry;
}

export function createRevolutionGeometry(
  points: Point[], 
  revolutionCycles: number, 
  wfHeight: number = 0,
  closureTop: boolean = false,
  closureBase: boolean = false,
  doubleClosure: boolean = false,
  layerValue: number = 1,
  useCustomRadius: boolean = false,
  customRadius: number = 0
): RevolutionResult {
  if (points.length < 2) {
    return { mainGeometry: new THREE.BufferGeometry() };
  }

  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  let totalHeight = maxY - minY;
  
  let sampledPoints: Point[] = [];
  if (wfHeight > 0) {
    const segments = Math.floor(totalHeight / wfHeight);
    totalHeight = segments * wfHeight;
    const adjustedMaxY = minY + totalHeight;

    for (let y = minY; y <= adjustedMaxY + 0.001; y += wfHeight) {
      let intersectionX = 0;
      let found = false;

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        
        if (y >= Math.min(p1.y, p2.y) && y <= Math.max(p1.y, p2.y)) {
          const t = (y - p1.y) / (p2.y - p1.y);
          intersectionX = p1.x + t * (p2.x - p1.x);
          found = true;
          break;
        }
      }

      if (found) {
        sampledPoints.push({ x: intersectionX, y });
      }
    }

    // Add the last point if it's not exactly on a layer
    const lastPoint = points[points.length - 1];
    if (Math.abs((lastPoint.y - minY) % wfHeight) > 0.001) {
      sampledPoints.push(lastPoint);
    }
  } else {
    sampledPoints = [...points];
  }

  if (sampledPoints.length < 2) {
    sampledPoints = [...points];
  }

  const angleStep = (2 * Math.PI) / revolutionCycles;
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < revolutionCycles; i++) {
    const angle = i * angleStep;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    for (const point of sampledPoints) {
      vertices.push(
        point.x * cos,
        point.y,
        point.x * sin
      );
    }
  }

  const pointsPerRing = sampledPoints.length;
  for (let i = 0; i < revolutionCycles - 1; i++) {
    for (let j = 0; j < pointsPerRing - 1; j++) {
      const current = i * pointsPerRing + j;
      const next = current + pointsPerRing;
      
      indices.push(current, next, current + 1);
      indices.push(current + 1, next, next + 1);
    }
  }

  // Close the revolution by connecting back to the first vertices
  for (let j = 0; j < pointsPerRing - 1; j++) {
    const current = (revolutionCycles - 1) * pointsPerRing + j;
    const next = j;
    
    indices.push(current, next, current + 1);
    indices.push(current + 1, next, next + 1);
  }

  if (doubleClosure && wfHeight > 0) {
    const layerHeight = minY + (layerValue - 1) * wfHeight;
    if (layerHeight <= maxY) {
      createClosureAtLayer(vertices, indices, layerHeight, true);
      createClosureAtLayer(vertices, indices, layerHeight, false);
    }
  }

  if (closureTop) {
    const topHeight = getMaxYFromVertices(vertices);
    createClosureAtLayer(vertices, indices, topHeight, true);
  }

  if (closureBase) {
    createClosureAtLayer(vertices, indices, minY, false, useCustomRadius, customRadius);
  }

  const mainGeometry = new THREE.BufferGeometry();
  
  if (vertices.length >= 3 && indices.length >= 3) {
    mainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    mainGeometry.setIndex(indices);
    mainGeometry.computeVertexNormals();
  }

  let cylinderGeometry: THREE.BufferGeometry | undefined;
  if (closureBase && useCustomRadius) {
    cylinderGeometry = createCylinderGeometry(customRadius);
    cylinderGeometry.translate(0, 1.5, 0);
  }

  return { mainGeometry, cylinderGeometry };
}