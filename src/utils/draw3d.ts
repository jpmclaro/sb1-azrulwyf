import * as THREE from 'three';

interface Point {
  x: number;
  y: number;
}

export function createRevolutionGeometry(
  points: Point[], 
  revolutionCycles: number, 
  wfHeight: number = 0
): THREE.BufferGeometry {
  if (points.length < 2) {
    return new THREE.BufferGeometry();
  }

  // Calculate total height and adjust if needed
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  let totalHeight = maxY - minY;
  
  // Adjust sampling points based on WF height
  let sampledPoints: Point[] = [];
  if (wfHeight > 0) {
    // Adjust total height to ensure exact division by WF height
    const segments = Math.floor(totalHeight / wfHeight);
    totalHeight = segments * wfHeight;
    const adjustedMaxY = minY + totalHeight;

    // Generate sampling points at WF height intervals
    for (let y = minY; y <= adjustedMaxY; y += wfHeight) {
      // Project from revolution axis to find intersection with curve
      let intersectionX = 0;
      let found = false;

      // Find intersection with line segments
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        
        // Check if y is within this segment
        if (y >= Math.min(p1.y, p2.y) && y <= Math.max(p1.y, p2.y)) {
          // Calculate intersection point using linear interpolation
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

    // Ensure we include the last point if it's not exactly on a WF interval
    if (Math.abs(sampledPoints[sampledPoints.length - 1].y - adjustedMaxY) > 0.001) {
      const lastPoint = points[points.length - 1];
      if (lastPoint.y <= adjustedMaxY) {
        sampledPoints.push(lastPoint);
      }
    }
  } else {
    sampledPoints = [...points];
  }

  // Ensure we have at least 2 points
  if (sampledPoints.length < 2) {
    sampledPoints = [...points];
  }

  // Create revolution geometry
  const angleStep = (2 * Math.PI) / revolutionCycles;
  const vertices: number[] = [];
  const indices: number[] = [];

  // Generate vertices
  for (let i = 0; i <= revolutionCycles; i++) {
    const angle = i * angleStep;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    for (const point of sampledPoints) {
      vertices.push(
        point.x * cos,  // x
        point.y,        // y
        point.x * sin   // z
      );
    }
  }

  // Generate faces
  const pointsPerRing = sampledPoints.length;
  for (let i = 0; i < revolutionCycles; i++) {
    for (let j = 0; j < pointsPerRing - 1; j++) {
      const current = i * pointsPerRing + j;
      const next = current + pointsPerRing;
      
      indices.push(current, next, current + 1);
      indices.push(current + 1, next, next + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  
  if (vertices.length >= 3 && indices.length >= 3) {
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
  }

  return geometry;
}