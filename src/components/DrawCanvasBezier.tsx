import React, { useRef, useEffect, useState } from 'react';
import { Undo } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface DrawCanvasBezierProps {
  height: number;
  snapToGrid?: boolean;
  snapToCorners?: boolean;
}

interface HistoryState {
  points: Point[];
}

export function DrawCanvasBezier({ 
  height, 
  snapToGrid = false, 
  snapToCorners = false
}: DrawCanvasBezierProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<Point[]>([]);
  const isDragging = useRef<number | null>(null);
  const [scale, setScale] = useState(1);
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [editX, setEditX] = useState('0');
  const [editY, setEditY] = useState('0');
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [radius, setRadius] = useState(100);

  const getBezierPoint = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
    const cx = 3 * (p1.x - p0.x);
    const bx = 3 * (p2.x - p1.x) - cx;
    const ax = p3.x - p0.x - cx - bx;
    
    const cy = 3 * (p1.y - p0.y);
    const by = 3 * (p2.y - p1.y) - cy;
    const ay = p3.y - p0.y - cy - by;
    
    const x = ax * Math.pow(t, 3) + bx * Math.pow(t, 2) + cx * t + p0.x;
    const y = ay * Math.pow(t, 3) + by * Math.pow(t, 2) + cy * t + p0.y;
    
    return { x, y };
  };

  const updateScene3D = (currentPoints: Point[]) => {
    if (currentPoints.length < 4) return;
    
    // Sample points along the bezier curve
    const samples = 50; // Number of samples along the curve
    const sampledPoints: Point[] = [];
    
    for (let t = 0; t <= 1; t += 1/samples) {
      const point = getBezierPoint(
        currentPoints[0],
        currentPoints[1],
        currentPoints[2],
        currentPoints[3],
        t
      );
      sampledPoints.push(point);
    }
    
    // Convert to millimeters
    const mmPoints = sampledPoints.map(p => ({
      x: p.x / scale,
      y: p.y / scale
    }));
    
    localStorage.setItem('points', JSON.stringify(mmPoints));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'points',
      newValue: JSON.stringify(mmPoints)
    }));
  };

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

  const hitTest = (point: Point, x: number, y: number) => {
    const hitRadius = 5;
    return Math.abs(point.x - x) <= hitRadius && Math.abs(point.y - y) <= hitRadius;
  };

  const drawBezierCurve = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    drawGrid(ctx, scale);
    drawReferenceLine(ctx);

    if (points.current.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = '#999';
      ctx.setLineDash([5, 5]);
      ctx.moveTo(points.current[0].x, points.current[0].y);
      ctx.lineTo(points.current[1].x, points.current[1].y);
      if (points.current.length >= 3) {
        ctx.moveTo(points.current[2].x, points.current[2].y);
        ctx.lineTo(points.current[3]?.x ?? points.current[2].x, points.current[3]?.y ?? points.current[2].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (points.current.length === 4) {
      ctx.beginPath();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.moveTo(points.current[0].x, points.current[0].y);
      ctx.bezierCurveTo(
        points.current[1].x, points.current[1].y,
        points.current[2].x, points.current[2].y,
        points.current[3].x, points.current[3].y
      );
      ctx.stroke();
      
      updateScene3D(points.current);
    }

    points.current.forEach((point, index) => {
      ctx.beginPath();
      ctx.fillStyle = index === 0 || index === 3 ? '#ff0000' : '#0000ff';
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
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

  const getCanvasPoint = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = canvas.height - ((clientY - rect.top) * scaleY);
    
    if (snapToGrid || snapToCorners) {
      const gridSize = snapToCorners ? scale * 10 : scale;
      return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize
      };
    }
    
    return { x, y };
  };

  const handlePointEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPoint === null) return;

    saveToHistory();
    const newX = Number(editX) * scale;
    const newY = Number(editY) * scale;
    
    points.current[selectedPoint] = { x: newX, y: newY };
    setShowPopup(false);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawBezierCurve(ctx);
  };

  const saveToHistory = () => {
    setHistory(prev => [...prev, { points: [...points.current] }]);
  };

  const undo = () => {
    if (history.length === 0) return;
    
    const previousState = history[history.length - 1];
    points.current = [...previousState.points];
    setHistory(prev => prev.slice(0, -1));
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawBezierCurve(ctx);
  };

  const formatCoordinate = (value: number): string => {
    return (value / scale).toFixed(2);
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
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      
      drawGrid(ctx, newScale);
      drawBezierCurve(ctx);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const point = getCanvasPoint(e.clientX, e.clientY);
        
        for (let i = 0; i < points.current.length; i++) {
          if (hitTest(points.current[i], point.x, point.y)) {
            isDragging.current = i;
            saveToHistory();
            return;
          }
        }

        if (points.current.length < 4) {
          saveToHistory();
          points.current.push(point);
          drawBezierCurve(ctx);
        }
      } else if (e.button === 2) {
        const point = getCanvasPoint(e.clientX, e.clientY);
        
        for (let i = 0; i < points.current.length; i++) {
          if (hitTest(points.current[i], point.x, point.y)) {
            setSelectedPoint(i);
            setEditX((points.current[i].x / scale).toFixed(2));
            setEditY((points.current[i].y / scale).toFixed(2));
            setShowPopup(true);
            e.preventDefault();
            return;
          }
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const point = getCanvasPoint(e.clientX, e.clientY);
      setCoordinates(point);
      
      if (isDragging.current !== null) {
        points.current[isDragging.current] = point;
        drawBezierCurve(ctx);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = null;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', e => e.preventDefault());
    };
  }, [height, snapToGrid, snapToCorners, scale, radius]);

  return (
    <div className="flex flex-col items-center w-full h-full relative">
      <div className="flex-grow flex items-center justify-center w-full">
        <canvas
          ref={canvasRef}
          className="w-[90%] h-[90%] bg-white border border-gray-300"
          style={{ cursor: 'crosshair' }}
        />
      </div>
      <div className="text-sm text-gray-600 mt-2 flex items-center gap-4">
        <div>Cursor: x: {formatCoordinate(coordinates.x)}mm, y: {formatCoordinate(coordinates.y)}mm</div>
        {history.length > 0 && (
          <button
            onClick={undo}
            className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
          >
            <Undo size={14} />
            <span>Undo</span>
          </button>
        )}
      </div>

      {showPopup && selectedPoint !== null && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg border">
          <form onSubmit={handlePointEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">X Coordinate (mm)</label>
              <input
                type="number"
                value={editX}
                onChange={(e) => setEditX(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Y Coordinate (mm)</label>
              <input
                type="number"
                value={editY}
                onChange={(e) => setEditY(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                step="0.1"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}