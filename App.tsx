import React, { useState, useCallback, useEffect } from 'react';
import { Bubble, DEFAULT_BUBBLE_STYLE, HistoryState, CleanPatch, BubbleType, TextStyle } from './types';
import Workspace from './components/Workspace';
import Toolbar from './components/Toolbar';
import { detectBubblesInImage, detectSingleBubble, identifyBubbleType, cleanImageArea, translateText, fixGrammar, shortenText } from './services/geminiService';
import { TYPE_STYLE_PRESETS, INITIAL_FONTS } from './constants';
import { Upload, Image as ImageIcon } from 'lucide-react';

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  // State with History
  const [state, setState] = useState<HistoryState>({ bubbles: [], cleanPatches: [] });
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);
  
  // Presets State (Customizable Styles)
  const [bubblePresets, setBubblePresets] = useState<Record<BubbleType, Partial<TextStyle>>>(TYPE_STYLE_PRESETS);

  // Global Settings
  const [fontList, setFontList] = useState(INITIAL_FONTS);
  const [isArabicEnhanced, setIsArabicEnhanced] = useState(false);
  
  // Optional Tools
  const [showGrid, setShowGrid] = useState(false);
  const [isMovementLocked, setIsMovementLocked] = useState(false);
  const [showBordersOnExport, setShowBordersOnExport] = useState(true);
  const [lockTextOnExport, setLockTextOnExport] = useState(false);

  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isManualDetectMode, setIsManualDetectMode] = useState(false);
  const [isAnalyzingType, setIsAnalyzingType] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFixingGrammar, setIsFixingGrammar] = useState(false);
  const [isShorteningText, setIsShorteningText] = useState(false);

  // Cleaning Tool State
  const [isCleaningMode, setIsCleaningMode] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // State for batch manual detection points
  const [manualPoints, setManualPoints] = useState<{x: number, y: number}[]>([]);

  // Update State Helper
  const updateStateWithHistory = (newState: HistoryState | ((prev: HistoryState) => HistoryState)) => {
    setState(prev => {
      const next = typeof newState === 'function' ? newState(prev) : newState;
      if (next === prev) return prev;
      
      setPast(oldPast => [...oldPast, prev]);
      setFuture([]); 
      return next;
    });
  };

  const updateBubbles = (newBubbles: Bubble[] | ((prev: Bubble[]) => Bubble[])) => {
     updateStateWithHistory(prev => ({
         ...prev,
         bubbles: typeof newBubbles === 'function' ? newBubbles(prev.bubbles) : newBubbles
     }));
  };

  const handlePresetUpdate = (type: BubbleType, updates: Partial<TextStyle>) => {
    setBubblePresets(prev => ({
      ...prev,
      [type]: { ...prev[type], ...updates }
    }));
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setPast(newPast);
    setFuture(oldFuture => [state, ...oldFuture]);
    setState(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setFuture(newFuture);
    setPast(oldPast => [...oldPast, state]);
    setState(next);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageSrc(event.target.result);
        setState({ bubbles: [], cleanPatches: [] });
        setPast([]);
        setFuture([]);
        setSelectedBubbleId(null);
        setIsManualDetectMode(false);
        setManualPoints([]);
        setIsCleaningMode(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const fontName = file.name.replace(/\.(ttf|otf)$/i, '');
      const fontFace = new FontFace(fontName, buffer);
      
      await fontFace.load();
      document.fonts.add(fontFace);

      setFontList(prev => [...prev, { name: fontName, value: fontName }]);
      alert(`تم إضافة الخط: ${fontName}`);
    } catch (err) {
      console.error("Failed to load font", err);
      alert("فشل تحميل ملف الخط. تأكد من أنه بصيغة TTF أو OTF صالحة.");
    }
  };

  const handleTranslate = async () => {
    if (!selectedBubbleId) return;
    const bubble = state.bubbles.find(b => b.id === selectedBubbleId);
    if (!bubble || !bubble.text) return;

    setIsTranslating(true);
    const translated = await translateText(bubble.text);
    
    if (translated) {
      handlePartialUpdate({ text: translated });
    }
    setIsTranslating(false);
  };

  const handleFixGrammar = async () => {
    if (!selectedBubbleId) return;
    const bubble = state.bubbles.find(b => b.id === selectedBubbleId);
    if (!bubble || !bubble.text) return;

    setIsFixingGrammar(true);
    const fixed = await fixGrammar(bubble.text);
    
    if (fixed) {
      handlePartialUpdate({ text: fixed });
    }
    setIsFixingGrammar(false);
  };

  const handleShortenText = async () => {
    if (!selectedBubbleId) return;
    const bubble = state.bubbles.find(b => b.id === selectedBubbleId);
    if (!bubble || !bubble.text) return;

    setIsShorteningText(true);
    const shortened = await shortenText(bubble.text);
    
    if (shortened) {
      handlePartialUpdate({ text: shortened });
    }
    setIsShorteningText(false);
  };

  const handleAutoDetect = async () => {
    if (!imageSrc) return;
    
    setIsDetecting(true);
    const base64Data = imageSrc.split(',')[1];
    
    const detectedBubbles = await detectBubblesInImage(base64Data);
    
    updateBubbles(detectedBubbles);
    setIsDetecting(false);
  };

  const handleManualDetectClick = (x: number, y: number) => {
    if (!imageSrc || !isManualDetectMode) return;
    setManualPoints(prev => [...prev, { x, y }]);
  };

  const handleProcessManualPoints = async () => {
    if (!imageSrc || manualPoints.length === 0) return;

    setIsDetecting(true);
    const base64Data = imageSrc.split(',')[1];

    try {
      const promises = manualPoints.map(pt => detectSingleBubble(base64Data, pt.x, pt.y));
      const results = await Promise.all(promises);

      const newBubbles: Bubble[] = [];
      results.forEach((b) => {
        if (b) {
          newBubbles.push(b);
        }
      });

      if (newBubbles.length > 0) {
        updateBubbles(prev => [...prev, ...newBubbles]);
      }
    } catch (err) {
      console.error("Batch detection error:", err);
    } finally {
      setIsDetecting(false);
      setManualPoints([]);
      setIsManualDetectMode(false);
      setSelectedBubbleId(null);
    }
  };

  const handleSuggestType = async () => {
    if (!imageSrc || !selectedBubbleId) return;
    
    const selectedBubble = state.bubbles.find(b => b.id === selectedBubbleId);
    if (!selectedBubble) return;

    setIsAnalyzingType(true);
    const base64Data = imageSrc.split(',')[1];
    
    const suggestedType = await identifyBubbleType(
      base64Data, 
      selectedBubble.x, 
      selectedBubble.y, 
      selectedBubble.width, 
      selectedBubble.height
    );

    if (suggestedType) {
      handlePartialUpdate({ type: suggestedType });
    }
    
    setIsAnalyzingType(false);
  };

  const handleBulkTextDistribute = (bulkText: string) => {
    if (!bulkText.trim() || state.bubbles.length === 0) return;

    const segments = bulkText.split(/\n\s*\n/).map(s => s.trim()).filter(s => s.length > 0);

    if (segments.length === 0) return;

    // Sort bubbles spatially: Top to Bottom, then Right to Left (for Arabic reading flow)
    const sortedBubbles = [...state.bubbles].sort((a, b) => {
        const Y_THRESHOLD = 5; // Percentage threshold to consider bubbles on same "line"
        
        // If Y difference is significant, sort by Y (Top -> Bottom)
        if (Math.abs(a.y - b.y) > Y_THRESHOLD) {
            return a.y - b.y; 
        }
        
        // If roughly same Y, sort by X (Right -> Left for Arabic)
        return b.x - a.x;
    });

    const updatedBubbles = sortedBubbles.map((bubble, index) => {
        if (index < segments.length) {
            return {
                ...bubble,
                text: segments[index]
            };
        }
        return bubble;
    });

    updateBubbles(updatedBubbles);
    alert(`تم توزيع ${Math.min(segments.length, updatedBubbles.length)} مقطع نصي على الفقاعات (ترتيب: أعلى-أسفل، يمين-يسار).`);
  };

  const handleCleanArea = async (x: number, y: number, w: number, h: number) => {
    if (!imageSrc) return;
    
    setIsCleaning(true);

    try {
        const img = new Image();
        img.src = imageSrc;
        await new Promise(resolve => { img.onload = resolve });

        const canvas = document.createElement('canvas');
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        const pxX = (x / 100) * naturalWidth;
        const pxY = (y / 100) * naturalHeight;
        const pxW = (w / 100) * naturalWidth;
        const pxH = (h / 100) * naturalHeight;

        canvas.width = pxW;
        canvas.height = pxH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");

        ctx.drawImage(img, pxX, pxY, pxW, pxH, 0, 0, pxW, pxH);
        const croppedBase64 = canvas.toDataURL('image/jpeg').split(',')[1];

        const cleanedBase64 = await cleanImageArea(croppedBase64);

        if (cleanedBase64) {
            const newPatch: CleanPatch = {
                id: `clean-${Date.now()}`,
                x, y, width: w, height: h,
                imageBase64: cleanedBase64
            };
            
            updateStateWithHistory(prev => ({
                ...prev,
                cleanPatches: [...prev.cleanPatches, newPatch]
            }));
        } else {
            alert("فشلت عملية التنظيف. حاول مرة أخرى.");
        }

    } catch (err) {
        console.error("Cleaning error:", err);
    } finally {
        setIsCleaning(false);
        setIsCleaningMode(false); 
    }
  };

  const handleBubbleUpdate = (updatedBubble: Bubble) => {
    updateBubbles(prev => prev.map(b => b.id === updatedBubble.id ? updatedBubble : b));
  };

  const handlePartialUpdate = (updates: Partial<Bubble>) => {
    if (!selectedBubbleId) return;
    updateBubbles(prev => prev.map(b => 
      b.id === selectedBubbleId ? { ...b, ...updates } : b
    ));
  };

  const handleBubbleDelete = (id: string) => {
    updateBubbles(prev => prev.filter(b => b.id !== id));
    if (selectedBubbleId === id) setSelectedBubbleId(null);
  };

  const handleBubbleLayerChange = (id: string, direction: 'forward' | 'backward') => {
    updateBubbles(prev => {
      const index = prev.findIndex(b => b.id === id);
      if (index === -1) return prev;

      const newBubbles = [...prev];
      const [bubble] = newBubbles.splice(index, 1);

      if (direction === 'forward') {
        newBubbles.push(bubble);
      } else {
        newBubbles.unshift(bubble);
      }
      
      return newBubbles;
    });
  };

  const handleBubbleAdd = (x: number, y: number) => {
    const newBubble: Bubble = {
      id: `manual-${Date.now()}`,
      x: x - 10,
      y: y - 5,
      width: 20,
      height: 15,
      text: '',
      type: 'normal' as any,
      style: { ...DEFAULT_BUBBLE_STYLE, ...bubblePresets[BubbleType.NORMAL] }
    };
    updateBubbles(prev => [...prev, newBubble]);
    setSelectedBubbleId(newBubble.id);
  };

  // --- Export Logic ---

  const hexToRgb = (hex: string) => {
    if (!hex) return { r: 0, g: 0, b: 0 };
    
    // Remove leading hash
    hex = hex.replace(/^#/, '');

    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  const handleExportPSD = async () => {
    if (!window.agPsd) {
      alert("مكتبة PSD غير جاهزة. يرجى تحديث الصفحة.");
      return;
    }
    if (!imageSrc) return;
    
    setIsExporting(true);
    
    // YIELD TO UI THREAD to allow the "Preparing..." spinner to appear
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
        // Robust Image Loader with Timeout
        const loadImagePromise = (src: string, timeout = 15000): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                const timer = setTimeout(() => {
                   img.src = ""; // Cancel loading
                   reject(new Error("Timeout loading image"));
                }, timeout);

                img.onload = () => {
                    clearTimeout(timer);
                    resolve(img);
                };
                img.onerror = (e) => {
                    clearTimeout(timer);
                    console.warn("Image failed to load", src.substring(0, 50));
                    reject(new Error("Image load failed"));
                };
                img.src = src;
            });
        };

        // Helper to detect mime type from base64 signature
        const getBase64Src = (b64: string) => {
            // Check for common signatures
            if (b64.startsWith('/9j/')) return `data:image/jpeg;base64,${b64}`;
            if (b64.startsWith('iVBOR')) return `data:image/png;base64,${b64}`;
            // Default to png if unknown
            return `data:image/png;base64,${b64}`;
        };

        // Load main image
        let img: HTMLImageElement;
        try {
          img = await loadImagePromise(imageSrc);
        } catch (e) {
          throw new Error("فشل تحميل الصورة الأصلية. قد تكون الصورة تالفة أو كبيرة جداً.");
        }
        
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        // 1. Background Layer
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = width;
        bgCanvas.height = height;
        const bgCtx = bgCanvas.getContext('2d');
        if (!bgCtx) throw new Error("Canvas context creation failed");
        
        bgCtx.drawImage(img, 0, 0);

        const children: any[] = [
            { 
              name: 'Background', 
              canvas: bgCanvas 
            }
        ];

        // 2. Clean Patches (Whitening Layers)
        // Safely iterate patches even if array is undefined
        const patches = state.cleanPatches || [];
        for (let i = 0; i < patches.length; i++) {
            const patch = patches[i];
            if (!patch.imageBase64) continue;

            try {
                const patchSrc = getBase64Src(patch.imageBase64);
                const patchImg = await loadImagePromise(patchSrc);
                
                // Ensure integers for PSD
                const pxX = Math.round((patch.x / 100) * width);
                const pxY = Math.round((patch.y / 100) * height);
                const pxW = Math.round((patch.width / 100) * width);
                const pxH = Math.round((patch.height / 100) * height);

                const patchCanvas = document.createElement('canvas');
                patchCanvas.width = Math.max(1, pxW);
                patchCanvas.height = Math.max(1, pxH);
                const pCtx = patchCanvas.getContext('2d');
                if (pCtx) {
                    pCtx.drawImage(patchImg, 0, 0, patchCanvas.width, patchCanvas.height);
                }

                children.push({
                    name: `Whitening Patch ${i + 1}`,
                    canvas: patchCanvas,
                    left: pxX,
                    top: pxY
                });
            } catch (err) {
                console.warn(`Skipping patch ${i} due to load error`, err);
                // Don't crash export if a patch fails
            }
        }

        // 3. Bubbles Visual Layer (Rasterized Shapes)
        if (showBordersOnExport) {
            const bubblesCanvas = document.createElement('canvas');
            bubblesCanvas.width = width;
            bubblesCanvas.height = height;
            const bCtx = bubblesCanvas.getContext('2d');
            
            if (bCtx) {
                 state.bubbles.forEach(b => {
                    if (b.type === BubbleType.MASK) return; // Masks are invisible
                    
                    const x = (b.x / 100) * width;
                    const y = (b.y / 100) * height;
                    const w = (b.width / 100) * width;
                    const h = (b.height / 100) * height;
                    
                    bCtx.beginPath();
                    bCtx.lineWidth = 3; 
                    
                    // Styles matches Workspace.tsx
                    if (b.type === BubbleType.SHOUT) bCtx.strokeStyle = '#dc2626';
                    else if (b.type === BubbleType.SUN) bCtx.strokeStyle = '#ea580c';
                    else if (b.type === BubbleType.THOUGHT) bCtx.strokeStyle = '#a855f7';
                    else if (b.type === BubbleType.SQUARE) bCtx.strokeStyle = '#34d399';
                    else if (b.type === BubbleType.WHISPER) {
                        bCtx.strokeStyle = '#94a3b8';
                        bCtx.setLineDash([10, 10]);
                    }
                    else bCtx.strokeStyle = '#60a5fa'; 

                    // Visual Approximation for PSD
                    if (b.type === BubbleType.SQUARE || b.type === BubbleType.SHOUT) {
                         bCtx.rect(x, y, w, h);
                    } else {
                         bCtx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, 2 * Math.PI);
                    }
                    bCtx.stroke();
                    bCtx.setLineDash([]);
                 });
            }

            children.push({ name: 'Bubble Visuals', canvas: bubblesCanvas });
        }

        // Helper to map alignment
        const mapJustification = (align: string): 'left' | 'right' | 'center' => {
             if (align === 'right') return 'right';
             if (align === 'left') return 'left';
             return 'center'; // Default for justify or center
        };

        // 4. Text Layers
        state.bubbles.forEach((b, i) => {
             if (!b.text || !b.text.trim()) return;

             const x = Math.round((b.x / 100) * width);
             const y = Math.round((b.y / 100) * height);
             const w = Math.round((b.width / 100) * width);
             const h = Math.round((b.height / 100) * height);

             // Safe color check
             const rgbColor = hexToRgb(b.style.color);

             // Use standard font fallback
             const fontName = b.style.fontFamily || 'Arial';

             children.push({
                name: `Bubble ${i+1} - ${b.text.substring(0, 10)}...`,
                text: {
                    text: b.text,
                    font: { name: fontName },
                    fontSize: b.style.fontSize * 2.5, // Scaling factor
                    color: rgbColor,
                    justification: mapJustification(b.style.align)
                },
                left: Math.round(x + w/2), 
                top: Math.round(y + h/2)
             });
        });

        const psd = { 
            width, 
            height, 
            children,
            imageResources: { resolutionInfo: { horizontalResolution: 72, verticalResolution: 72 } }
        };
        
        const buffer = window.agPsd.writePsd(psd);
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'comic-export.psd';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up memory
        URL.revokeObjectURL(url);

    } catch (e: any) {
        console.error("PSD Export Error:", e);
        alert(`فشل تصدير PSD: ${e.message || "حدث خطأ غير متوقع"}`);
    } finally {
        setIsExporting(false);
    }
  };

  const handleExport = async (format: 'png' | 'jpeg' | 'webp' | 'psd') => {
    if (format === 'psd') {
        await handleExportPSD();
        return;
    }

    if (!window.html2canvas) return;
    const element = document.getElementById('comic-canvas');
    if (!element) return;

    setIsExporting(true);
    setSelectedBubbleId(null); 
    
    // Ensure fonts are loaded before capture
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const canvas = await window.html2canvas(element, {
        backgroundColor: null, 
        scale: 3, // Higher scale for text clarity
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: -window.scrollY, // FIX: Account for window scroll so text doesn't shift
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight,
        letterRendering: 1, // Fix for Arabic disconnected letters
        ignoreElements: (element: Element) => {
            return element.classList.contains('interface-ui') || element.hasAttribute('data-html2canvas-ignore');
        },
        onclone: (clonedDoc: Document) => {
            // Apply specific fixes to text elements in the cloned DOM
            const textElements = clonedDoc.querySelectorAll('[data-autofit-text="true"]');
            textElements.forEach((el: any) => {
                 el.style.textRendering = 'auto'; // Optimize for canvas drawing
                 el.style.fontVariantLigatures = 'none';
                 el.style.whiteSpace = 'pre-wrap';

                 // Conditionally apply strict locking fixes based on user setting
                 if (lockTextOnExport) {
                     // Force normal spacing to prevent exploded text in html2canvas
                     el.style.letterSpacing = 'normal';
                     el.style.wordSpacing = 'normal';
                     
                     // html2canvas struggles with justify, force center for safer bubble export
                     if (el.style.textAlign === 'justify') {
                         el.style.textAlign = 'center';
                     }

                     el.style.margin = '0'; // Prevent unexpected margins in export
                     el.style.transformOrigin = 'center center'; // Ensure scaling happens from center
                 }
            });
        }
      });

      const link = document.createElement('a');
      link.download = `comic-export.${format}`;
      link.href = canvas.toDataURL(`image/${format}`);
      link.click();
    } catch (err) {
      console.error("Export failed", err);
      alert("فشل تصدير الصورة.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [past, future, state]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white font-sans">
      <header className="h-14 border-b border-slate-800 flex items-center px-6 justify-between bg-slate-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20">
            AI
          </div>
          <h1 className="font-bold text-lg tracking-wide">ComicBubble <span className="text-slate-400 font-normal">Typesetter</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
           <label className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md cursor-pointer transition-all text-sm">
             <Upload size={16} />
             <span>رفع صورة</span>
             <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
           </label>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <Toolbar 
          selectedBubble={state.bubbles.find(b => b.id === selectedBubbleId) || null}
          onUpdateBubble={handlePartialUpdate}
          onAutoDetect={handleAutoDetect}
          isDetecting={isDetecting}
          onExport={handleExport}
          isExporting={isExporting}
          isManualDetectMode={isManualDetectMode}
          onToggleManualDetect={() => {
             if (!imageSrc) return;
             if (isManualDetectMode) setManualPoints([]);
             setIsManualDetectMode(!isManualDetectMode);
             setIsCleaningMode(false);
             setSelectedBubbleId(null); 
          }}
          onSuggestType={handleSuggestType}
          isAnalyzingType={isAnalyzingType}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          manualPointsCount={manualPoints.length}
          onProcessManualPoints={handleProcessManualPoints}
          isCleaningMode={isCleaningMode}
          onToggleCleaningMode={() => {
              if (!imageSrc) return;
              setIsCleaningMode(!isCleaningMode);
              setIsManualDetectMode(false);
              setSelectedBubbleId(null);
          }}
          isCleaning={isCleaning}
          presets={bubblePresets}
          onUpdatePreset={handlePresetUpdate}
          fontList={fontList}
          onUploadFont={handleFontUpload}
          onTranslate={handleTranslate}
          isTranslating={isTranslating}
          isArabicEnhanced={isArabicEnhanced}
          onToggleArabicEnhancement={() => setIsArabicEnhanced(!isArabicEnhanced)}
          onBulkText={handleBulkTextDistribute}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
          isMovementLocked={isMovementLocked}
          onToggleMovementLock={() => setIsMovementLocked(!isMovementLocked)}
          onFixGrammar={handleFixGrammar}
          isFixingGrammar={isFixingGrammar}
          onShortenText={handleShortenText}
          isShorteningText={isShorteningText}
          showBordersOnExport={showBordersOnExport}
          onToggleShowBordersOnExport={() => setShowBordersOnExport(!showBordersOnExport)}
          lockTextOnExport={lockTextOnExport}
          onToggleLockTextOnExport={() => setLockTextOnExport(!lockTextOnExport)}
        />

        <Workspace 
          imageSrc={imageSrc}
          bubbles={state.bubbles}
          cleanPatches={state.cleanPatches}
          selectedBubbleId={selectedBubbleId}
          onBubbleUpdate={handleBubbleUpdate}
          onBubbleSelect={setSelectedBubbleId}
          onBubbleAdd={handleBubbleAdd}
          onBubbleDelete={handleBubbleDelete}
          onBubbleLayerChange={handleBubbleLayerChange}
          isManualDetectMode={isManualDetectMode}
          onManualDetectClick={handleManualDetectClick}
          manualPoints={manualPoints}
          isCleaningMode={isCleaningMode}
          onCleanAreaSelect={handleCleanArea}
          isArabicEnhanced={isArabicEnhanced}
          showGrid={showGrid}
          isMovementLocked={isMovementLocked}
          hideBorders={isExporting && !showBordersOnExport}
        />
      </main>
    </div>
  );
};

export default App;