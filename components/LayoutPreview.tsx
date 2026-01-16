
import React from 'react';
import { LayoutSpec, ElementType, SketchElement } from '../types';

interface LayoutPreviewProps {
  spec: LayoutSpec | null;
}

const LayoutPreview: React.FC<LayoutPreviewProps> = ({ spec }) => {
  if (!spec || spec.elements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-400 p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-lg font-medium">Ready for input</p>
        <p className="text-sm">List your screen sizes to generate artboards</p>
      </div>
    );
  }

  // Calculate canvas size to fit all artboards
  const artboards = spec.elements.filter(e => e.type === ElementType.ARTBOARD);
  
  const totalWidth = artboards.reduce((max, art) => Math.max(max, art.x + art.width), 0) + 100;
  const totalHeight = artboards.reduce((max, art) => Math.max(max, art.y + art.height), 0) + 100;

  // Zoom factor to keep it visible
  const zoom = Math.min(800 / totalWidth, 600 / totalHeight, 0.5);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-auto p-8 bg-slate-200 rounded-xl border border-slate-300">
      <div 
        className="relative"
        style={{ 
          width: `${totalWidth}px`, 
          height: `${totalHeight}px`, 
          transform: `scale(${zoom})`,
          transformOrigin: 'top left'
        }}
      >
        <svg width={totalWidth} height={totalHeight} viewBox={`0 0 ${totalWidth} ${totalHeight}`}>
          {/* Render Artboards First */}
          {artboards.map((art) => (
            <g key={art.id}>
              <rect
                x={art.x}
                y={art.y}
                width={art.width}
                height={art.height}
                fill="white"
                stroke="#cbd5e1"
                strokeWidth="1"
                filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
              />
              <text
                x={art.x}
                y={art.y - 10}
                fontSize="12"
                fontWeight="bold"
                fill="#64748b"
              >
                {art.name} ({art.width}x{art.height})
              </text>
            </g>
          ))}

          {/* Render Layers inside Artboards */}
          {spec.elements.filter(e => e.type !== ElementType.ARTBOARD).map((el) => {
            const parent = artboards.find(a => a.id === el.parentId);
            const absX = (parent?.x || 0) + el.x;
            const absY = (parent?.y || 0) + el.y;

            if (el.type === ElementType.TEXT) {
              return (
                <text
                  key={el.id}
                  x={absX}
                  y={absY + (el.fontSize || 14)}
                  fill={el.color || '#333'}
                  fontSize={el.fontSize || 14}
                  fontFamily="sans-serif"
                >
                  {el.text || el.name}
                </text>
              );
            }

            return (
              <rect
                key={el.id}
                x={absX}
                y={absY}
                width={el.width}
                height={el.height}
                fill={el.color || '#e2e8f0'}
                stroke="#94a3b8"
                strokeWidth="0.5"
                fillOpacity={0.8}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default LayoutPreview;
