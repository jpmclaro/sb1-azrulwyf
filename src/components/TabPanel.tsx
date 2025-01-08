import React, { useState } from 'react';
import { Settings, Repeat, Grid, Download } from 'lucide-react';
import { exportToSTL } from '../utils/exportSTL';
import { exportToOBJ } from '../utils/exportOBJ';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

interface BottomTabsProps {
  height: number;
  onHeightChange: (height: number) => void;
  snapToGrid: boolean;
  onSnapToGridChange: (snap: boolean) => void;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div className={value === index ? 'block h-full' : 'hidden'}>
      {children}
    </div>
  );
}

export function BottomTabs({ height, onHeightChange, snapToGrid, onSnapToGridChange }: BottomTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [revolutionCycles, setRevolutionCycles] = useState(180);
  const [wfHeight, setWfHeight] = useState(0);
  const [showWireframe, setShowWireframe] = useState(false);
  const [closureTop, setClosureTop] = useState(false);
  const [closureBase, setClosureBase] = useState(false);
  const [doubleClosure, setDoubleClosure] = useState(false);
  const [layerValue, setLayerValue] = useState(1);
  const [useCustomRadius, setUseCustomRadius] = useState(false);
  const [customRadius, setCustomRadius] = useState(10);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'points') {
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

  const handleClosureTopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setClosureTop(value);
    localStorage.setItem('closureTop', value.toString());
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'closureTop',
      newValue: value.toString()
    }));
  };

  const handleClosureBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setClosureBase(value);
    localStorage.setItem('closureBase', value.toString());
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'closureBase',
      newValue: value.toString()
    }));
  };

  const handleDoubleClosureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setDoubleClosure(value);
    localStorage.setItem('doubleClosure', value.toString());
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'doubleClosure',
      newValue: value.toString()
    }));
  };

  const handleCustomRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Number(e.target.value));
    setCustomRadius(value);
    localStorage.setItem('customRadius', value.toString());
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'customRadius',
      newValue: value.toString()
    }));
  };

  const handleUseCustomRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setUseCustomRadius(value);
    localStorage.setItem('useCustomRadius', value.toString());
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'useCustomRadius',
      newValue: value.toString()
    }));
  };

  const handleRevolutionCyclesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setRevolutionCycles(value);
    localStorage.setItem('revolutionCycles', value.toString());
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'revolutionCycles',
      newValue: value.toString()
    }));
  };

  const handleWfHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setWfHeight(value);
    localStorage.setItem('wfHeight', value.toString());
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'wfHeight',
      newValue: value.toString()
    }));
  };

  const handleWireframeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setShowWireframe(value);
    localStorage.setItem('showWireframe', value.toString());
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'showWireframe',
      newValue: value.toString()
    }));
  };

  const handleLayerValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Number(e.target.value));
    setLayerValue(value);
    localStorage.setItem('layerValue', value.toString());
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'layerValue',
      newValue: value.toString()
    }));
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(100, Math.min(2000, Number(e.target.value)));
    onHeightChange(value);
  };

  const handleExportSTL = () => {
    if (points.length < 2) {
      alert('Please draw a curve before exporting');
      return;
    }
    exportToSTL(
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
  };

  const handleExportOBJ = () => {
    if (points.length < 2) {
      alert('Please draw a curve before exporting');
      return;
    }
    exportToOBJ(
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
  };

  React.useEffect(() => {
    onHeightChange(200);
  }, []);

  const tabs = [
    { label: 'Parametros', icon: <Settings size={16} /> },
    { label: 'Fechamento', icon: <Repeat size={16} /> },
    { label: 'Padroes', icon: <Grid size={16} /> },
    { label: 'Exportar', icon: <Download size={16} /> }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`flex items-center gap-1 px-4 py-2 border-r ${
              activeTab === index 
                ? 'bg-white border-b-2 border-b-blue-500 -mb-[2px]' 
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1 p-2 overflow-hidden">
        <TabPanel value={activeTab} index={0}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Altura (mm)</label>
              <input 
                type="number"
                min="100"
                max="2000"
                value={height}
                onChange={handleHeightChange}
                className="w-full px-2 py-1 border rounded text-sm" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ciclos de Revolução</label>
              <input 
                type="number" 
                value={revolutionCycles}
                onChange={handleRevolutionCyclesChange}
                className="w-full px-2 py-1 border rounded text-sm" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Altura WF</label>
              <input 
                type="number" 
                value={wfHeight}
                onChange={handleWfHeightChange}
                className="w-full px-2 py-1 border rounded text-sm" 
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => onSnapToGridChange(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">Snap to Grid</span>
              </label>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={showWireframe}
                  onChange={handleWireframeChange}
                  className="rounded"
                />
                <span className="text-sm font-medium">Show Wireframe</span>
              </label>
            </div>
          </div>
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={closureTop}
                onChange={handleClosureTopChange}
                className="rounded"
              />
              <span className="text-sm font-medium">Fechamento Topo</span>
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={closureBase}
                  onChange={handleClosureBaseChange}
                  className="rounded"
                />
                <span className="text-sm font-medium">Fechamento Base</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useCustomRadius}
                  onChange={handleUseCustomRadiusChange}
                  className="rounded"
                />
                <span className="text-sm font-medium">Furo na Base</span>
              </label>
              {useCustomRadius && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Raio:</span>
                  <input
                    type="number"
                    min="1"
                    value={customRadius}
                    onChange={handleCustomRadiusChange}
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={doubleClosure}
                  onChange={handleDoubleClosureChange}
                  className="rounded"
                />
                <span className="text-sm font-medium">Fechamento Duplo</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Camada:</span>
                <input
                  type="number"
                  min="1"
                  value={layerValue}
                  onChange={handleLayerValueChange}
                  className="w-20 px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
          </div>
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <div className="grid grid-cols-3 gap-2">
            <button className="p-2 border rounded hover:bg-gray-50 text-sm">Cubo</button>
            <button className="p-2 border rounded hover:bg-gray-50 text-sm">Esfera</button>
            <button className="p-2 border rounded hover:bg-gray-50 text-sm">Cilindro</button>
          </div>
        </TabPanel>
        
        <TabPanel value={activeTab} index={3}>
          <div className="space-y-2">
            <button 
              onClick={handleExportSTL}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Exportar como STL
            </button>
            <button 
              onClick={handleExportOBJ}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Exportar como OBJ
            </button>
          </div>
        </TabPanel>
      </div>
    </div>
  );
}