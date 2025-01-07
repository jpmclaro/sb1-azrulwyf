import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { createRevolutionGeometry } from '../utils/draw3d';

function ObjectHeight({ height }: { height: number }) {
  return (
    <Html position={[0, 0, 0]} style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
      <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg shadow">
        <p className="text-sm font-medium">
          Height: {height.toFixed(2)}mm
        </p>
      </div>
    </Html>
  );
}

function RevolutionMesh({ 
  points, 
  revolutionCycles, 
  wfHeight, 
  showWireframe 
}: { 
  points: { x: number, y: number }[], 
  revolutionCycles: number,
  wfHeight: number,
  showWireframe: boolean
}) {
  const geometry = useMemo(() => 
    createRevolutionGeometry(points, revolutionCycles, wfHeight), 
    [points, revolutionCycles, wfHeight]
  );

  // Calculate object height
  const height = useMemo(() => {
    if (points.length < 2) return 0;
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    return Math.abs(maxY - minY);
  }, [points]);

  const position = useMemo(() => {
    if (points.length < 2) return [0, 0, 0];
    const minY = Math.min(...points.map(p => p.y));
    return [0, -minY, 0]; // Position object at grid level
  }, [points]);

  if (showWireframe) {
    return (
      <group position={position}>
        <mesh geometry={geometry}>
          <meshStandardMaterial 
            color="#ff8c00" 
            metalness={0.1} 
            roughness={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        <lineSegments>
          <wireframeGeometry args={[geometry]} />
          <lineBasicMaterial color="black" transparent opacity={0.3} />
        </lineSegments>
        <ObjectHeight height={height} />
      </group>
    );
  }

  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshStandardMaterial 
          color="#ff8c00" 
          metalness={0.1} 
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <ObjectHeight height={height} />
    </group>
  );
}

export function Scene3D() {
  const [radius, setRadius] = useState(200);
  const [showWireframe, setShowWireframe] = useState(false);
  const [revolutionCycles, setRevolutionCycles] = useState(180);
  const [wfHeight, setWfHeight] = useState(0);
  const [points, setPoints] = useState<{ x: number, y: number }[]>([]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'radius') {
        setRadius(Number(e.newValue));
      } else if (e.key === 'revolutionCycles') {
        setRevolutionCycles(Number(e.newValue));
      } else if (e.key === 'wfHeight') {
        setWfHeight(Number(e.newValue));
      } else if (e.key === 'showWireframe') {
        setShowWireframe(e.newValue === 'true');
      } else if (e.key === 'points') {
        try {
          setPoints(JSON.parse(e.newValue || '[]'));
        } catch (err) {
          console.error('Failed to parse points:', err);
          setPoints([]);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const gridSize = radius * 2;
  const cameraDistance = gridSize * 0.75;

  return (
    <Canvas camera={{ position: [cameraDistance, cameraDistance, cameraDistance], far: gridSize * 2 }}>
      <OrbitControls 
        enableDamping 
        maxDistance={gridSize}
        target={[0, 0, 0]} // Center camera target at grid level
      />
      <ambientLight intensity={0.7} />
      <directionalLight position={[1, 1, 1]} intensity={0.5} />
      <directionalLight position={[-1, -1, -1]} intensity={0.3} />
      <directionalLight position={[0, 1, 0]} intensity={0.3} />
      
      {points.length >= 2 && (
        <RevolutionMesh 
          points={points}
          revolutionCycles={revolutionCycles}
          wfHeight={wfHeight}
          showWireframe={showWireframe}
        />
      )}
      
      <Grid 
        args={[gridSize, gridSize]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#6e6e6e"
        sectionSize={100}
        sectionThickness={1}
        sectionColor="#9d4b4b"
        fadeDistance={gridSize}
        fadeStrength={1}
        infiniteGrid={false}
        position={[0, 0, 0]} // Place grid at origin
      />
    </Canvas>
  );
}