export function exportToSTL(
  points: { x: number; y: number }[], 
  revolutionCycles: number,
  wfHeight: number,
  closureTop: boolean = false,
  closureBase: boolean = false,
  doubleClosure: boolean = false,
  layerValue: number = 1,
  useCustomRadius: boolean = false,
  customRadius: number = 0
): void {
  if (points.length < 2) {
    console.error('Not enough points to generate STL');
    return;
  }

  // Create geometry with closures
  const geometry = createRevolutionGeometry(
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