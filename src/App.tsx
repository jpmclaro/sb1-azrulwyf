import React, { useState } from 'react';
import { Eye, Palette, Settings, Repeat, Grid as GridIcon, Download } from 'lucide-react';
import { BottomTabs } from './components/TabPanel';
import { DrawingCanvas } from './components/DrawingCanvas';
import { DrawCanvasPoly } from './components/DrawCanvasPoly';
import { DrawCanvasBezier } from './components/DrawCanvasBezier';
import { Scene3D } from './components/Scene3D';

export default function App() {
  const [selectedTool, setSelectedTool] = useState('lapis');
  const [height, setHeight] = useState(300);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapToCorners, setSnapToCorners] = useState(false);
  const [smoothingIterations, setSmoothingIterations] = useState(0);

  const renderCanvas = () => {
    switch (selectedTool) {
      case 'polyline':
        return (
          <DrawCanvasPoly
            height={height}
            snapToGrid={snapToGrid}
            snapToCorners={snapToCorners}
          />
        );
      case 'bezier':
        return (
          <DrawCanvasBezier
            height={height}
            snapToGrid={snapToGrid}
            snapToCorners={snapToCorners}
          />
        );
      default:
        return (
          <DrawingCanvas 
            selectedTool={selectedTool} 
            height={height}
            snapToGrid={snapToGrid}
            snapToCorners={snapToCorners}
            smoothingIterations={smoothingIterations}
          />
        );
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      <div className="w-3/4 bg-white shadow-lg flex flex-col">
        <div className="flex-grow">
          <Scene3D />
        </div>
        <div className="h-1/4 border-t bg-gray-50">
          <BottomTabs 
            onHeightChange={setHeight} 
            height={height}
            onSnapToGridChange={setSnapToGrid}
            snapToGrid={snapToGrid}
          />
        </div>
      </div>
      <div className="w-1/4 bg-white shadow-lg flex flex-col">
        <div className="flex-grow p-4 flex items-center justify-center">
          {renderCanvas()}
        </div>
        <div className="h-1/4 border-t bg-gray-50 p-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTool('lapis')}
                className={`flex-1 px-3 py-2 rounded ${
                  selectedTool === 'lapis' ? 'bg-blue-500 text-white' : 'bg-white border'
                }`}
              >
                Lápis
              </button>
              <button
                onClick={() => setSelectedTool('polyline')}
                className={`flex-1 px-3 py-2 rounded ${
                  selectedTool === 'polyline' ? 'bg-blue-500 text-white' : 'bg-white border'
                }`}
              >
                Polyline
              </button>
              <button
                onClick={() => setSelectedTool('bezier')}
                className={`flex-1 px-3 py-2 rounded ${
                  selectedTool === 'bezier' ? 'bg-blue-500 text-white' : 'bg-white border'
                }`}
              >
                Bezier
              </button>
            </div>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={snapToCorners}
                onChange={(e) => setSnapToCorners(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Snap to Corners (10mm)</span>
            </label>
            {selectedTool === 'lapis' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  Smoothing Iterations: {smoothingIterations}
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={smoothingIterations}
                  onChange={(e) => setSmoothingIterations(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}