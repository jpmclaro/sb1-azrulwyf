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

function CylinderMesh({ radius, position }: { radius: number, position: [number, number, number] }) {
  const geometry = useMemo(() => {
    // Criar o cilindro com a face superior fechada e inferior aberta
    const cylinder = new THREE.CylinderGeometry(
      radius,    // raio superior
      radius,    // raio inferior
      3,         // altura
      32,        // segmentos
      1,         // altura segmentos
      false,     // openEnded (false = fechado)
      0,         // thetaStart
      Math.PI * 2 // thetaLength
    );

    // Remove faces da base mantendo apenas a parte superior
    const positions = cylinder.attributes.position;
    const indices = [...cylinder.index.array];
    const numVertices = positions.count;
    
    const newIndices = indices.filter((_, i) => {
      const faceIndex = Math.floor(i / 3);
      const lastRingStart = numVertices - 33;
      return faceIndex < (indices.length / 3) - 32;
    });

    cylinder.setIndex(newIndices);
    return cylinder;
  }, [radius]);

  return (
    <mesh position={[position[0], position[1], position[2]]} geometry={geometry}>
      <meshStandardMaterial 
        color="#ff8c00" 
        metalness={0.1} 
        roughness={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function RevolutionMesh({ 
  points, 
  revolutionCycles, 
  wfHeight, 
  showWireframe,
  closureTop,
  closureBase,
  doubleClosure,
  layerValue,
  useCustomRadius,
  customRadius
}: { 
  points: { x: number, y: number }[], 
  revolutionCycles: number,
  wfHeight: number,
  showWireframe: boolean,
  closureTop: boolean,
  closureBase: boolean,
  doubleClosure: boolean,
  layerValue: number,
  useCustomRadius: boolean,
  customRadius: number
}) {
  const { mainGeometry, cylinderGeometry } = useMemo(() => 
    createRevolutionGeometry(
      points, 
      revolutionCycles, 
      wfHeight, 
      closureTop, 
      closureBase, 
      doubleClosure, 
      layerValue,
      useCustomRadius,
      customRadius
    ), 
    [points, revolutionCycles, wfHeight, closureTop, closureBase, doubleClosure, layerValue, useCustomRadius, customRadius]
  );

  const height = useMemo(() => {
    if (points.length < 2) return 0;
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    return Math.abs(maxY - minY);
  }, [points]);

  // Modificar o cálculo da posição para que a base fique em Y=0
  const position = useMemo(() => {
    if (points.length < 2) return [0, 0, 0];
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    // Ajusta a posição Y para que a base fique em 0
    return [0, 0, 0];
  }, [points]);

  return (
    <group position={position}>
      <mesh geometry={mainGeometry}>
        <meshStandardMaterial 
          color="#ff8c00" 
          metalness={0.1} 
          roughness={0.5}
          side={THREE.DoubleSide}
          transparent={showWireframe}
          opacity={showWireframe ? 0.4 : 1}
        />
      </mesh>
      {showWireframe && (
        <lineSegments>
          <wireframeGeometry args={[mainGeometry]} />
          <lineBasicMaterial color="black" transparent opacity={0.3} />
        </lineSegments>
      )}
      {cylinderGeometry && (
        <mesh geometry={cylinderGeometry}>
          <meshStandardMaterial 
            color="#ff8c00" 
            metalness={0.1} 
            roughness={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <ObjectHeight height={height} />
    </group>
  );
}

export function Scene3D() {
  const [points, setPoints] = useState<{ x: number, y: number }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('points') || '[]');
    } catch {
      return [];
    }
  });
  
  const [revolutionCycles, setRevolutionCycles] = useState(() => 
    Number(localStorage.getItem('revolutionCycles')) || 180
  );
  const [wfHeight, setWfHeight] = useState(() => 
    Number(localStorage.getItem('wfHeight')) || 0
  );
  const [showWireframe, setShowWireframe] = useState(() => 
    localStorage.getItem('showWireframe') === 'true'
  );
  const [closureTop, setClosureTop] = useState(() => 
    localStorage.getItem('closureTop') === 'true'
  );
  const [closureBase, setClosureBase] = useState(() => 
    localStorage.getItem('closureBase') === 'true'
  );
  const [doubleClosure, setDoubleClosure] = useState(() => 
    localStorage.getItem('doubleClosure') === 'true'
  );
  const [layerValue, setLayerValue] = useState(() => 
    Number(localStorage.getItem('layerValue')) || 1
  );
  const [useCustomRadius, setUseCustomRadius] = useState(() => 
    localStorage.getItem('useCustomRadius') === 'true'
  );
  const [customRadius, setCustomRadius] = useState(() => 
    Number(localStorage.getItem('customRadius')) || 10
  );

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'points') {
        try {
          setPoints(JSON.parse(e.newValue || '[]'));
        } catch (err) {
          console.error('Failed to parse points:', err);
          setPoints([]);
        }
      } else if (e.key === 'revolutionCycles') {
        setRevolutionCycles(Number(e.newValue));
      } else if (e.key === 'wfHeight') {
        setWfHeight(Number(e.newValue));
      } else if (e.key === 'showWireframe') {
        setShowWireframe(e.newValue === 'true');
      } else if (e.key === 'closureTop') {
        setClosureTop(e.newValue === 'true');
      } else if (e.key === 'closureBase') {
        setClosureBase(e.newValue === 'true');
      } else if (e.key === 'doubleClosure') {
        setDoubleClosure(e.newValue === 'true');
      } else if (e.key === 'layerValue') {
        setLayerValue(Number(e.newValue));
      } else if (e.key === 'useCustomRadius') {
        setUseCustomRadius(e.newValue === 'true');
      } else if (e.key === 'customRadius') {
        setCustomRadius(Number(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const gridSize = 400;
  const cameraDistance = gridSize * 0.75;

  return (
    <Canvas camera={{ position: [cameraDistance, cameraDistance, cameraDistance], far: gridSize * 2 }}>
      <OrbitControls 
        enableDamping 
        maxDistance={gridSize}
        target={[0, 0, 0]}
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
          closureTop={closureTop}
          closureBase={closureBase}
          doubleClosure={doubleClosure}
          layerValue={layerValue}
          useCustomRadius={useCustomRadius}
          customRadius={customRadius}
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
        position={[0, 0, 0]}
      />
    </Canvas>
  );
}