import React, { useRef, useEffect, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface DrawingCanvasProps {
  selectedTool: string;
  height: number;
  snapToGrid?: boolean;
  snapToCorners?: boolean;
  smoothingIterations?: number;
}

export function DrawingCanvas({ 
  selectedTool, 
  height, 
  snapToGrid = false, 
  snapToCorners = false,
  smoothingIterations = 0 
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const currentPath = useRef<Point[]>([]);
  const originalPath = useRef<Point[]>([]);
  const [radius, setRadius] = useState(100);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'radius') {
        setRadius(Number(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const drawReferenceLine = (ctx: CanvasRenderingContext2D) => {
    const radiusInPixels = radius * scale;
    
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(radiusInPixels, 0);
    ctx.lineTo(radiusInPixels, ctx.canvas.height);
    ctx.stroke();
    ctx.restore();
  };

  const formatCoordinate = (value: number): string => {
    return (value / scale).toFixed(2);
  };

  const updateScene3D = (points: Point[]) => {
    const mmPoints = points.map(p => ({
      x: p.x / scale,
      y: p.y / scale
    }));
    
    localStorage.setItem('points', JSON.stringify(mmPoints));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'points',
      newValue: JSON.stringify(mmPoints)
    }));
  };

  const smoothCurve = (points: Point[], iterations: number): Point[] => {
    if (iterations === 0 || points.length < 3) return points;

    let result = [...points];
    
    for (let iter = 0; iter < iterations; iter++) {
      const smoothed: Point[] = [result[0]];
      
      for (let i = 1; i < result.length - 1; i++) {
        smoothed.push({
          x: result[i-1].x * 0.25 + result[i].x * 0.5 + result[i+1].x * 0.25,
          y: result[i-1].y * 0.25 + result[i].y * 0.5 + result[i+1].y * 0.25
        });
      }
      
      smoothed.push(result[result.length - 1]);
      result = smoothed;
    }

    return result;
  };

  const redrawPath = (ctx: CanvasRenderingContext2D, points: Point[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    drawGrid(ctx, scale);
    drawReferenceLine(ctx);
    
    if (points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    updateScene3D(points);
  };

  const drawGrid = (context: CanvasRenderingContext2D, currentScale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gridSpacing10mm = 10 * currentScale;
    const gridSpacing1mm = currentScale;
    
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    
    context.strokeStyle = '#f0f0f0';
    context.lineWidth = 0.5;
    for (let x = 0; x <= canvas.width; x += gridSpacing1mm) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSpacing1mm) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }

    context.strokeStyle = '#d0d0d0';
    context.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += gridSpacing10mm) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
      
      context.fillStyle = '#666';
      context.font = '10px Arial';
      context.fillText(`${Math.round(x/currentScale)}`, x + 2, canvas.height - 2);
    }
    for (let y = 0; y <= canvas.height; y += gridSpacing10mm) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
      
      context.fillStyle = '#666';
      context.font = '10px Arial';
      context.fillText(`${Math.round((canvas.height - y)/currentScale)}`, 2, y - 2);
    }
    
    context.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const newScale = canvas.height / height;
      setScale(newScale);
      
      ctx.transform(1, 0, 0, -1, 0, canvas.height);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = selectedTool === 'lapis' ? 3 : 2;
      ctx.lineCap = 'round';
      
      drawGrid(ctx, newScale);
      drawReferenceLine(ctx);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (selectedTool !== 'lapis') return;
      isDrawing.current = true;
      currentPath.current = [];
      originalPath.current = [];
      const point = getCanvasPoint(e.clientX, e.clientY);
      lastPoint.current = point;
      currentPath.current.push(point);
      originalPath.current.push(point);
    };

    const getCanvasPoint = (clientX: number, clientY: number): Point => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = canvas.height - ((clientY - rect.top) * scaleY);
      const point = { x, y };
      return (snapToGrid || snapToCorners) ? snapToGridPoint(point) : point;
    };

    const snapToGridPoint = (point: Point): Point => {
      if (!snapToGrid && !snapToCorners) return point;
      
      const gridSize = snapToCorners ? scale * 10 : scale;
      return {
        x: Math.round(point.x / gridSize) * gridSize,
        y: Math.round(point.y / gridSize) * gridSize
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = canvas.height - ((e.clientY - rect.top) * (canvas.height / rect.height));
      setCoordinates({ x, y });
      
      if (!isDrawing.current || selectedTool !== 'lapis') return;
      
      const point = getCanvasPoint(e.clientX, e.clientY);
      currentPath.current.push(point);
      originalPath.current.push(point);

      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      lastPoint.current = point;
    };

    const handleMouseUp = () => {
      if (isDrawing.current && currentPath.current.length > 0) {
        const smoothedPath = smoothCurve(originalPath.current, smoothingIterations);
        redrawPath(ctx, smoothedPath);
        currentPath.current = smoothedPath;
      }
      isDrawing.current = false;
    };

    const handleMouseLeave = () => {
      if (isDrawing.current && currentPath.current.length > 0) {
        const smoothedPath = smoothCurve(originalPath.current, smoothingIterations);
        redrawPath(ctx, smoothedPath);
        currentPath.current = smoothedPath;
      }
      isDrawing.current = false;
      setCoordinates({ x: 0, y: 0 });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseout', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseout', handleMouseLeave);
    };
  }, [selectedTool, height, snapToGrid, snapToCorners, smoothingIterations, scale, radius]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx || currentPath.current.length === 0) return;

    const smoothedPath = smoothCurve(originalPath.current, smoothingIterations);
    redrawPath(ctx, smoothedPath);
    currentPath.current = smoothedPath;
  }, [smoothingIterations]);

  return (
    <div className="flex flex-col items-center w-full h-full">
      <div className="flex-grow flex items-center justify-center w-full">
        <canvas
          ref={canvasRef}
          className="w-[90%] h-[90%] bg-white border border-gray-300"
          style={{ cursor: 'crosshair' }}
        />
      </div>
      <div className="text-sm text-gray-600 mt-2">
        <div>Cursor: x: {formatCoordinate(coordinates.x)}mm, y: {formatCoordinate(coordinates.y)}mm</div>
      </div>
    </div>
  );
}