import * as THREE from 'three';

interface Point {
  x: number;
  y: number;
}

function createClosureAtLayer(
  vertices: number[], 
  indices: number[], 
  layerHeight: number,
  isTop: boolean = true
): void {
  const verticesAtLayer: number[] = [];
  const epsilon = 0.001;
  
  for (let i = 0; i < vertices.length; i += 3) {
    if (Math.abs(vertices[i + 1] - layerHeight) < epsilon) {
      verticesAtLayer.push(i / 3);
    }
  }

  if (verticesAtLayer.length < 3) return;

  const centerIndex = vertices.length / 3;
  let avgX = 0, avgZ = 0;
  for (const vertexIndex of verticesAtLayer) {
    avgX += vertices[vertexIndex * 3];
    avgZ += vertices[vertexIndex * 3 + 2];
  }
  avgX /= verticesAtLayer.length;
  avgZ /= verticesAtLayer.length;

  vertices.push(avgX, layerHeight, avgZ);

  if (isTop) {
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

export function createRevolutionGeometry(
  points: Point[], 
  revolutionCycles: number, 
  wfHeight: number = 0,
  closureTop: boolean = false,
  closureBase: boolean = false,
  doubleClosure: boolean = false,
  layerValue: number = 1
): THREE.BufferGeometry {
  if (points.length < 2) {
    return new THREE.BufferGeometry();
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

  for (let i = 0; i <= revolutionCycles; i++) {
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
  for (let i = 0; i < revolutionCycles; i++) {
    for (let j = 0; j < pointsPerRing - 1; j++) {
      const current = i * pointsPerRing + j;
      const next = current + pointsPerRing;
      
      indices.push(current, next, current + 1);
      indices.push(current + 1, next, next + 1);
    }
  }

  if (doubleClosure && wfHeight > 0) {
    const layerHeight = minY + (layerValue - 1) * wfHeight;
    if (layerHeight <= maxY) {
      createClosureAtLayer(vertices, indices, layerHeight, true);
      createClosureAtLayer(vertices, indices, layerHeight, false);
    }
  }

  if (closureTop) {
    const topHeight = sampledPoints[sampledPoints.length - 1].y;
    createClosureAtLayer(vertices, indices, topHeight, true);
  }

  if (closureBase) {
    createClosureAtLayer(vertices, indices, minY, false);
  }

  const geometry = new THREE.BufferGeometry();
  
  if (vertices.length >= 3 && indices.length >= 3) {
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
  }

  return geometry;
}