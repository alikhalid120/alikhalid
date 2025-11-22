import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Bubble, BubbleType, CleanPatch } from '../types';
import { Move, Trash2, Eraser, ChevronUp, ChevronDown } from 'lucide-react';

interface WorkspaceProps {
  imageSrc: string | null;
  bubbles: Bubble[];
  cleanPatches?: CleanPatch[]; 
  selectedBubbleId: string | null;
  onBubbleUpdate: (bubble: Bubble) => void;
  onBubbleSelect: (id: string | null) => void;
  onBubbleAdd: (x: number, y: number) => void;
  onBubbleDelete: (id: string) => void;
  onBubbleLayerChange: (id: string, direction: 'forward' | 'backward') => void;
  isManualDetectMode: boolean;
  onManualDetectClick: (x: number, y: number) => void;
  manualPoints: { x: number; y: number }[];
  isCleaningMode: boolean; 
  onCleanAreaSelect: (x: number, y: number, w: number, h: number) => void;
  isArabicEnhanced: boolean;
  showGrid: boolean; 
  isMovementLocked: boolean; 
  hideBorders?: boolean;
}

const Workspace: React.FC<WorkspaceProps> = ({
  imageSrc,
  bubbles,
  cleanPatches = [],
  selectedBubbleId,
  onBubbleUpdate,
  onBubbleSelect,
  onBubbleAdd,
  onBubbleDelete,
  onBubbleLayerChange,
  isManualDetectMode,
  onManualDetectClick,
  manualPoints,
  isCleaningMode,
  onCleanAreaSelect,
  isArabicEnhanced,
  showGrid,
  isMovementLocked,
  hideBorders = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'nw', 'ne', 'sw', 'se'
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialDims, setInitialDims] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  
  // Selection Box State for Cleaning Mode
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Helper to get coords relative to container percentage
  const getRelativeCoords = (e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    
    // Check for touch event
    if ('touches' in e || 'changedTouches' in e) {
         const evt = e as any;
         const touch = evt.touches[0] || evt.changedTouches[0];
         clientX = touch.clientX;
         clientY = touch.clientY;
    } else {
         clientX = (e as any).clientX;
         clientY = (e as any).clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  const handleInputStart = (e: React.MouseEvent | React.TouchEvent, bubble: Bubble | null, action: 'move' | 'resize' | 'bg', handle?: string) => {
    // Handle Cleaning Mode Selection Start
    if (isCleaningMode && action === 'bg') {
       // Don't prevent default here to allow potential scroll start, handled in move
       const coords = getRelativeCoords(e);
       setSelectionStart(coords);
       setCurrentSelection({ x: coords.x, y: coords.y, w: 0, h: 0 });
       return;
    }

    if (isManualDetectMode && action === 'bg') {
       return;
    }

    if (!bubble) return; 

    if (isCleaningMode || isManualDetectMode) return;
    
    // Check Movement Lock for Dragging
    if (isMovementLocked && action === 'move') {
        onBubbleSelect(bubble.id);
        return;
    }
    
    e.stopPropagation();
    onBubbleSelect(bubble.id);
    const coords = getRelativeCoords(e);
    setDragStart(coords);
    setInitialDims({ x: bubble.x, y: bubble.y, w: bubble.width, h: bubble.height });
    
    if (action === 'move') {
      setDraggingId(bubble.id);
    } else {
      setResizingId(bubble.id);
      setResizeHandle(handle || 'se');
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (draggingId || resizingId || selectionStart) return; 
    
    const coords = getRelativeCoords(e);
    if (coords.x > 0 && coords.x < 100 && coords.y > 0 && coords.y < 100) {
      if (isManualDetectMode) {
        onManualDetectClick(coords.x, coords.y);
      } else if (!isCleaningMode) {
        if (selectedBubbleId) {
          onBubbleSelect(null);
        }
      }
    }
  };

  const handleInputMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;
    
    // Prevent scrolling on touch devices when dragging/resizing/selecting
    if ((draggingId || resizingId || selectionStart) && 'touches' in e && e.cancelable) {
        e.preventDefault();
    }

    const current = getRelativeCoords(e);

    // Cleaning Mode Selection Drag
    if (isCleaningMode && selectionStart) {
        const w = current.x - selectionStart.x;
        const h = current.y - selectionStart.y;
        
        setCurrentSelection({
            x: w < 0 ? current.x : selectionStart.x,
            y: h < 0 ? current.y : selectionStart.y,
            w: Math.abs(w),
            h: Math.abs(h)
        });
        return;
    }

    if (!dragStart || !initialDims) return;

    const deltaX = current.x - dragStart.x;
    const deltaY = current.y - dragStart.y;

    if (draggingId) {
      const bubble = bubbles.find(b => b.id === draggingId);
      if (bubble) {
        onBubbleUpdate({
          ...bubble,
          x: initialDims.x + deltaX,
          y: initialDims.y + deltaY
        });
      }
    } else if (resizingId) {
      const bubble = bubbles.find(b => b.id === resizingId);
      if (bubble) {
        let newX = initialDims.x;
        let newY = initialDims.y;
        let newW = initialDims.w;
        let newH = initialDims.h;

        if (resizeHandle?.includes('e')) newW = Math.max(3, initialDims.w + deltaX);
        if (resizeHandle?.includes('w')) {
          const w = Math.max(3, initialDims.w - deltaX);
          newX = initialDims.x + (initialDims.w - w);
          newW = w;
        }
        if (resizeHandle?.includes('s')) newH = Math.max(3, initialDims.h + deltaY);
        if (resizeHandle?.includes('n')) {
          const h = Math.max(3, initialDims.h - deltaY);
          newY = initialDims.y + (initialDims.h - h);
          newH = h;
        }

        onBubbleUpdate({ ...bubble, x: newX, y: newY, width: newW, height: newH });
      }
    }
  }, [draggingId, resizingId, resizeHandle, dragStart, initialDims, bubbles, onBubbleUpdate, isCleaningMode, selectionStart]);

  const handleInputEnd = useCallback(() => {
    // Finish Cleaning Selection
    if (isCleaningMode && selectionStart && currentSelection) {
        if (currentSelection.w > 1 && currentSelection.h > 1) {
            onCleanAreaSelect(currentSelection.x, currentSelection.y, currentSelection.w, currentSelection.h);
        }
        setSelectionStart(null);
        setCurrentSelection(null);
        return;
    }

    setDraggingId(null);
    setResizingId(null);
    setResizeHandle(null);
    setDragStart(null);
    setInitialDims(null);
    setSelectionStart(null); 
  }, [isCleaningMode, selectionStart, currentSelection, onCleanAreaSelect]);

  useEffect(() => {
    if (draggingId || resizingId || (isCleaningMode && selectionStart)) {
      window.addEventListener('mousemove', handleInputMove);
      window.addEventListener('mouseup', handleInputEnd);
      // Passive: false is crucial to allow e.preventDefault() to stop scrolling
      window.addEventListener('touchmove', handleInputMove, { passive: false }); 
      window.addEventListener('touchend', handleInputEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleInputMove);
      window.removeEventListener('mouseup', handleInputEnd);
      window.removeEventListener('touchmove', handleInputMove);
      window.removeEventListener('touchend', handleInputEnd);
    };
  }, [draggingId, resizingId, selectionStart, isCleaningMode, handleInputMove, handleInputEnd]);


  if (!imageSrc) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 border-2 border-dashed border-slate-700 m-4 rounded-xl">
        <p className="text-slate-500 text-lg">قم برفع صورة للبدء</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-900 relative touch-none">
      <div 
        id="comic-canvas"
        ref={containerRef}
        className={`relative shadow-2xl shadow-black transition-all 
            ${isManualDetectMode ? 'cursor-crosshair ring-2 ring-blue-500' : ''}
            ${isCleaningMode ? 'cursor-crosshair ring-2 ring-rose-500' : ''}
        `}
        style={{ width: 'fit-content', height: 'fit-content' }}
        onMouseDown={(e) => handleInputStart(e, null, 'bg')}
        onTouchStart={(e) => handleInputStart(e, null, 'bg')}
        onClick={handleBackgroundClick}
      >
        <img 
          src={imageSrc} 
          alt="Workspace" 
          className="max-w-full max-h-[80vh] pointer-events-none select-none object-contain block" 
        />

        {/* Grid Overlay */}
        {showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none z-[5]" 
            style={{ 
                backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '5% 5%' 
            }} 
            data-html2canvas-ignore
          />
        )}

        {/* Clean Patches (Whitened Areas) */}
        {cleanPatches.map(patch => (
            <img 
                key={patch.id}
                src={`data:image/png;base64,${patch.imageBase64}`}
                className="absolute pointer-events-none z-[5]"
                style={{
                    left: `${patch.x}%`,
                    top: `${patch.y}%`,
                    width: `${patch.width}%`,
                    height: `${patch.height}%`,
                    objectFit: 'cover'
                }}
                alt="clean patch"
            />
        ))}

        {/* Active Selection Box (Cleaning Mode) */}
        {isCleaningMode && currentSelection && (
            <div 
                className="absolute border-2 border-rose-500 bg-rose-500/20 z-50 pointer-events-none"
                style={{
                    left: `${currentSelection.x}%`,
                    top: `${currentSelection.y}%`,
                    width: `${currentSelection.w}%`,
                    height: `${currentSelection.h}%`,
                }}
            />
        )}

        {/* Manual Detection Markers */}
        {manualPoints.map((pt, idx) => (
          <div 
            key={`marker-${idx}`}
            className="absolute w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-sm z-50 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 animate-bounce"
            style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
          />
        ))}

        {/* Bubble Overlays */}
        {bubbles.map((bubble, index) => {
          const isSelected = bubble.id === selectedBubbleId;
          
          let borderColor = 'border-blue-400';
          let borderStyle = isSelected ? 'border-solid' : 'border-dashed';
          let bgStyle = isSelected ? 'bg-white/10' : 'bg-transparent';
          let borderWidth = 'border-2';

          // Style Adjustments based on type
          if (bubble.type === BubbleType.SHOUT) borderColor = 'border-red-500';
          else if (bubble.type === BubbleType.SUN) borderColor = 'border-orange-500';
          else if (bubble.type === BubbleType.THOUGHT) borderColor = 'border-purple-400';
          else if (bubble.type === BubbleType.SQUARE) borderColor = 'border-emerald-400';
          else if (bubble.type === BubbleType.WHISPER) {
             borderColor = 'border-slate-400';
             borderStyle = 'border-dashed';
          } else if (bubble.type === BubbleType.MASK) {
             // No visible border for mask mode unless selected
             borderColor = isSelected ? 'border-blue-400' : 'border-transparent';
             bgStyle = isSelected ? 'bg-blue-400/10' : 'bg-transparent';
             borderStyle = 'border-dashed';
          }

          if (hideBorders) {
             borderColor = 'border-transparent';
          }

          return (
            <div
              key={bubble.id}
              style={{
                position: 'absolute',
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                width: `${bubble.width}%`,
                height: `${bubble.height}%`,
                zIndex: isSelected ? 10 : 6, // Bubbles above clean patches
                pointerEvents: (isManualDetectMode || isCleaningMode) ? 'none' : 'auto'
              }}
              className={`group ${borderWidth} ${borderColor} ${borderStyle} opacity-100 hover:bg-white/5 ${bgStyle} transition-colors duration-150 data-html2canvas-ignore-border`}
              onMouseDown={(e) => handleInputStart(e, bubble, 'move')}
              onTouchStart={(e) => handleInputStart(e, bubble, 'move')}
            >
               {/* Order Badge */}
               {(!isManualDetectMode && !isCleaningMode) && (
                <div 
                    className="absolute -top-3 -left-3 bg-slate-800 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full shadow-md border border-slate-600 z-40"
                    data-html2canvas-ignore
                >
                    {index + 1}
                </div>
              )}

              {/* Center Helper Lines */}
              {isSelected && !isManualDetectMode && !isCleaningMode && (
                <>
                  <div className="absolute top-1/2 left-0 w-full h-[1px] bg-blue-400/30 pointer-events-none" data-html2canvas-ignore></div>
                  <div className="absolute left-1/2 top-0 h-full w-[1px] bg-blue-400/30 pointer-events-none" data-html2canvas-ignore></div>
                </>
              )}

               {/* Padding Indicator */}
               {isSelected && !isManualDetectMode && !isCleaningMode && (
                <div 
                  className="absolute border border-emerald-400/30 border-dashed pointer-events-none"
                  style={{
                    top: `${bubble.style.padding}%`,
                    left: `${bubble.style.padding}%`,
                    right: `${bubble.style.padding}%`,
                    bottom: `${bubble.style.padding}%`,
                  }}
                  data-html2canvas-ignore
                />
              )}

              {/* Content Preview Inside Bubble */}
              <div 
                className="w-full h-full overflow-hidden pointer-events-none relative z-10"
                style={{
                  padding: `${bubble.style.padding}%`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AutoFitText bubble={bubble} isArabicEnhanced={isArabicEnhanced} />
              </div>

              {/* Controls */}
              {isSelected && !isManualDetectMode && !isCleaningMode && (
                <div data-html2canvas-ignore>
                  {/* Action Bar */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1 bg-slate-800 rounded-md shadow-md border border-slate-700 p-1 z-30 items-center">
                    {!isMovementLocked && (
                        <div className="p-1 rounded hover:bg-slate-700 cursor-move text-blue-400" title="تحريك">
                        <Move size={14} />
                        </div>
                    )}
                    
                    <div className="w-[1px] h-4 bg-slate-700 mx-1" />

                    {/* Layer Controls */}
                    <button 
                        className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
                        onClick={(e) => { e.stopPropagation(); onBubbleLayerChange(bubble.id, 'forward'); }}
                        title="إحضار للمقدمة"
                    >
                        <ChevronUp size={14} />
                    </button>
                    <button 
                        className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
                        onClick={(e) => { e.stopPropagation(); onBubbleLayerChange(bubble.id, 'backward'); }}
                        title="إرسال للخلف"
                    >
                        <ChevronDown size={14} />
                    </button>
                    
                    <div className="w-[1px] h-4 bg-slate-700 mx-1" />

                    <button 
                      className="p-1 rounded hover:bg-red-900/30 cursor-pointer text-red-400"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onBubbleDelete(bubble.id);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        onBubbleDelete(bubble.id);
                      }}
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Resize Handles - Only if not locked (optional, usually resizing is fine even if move locked, but let's allow) */}
                  {['nw', 'ne', 'sw', 'se'].map((handle) => (
                    <div
                      key={handle}
                      className={`absolute w-4 h-4 bg-white border border-blue-500 rounded-full shadow-sm z-20
                        ${handle === 'nw' ? '-top-2 -left-2 cursor-nw-resize' : ''}
                        ${handle === 'ne' ? '-top-2 -right-2 cursor-ne-resize' : ''}
                        ${handle === 'sw' ? '-bottom-2 -left-2 cursor-sw-resize' : ''}
                        ${handle === 'se' ? '-bottom-2 -right-2 cursor-se-resize' : ''}
                      `}
                      onMouseDown={(e) => handleInputStart(e, bubble, 'resize', handle)}
                      onTouchStart={(e) => handleInputStart(e, bubble, 'resize', handle)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AutoFitText: React.FC<{ bubble: Bubble, isArabicEnhanced: boolean }> = ({ bubble, isArabicEnhanced }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current || !bubble.style.isAutoFit) {
      setScale(1);
      return;
    }

    const container = containerRef.current;
    const parent = container.parentElement;
    if (!parent) return;

    container.style.transform = `scale(1)`;
    const contentHeight = container.scrollHeight;
    const contentWidth = container.scrollWidth;
    const availableHeight = parent.clientHeight;
    const availableWidth = parent.clientWidth;

    if (!bubble.text.trim()) return;

    let newScale = 1;
    if (contentHeight > availableHeight || contentWidth > availableWidth) {
       const heightRatio = availableHeight / contentHeight;
       const widthRatio = availableWidth / contentWidth;
       newScale = Math.min(heightRatio, widthRatio) * 0.90; 
    }

    setScale(Math.max(newScale, 0.15)); 
  }, [bubble.text, bubble.style, bubble.width, bubble.height]);

  return (
    <div 
      ref={containerRef}
      data-autofit-text="true"
      dir={bubble.style.direction}
      style={{
        fontFamily: bubble.style.fontFamily,
        fontSize: `${bubble.style.fontSize}px`,
        fontWeight: bubble.style.fontWeight,
        color: bubble.style.color,
        textAlign: bubble.style.align,
        textWrap: bubble.style.textWrap, 
        lineHeight: bubble.style.lineHeight,
        direction: bubble.style.direction,
        whiteSpace: 'pre-wrap',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: bubble.style.align === 'center' ? 'center' : (bubble.style.align === 'right' ? 'flex-end' : 'flex-start'),
        transformOrigin: 'center center',
        transform: `scale(${scale})`,
        transformBox: 'fill-box', // Ensure transform is relative to the element box
        width: '100%', 
        height: 'auto', 
        maxHeight: '100%',
        margin: 'auto', // Important for flex centering stability during export
        // Arabic optimizations
        textRendering: isArabicEnhanced ? 'optimizeLegibility' : 'auto',
        fontFeatureSettings: isArabicEnhanced ? '"kern" 1, "liga" 1, "calt" 1' : 'normal'
      }}
    >
      {bubble.text || <span className="text-gray-400 italic text-sm opacity-50 pointer-events-none select-none">...</span>}
    </div>
  );
};

export default Workspace;