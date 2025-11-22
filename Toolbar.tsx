import React, { useState } from 'react';
import { Bubble, BubbleType, DEFAULT_BUBBLE_STYLE, TextStyle } from '../types';
import { BUBBLE_TYPES_CONFIG, PRESET_TEXTS } from '../constants';
import { AlignCenter, AlignLeft, AlignRight, Type, Layers, Wand2, Save, Download, ArrowLeft, MousePointerClick, Sparkles, Undo, Redo, Check, Eraser, AlignJustify, Diamond, Box, Settings, X, Languages, Upload, FileText, Image, FileType, Grid, Lock, SpellCheck, Scissors, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface ToolbarProps {
  selectedBubble: Bubble | null;
  onUpdateBubble: (updates: Partial<Bubble>) => void;
  onAutoDetect: () => void;
  isDetecting: boolean;
  onExport: (format: 'png' | 'jpeg' | 'webp' | 'psd') => void;
  isExporting: boolean;
  isManualDetectMode: boolean;
  onToggleManualDetect: () => void;
  onSuggestType: () => void;
  isAnalyzingType: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  manualPointsCount: number;
  onProcessManualPoints: () => void;
  isCleaningMode: boolean;
  onToggleCleaningMode: () => void;
  isCleaning: boolean;
  presets: Record<BubbleType, Partial<TextStyle>>;
  onUpdatePreset: (type: BubbleType, style: Partial<TextStyle>) => void;
  fontList: { name: string, value: string }[];
  onUploadFont: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTranslate: () => void;
  isTranslating: boolean;
  isArabicEnhanced: boolean;
  onToggleArabicEnhancement: () => void;
  onBulkText: (text: string) => void;
  
  // New Props
  showGrid: boolean;
  onToggleGrid: () => void;
  isMovementLocked: boolean;
  onToggleMovementLock: () => void;
  onFixGrammar: () => void;
  isFixingGrammar: boolean;
  onShortenText: () => void;
  isShorteningText: boolean;
  showBordersOnExport: boolean;
  onToggleShowBordersOnExport: () => void;
  lockTextOnExport: boolean;
  onToggleLockTextOnExport: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  selectedBubble, 
  onUpdateBubble, 
  onAutoDetect,
  isDetecting,
  onExport,
  isExporting,
  isManualDetectMode,
  onToggleManualDetect,
  onSuggestType,
  isAnalyzingType,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  manualPointsCount,
  onProcessManualPoints,
  isCleaningMode,
  onToggleCleaningMode,
  isCleaning,
  presets,
  onUpdatePreset,
  fontList,
  onUploadFont,
  onTranslate,
  isTranslating,
  isArabicEnhanced,
  onToggleArabicEnhancement,
  onBulkText,
  showGrid,
  onToggleGrid,
  isMovementLocked,
  onToggleMovementLock,
  onFixGrammar,
  isFixingGrammar,
  onShortenText,
  isShorteningText,
  showBordersOnExport,
  onToggleShowBordersOnExport,
  lockTextOnExport,
  onToggleLockTextOnExport
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'style'>('text');
  const [inputText, setInputText] = useState('');

  // Preset Editing Mode State
  const [isPresetMode, setIsPresetMode] = useState(false);
  const [activePresetType, setActivePresetType] = useState<BubbleType>(BubbleType.NORMAL);

  // Bulk Text Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  React.useEffect(() => {
    if (selectedBubble) {
      setInputText(selectedBubble.text);
    } else {
      setInputText('');
    }
  }, [selectedBubble?.id]); 

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setInputText(newText);
    if (selectedBubble) {
      onUpdateBubble({ text: newText });
    }
  };

  const getCurrentStyle = (): TextStyle => {
    if (isPresetMode) {
      return { ...DEFAULT_BUBBLE_STYLE, ...presets[activePresetType] };
    }
    return selectedBubble ? selectedBubble.style : DEFAULT_BUBBLE_STYLE;
  };

  const currentStyle = getCurrentStyle();

  const updateStyle = (key: keyof TextStyle, value: any) => {
    if (isPresetMode) {
      onUpdatePreset(activePresetType, { [key]: value });
    } else if (selectedBubble) {
      onUpdateBubble({
        style: {
          ...selectedBubble.style,
          [key]: value
        }
      });
    }
  };

  const handleBulkSubmit = () => {
    if (bulkInput.trim()) {
      onBulkText(bulkInput);
      setBulkInput('');
      setShowBulkModal(false);
    }
  };

  const HeaderControls = () => (
    <div className="flex gap-1 mb-4 justify-center border-b border-slate-800 pb-4">
      <button 
        onClick={onUndo} 
        disabled={!canUndo || isPresetMode}
        className="p-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="تراجع"
      >
        <Undo size={16} />
      </button>
      <button 
        onClick={onRedo} 
        disabled={!canRedo || isPresetMode}
        className="p-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="إعادة"
      >
        <Redo size={16} />
      </button>
    </div>
  );

  if (!selectedBubble && !isPresetMode) {
    return (
      <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col p-4 text-slate-300">
        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
          <Layers size={20} />
          أدوات التحكم
        </h2>
        
        <HeaderControls />

        <div className="space-y-4">
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3">
            <h3 className="font-semibold mb-2 text-slate-200">الذكاء الاصطناعي</h3>
            <div>
              <p className="text-xs text-slate-400 mb-2">كشف تلقائي عن كل الفقاعات</p>
              <button
                onClick={onAutoDetect}
                disabled={isDetecting || isManualDetectMode || isCleaningMode}
                className={`w-full py-2 px-4 rounded-md flex items-center justify-center gap-2 font-medium transition-colors ${
                  isDetecting && !isManualDetectMode && !isCleaning
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <Wand2 size={16} className={isDetecting && !isManualDetectMode && !isCleaning ? 'animate-spin' : ''} />
                {isDetecting && !isManualDetectMode && !isCleaning ? 'جاري التحليل...' : 'كشف تلقائي'}
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2">كشف يدوي (تحديد نقاط)</p>
              <button
                onClick={manualPointsCount > 0 ? onProcessManualPoints : onToggleManualDetect}
                disabled={(isDetecting && !isManualDetectMode) || isCleaningMode}
                className={`w-full py-2 px-4 rounded-md flex items-center justify-center gap-2 font-medium transition-colors border ${
                  manualPointsCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white' 
                    : isManualDetectMode 
                      ? 'bg-blue-900/50 border-blue-500 text-blue-200' 
                      : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'
                } ${isDetecting && isManualDetectMode ? 'cursor-wait opacity-70' : ''}`}
              >
                {isDetecting && isManualDetectMode ? (
                  <>
                    <Wand2 size={16} className="animate-spin" />
                    <span>جاري المعالجة...</span>
                  </>
                ) : manualPointsCount > 0 ? (
                  <>
                    <Check size={16} />
                    <span>تنفيذ ({manualPointsCount})</span>
                  </>
                ) : (
                  <>
                    <MousePointerClick size={16} />
                    <span>{isManualDetectMode ? 'اضغط فوق الفقاعات...' : 'تحديد يدوي'}</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2">تبييض/إخفاء نص (AI)</p>
              <button
                onClick={onToggleCleaningMode}
                disabled={isDetecting || isManualDetectMode}
                className={`w-full py-2 px-4 rounded-md flex items-center justify-center gap-2 font-medium transition-colors border ${
                  isCleaningMode
                    ? 'bg-rose-900/50 border-rose-500 text-rose-200'
                    : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'
                }`}
              >
                {isCleaning ? (
                    <>
                         <Sparkles size={16} className="animate-spin" />
                         <span>جاري التنظيف...</span>
                    </>
                ) : (
                    <>
                        <Eraser size={16} />
                        <span>{isCleaningMode ? 'حدد النص للإخفاء...' : 'أداة التبييض'}</span>
                    </>
                )}
              </button>
            </div>
          </div>
          
           <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
             <h3 className="font-semibold mb-2 text-slate-200">الإعدادات العامة</h3>
             <button
              onClick={() => setIsPresetMode(true)}
              className="w-full py-2 px-4 mt-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md flex items-center justify-center gap-2 border border-slate-600"
             >
               <Settings size={16} />
               <span>تخصيص الأنماط الافتراضية</span>
             </button>

             <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
               <label className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md flex items-center justify-center gap-2 border border-slate-600 cursor-pointer transition-colors">
                 <Upload size={16} />
                 <span>إضافة خطوط (TTF)</span>
                 <input 
                    type="file" 
                    accept=".ttf,.otf" 
                    onChange={onUploadFont} 
                    className="hidden" 
                 />
               </label>

               <div className="flex items-center justify-between pt-2">
                 <span className="text-xs text-slate-400">تحسين النص العربي</span>
                 <input 
                   type="checkbox" 
                   checked={isArabicEnhanced}
                   onChange={onToggleArabicEnhancement}
                   className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                 />
               </div>

               <div className="flex items-center justify-between pt-2">
                 <span className="text-xs text-slate-400">إظهار حدود الفقاعات عند التصدير</span>
                 <input 
                   type="checkbox" 
                   checked={showBordersOnExport}
                   onChange={onToggleShowBordersOnExport}
                   className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                 />
               </div>

               <div className="flex items-center justify-between pt-2">
                 <div className="flex items-center gap-1 text-xs text-slate-400" title="يمنع تحرك النص وزيادة المسافات عند التصدير">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span>قفل تخطيط النص عند التصدير</span>
                 </div>
                 <input 
                   type="checkbox" 
                   checked={lockTextOnExport}
                   onChange={onToggleLockTextOnExport}
                   className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                 />
               </div>
               
                <button
                    onClick={() => setShowBulkModal(true)}
                    className="w-full py-2 px-4 mt-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md flex items-center justify-center gap-2 border border-slate-600"
                >
                    <FileText size={16} />
                    <span>إدخال نص مجمع</span>
                </button>
             </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
             <h3 className="font-semibold mb-2 text-slate-200 flex items-center gap-2">
                أدوات ذكية ومساعدة <span className="text-xs text-slate-500 font-normal">(اختياري)</span>
             </h3>
             <div className="space-y-3">
                <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2 text-slate-300">
                    <Grid size={16} />
                    <span className="text-sm">شبكة محاذاة</span>
                 </div>
                 <input 
                   type="checkbox" 
                   checked={showGrid}
                   onChange={onToggleGrid}
                   className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                 />
               </div>

               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2 text-slate-300">
                    <Lock size={16} />
                    <span className="text-sm">قفل تحريك الفقاعات</span>
                 </div>
                 <input 
                   type="checkbox" 
                   checked={isMovementLocked}
                   onChange={onToggleMovementLock}
                   className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                 />
               </div>
             </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
             <h3 className="font-semibold mb-2 text-slate-200">تصدير العمل</h3>
             <div className="grid grid-cols-2 gap-2">
                 <button
                  onClick={() => onExport('png')}
                  disabled={isExporting}
                  className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-md flex items-center justify-center gap-2 text-xs font-bold"
                 >
                   <Download size={14} />
                   PNG
                 </button>
                 <button
                  onClick={() => onExport('jpeg')}
                  disabled={isExporting}
                  className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-md flex items-center justify-center gap-2 text-xs font-bold"
                 >
                   <Download size={14} />
                   JPG
                 </button>
                 <button
                  onClick={() => onExport('webp')}
                  disabled={isExporting}
                  className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-md flex items-center justify-center gap-2 text-xs font-bold"
                 >
                   <Download size={14} />
                   WEBP
                 </button>
                 <button
                  onClick={() => onExport('psd')}
                  disabled={isExporting}
                  className="py-2 px-3 bg-blue-700 hover:bg-blue-600 text-white rounded-md flex items-center justify-center gap-2 text-xs font-bold shadow-lg shadow-blue-900/30 col-span-1"
                  title="تصدير كملف فوتوشوب قابل للتعديل"
                 >
                   <Layers size={14} />
                   PSD
                 </button>
             </div>
             {isExporting && <p className="text-[10px] text-center mt-2 text-emerald-400 animate-pulse">جاري تحضير الملف...</p>}
          </div>
        </div>

        {showBulkModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[500px] max-w-[90%] shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <FileText className="text-blue-500" />
                        إدخال نص مجمع (توزيع تلقائي)
                    </h3>
                    <textarea
                        value={bulkInput}
                        onChange={(e) => setBulkInput(e.target.value)}
                        placeholder="ألصق النص هنا..."
                        className="w-full h-60 bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-blue-500 resize-none mb-4 font-sans"
                        dir="rtl"
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setShowBulkModal(false)}
                            className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                        >
                            إلغاء
                        </button>
                        <button 
                            onClick={handleBulkSubmit}
                            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 font-bold"
                        >
                            توزيع النص
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className={`w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full ${isPresetMode ? 'ring-2 ring-inset ring-orange-500' : ''}`}>
      <div className={`p-4 border-b border-slate-800 ${isPresetMode ? 'bg-orange-900/20' : ''}`}>
        <div className="flex justify-between items-center">
            <h2 className={`text-lg font-bold mb-1 ${isPresetMode ? 'text-orange-400' : 'text-white'}`}>
                {isPresetMode ? 'تعديل الأنماط الافتراضية' : 'تعديل الفقاعة'}
            </h2>
            {isPresetMode ? (
                <button 
                    onClick={() => setIsPresetMode(false)}
                    className="p-1 hover:bg-orange-900/40 rounded text-orange-400"
                    title="إغلاق الإعدادات"
                >
                    <X size={20} />
                </button>
            ) : (
                 <button 
                    onClick={() => setIsPresetMode(true)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="إعدادات الأنماط"
                >
                    <Settings size={18} />
                </button>
            )}
        </div>

        {!isPresetMode && (
            <div className="flex gap-2 mt-3">
            <button 
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${activeTab === 'text' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
                النص
            </button>
            <button 
                onClick={() => setActiveTab('style')}
                className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${activeTab === 'style' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
                التنسيق
            </button>
            </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {!isPresetMode && <HeaderControls />}

        <div>
          <div className="flex justify-between items-end mb-2">
            <label className={`block text-xs font-medium ${isPresetMode ? 'text-orange-400' : 'text-slate-400'}`}>
                {isPresetMode ? 'اختر نوعاً لتعديل إعداداته' : 'نوع الفقاعة'}
            </label>
            {!isPresetMode && (
                <button 
                onClick={onSuggestType}
                disabled={isAnalyzingType}
                className="text-[10px] flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors bg-slate-800/50 px-2 py-0.5 rounded hover:bg-slate-800"
                title="تحليل النوع بالذكاء الاصطناعي"
                >
                <Sparkles size={12} className={isAnalyzingType ? "animate-spin" : ""} />
                <span>اقتراح AI</span>
                </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {BUBBLE_TYPES_CONFIG.map((type) => {
                const isActive = isPresetMode ? activePresetType === type.id : selectedBubble?.type === type.id;
                return (
                    <button
                        key={type.id}
                        onClick={() => {
                            if (isPresetMode) {
                                setActivePresetType(type.id as BubbleType);
                            } else {
                                const preset = presets[type.id as BubbleType];
                                onUpdateBubble({ 
                                    type: type.id,
                                    style: { ...selectedBubble!.style, ...preset } 
                                });
                            }
                        }}
                        className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                        isActive
                            ? (isPresetMode ? 'bg-orange-600/20 border-orange-500 text-orange-400' : 'bg-blue-600/20 border-blue-500 text-blue-400') 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                        title={type.label}
                    >
                        <span className="text-xl">{type.icon}</span>
                        <span className="text-[10px]">{type.label}</span>
                    </button>
                );
            })}
          </div>
          {isPresetMode && (
              <p className="text-[10px] text-orange-300/70 mt-2 text-center">
                  أي تغيير تجريه بالأسفل سيصبح الإعداد الافتراضي لهذا النوع.
              </p>
          )}
        </div>

        {(activeTab === 'text' && !isPresetMode) && (
          <>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-slate-400">المحتوى النصي</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="text-[10px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                        title="إدخال نص مجمع"
                    >
                        <FileText size={12} />
                        <span>نص مجمع</span>
                    </button>
                    <button
                        onClick={onTranslate}
                        disabled={isTranslating}
                        className="text-[10px] flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                        title="ترجمة تلقائية"
                    >
                        <Languages size={12} className={isTranslating ? "animate-pulse" : ""} />
                        {isTranslating ? '...' : 'ترجمة'}
                    </button>
                </div>
              </div>
              <textarea
                value={inputText}
                onChange={handleTextChange}
                dir="rtl"
                placeholder="اكتب النص هنا..."
                className="w-full h-40 bg-slate-950 border border-slate-700 rounded-md p-3 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans leading-relaxed"
              />
            </div>

             <div className="flex gap-2">
                <button
                    onClick={onFixGrammar}
                    disabled={!inputText.trim() || isFixingGrammar}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                >
                    <SpellCheck size={14} className={isFixingGrammar ? "animate-spin" : ""} />
                    {isFixingGrammar ? 'جاري التدقيق...' : 'تدقيق لغوي (AI)'}
                </button>
                <button
                    onClick={onShortenText}
                    disabled={!inputText.trim() || isShorteningText}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                >
                    <Scissors size={14} className={isShorteningText ? "animate-spin" : ""} />
                    {isShorteningText ? 'جاري الاختصار...' : 'اختصار النص (AI)'}
                </button>
             </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">عبارات جاهزة</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_TEXTS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const newVal = inputText ? inputText + '\n' + preset : preset;
                      setInputText(newVal);
                      onUpdateBubble({ text: newVal });
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

             <div>
               <label className="block text-xs font-medium text-slate-400 mb-2">محاذاة النص</label>
               <div className="flex bg-slate-800 rounded-md p-1 border border-slate-700">
                 <button 
                   onClick={() => updateStyle('align', 'right')}
                   className={`flex-1 p-1 rounded ${currentStyle.align === 'right' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                 >
                   <AlignRight size={16} className="mx-auto" />
                 </button>
                 <button 
                   onClick={() => updateStyle('align', 'center')}
                   className={`flex-1 p-1 rounded ${currentStyle.align === 'center' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                 >
                   <AlignCenter size={16} className="mx-auto" />
                 </button>
                 <button 
                   onClick={() => updateStyle('align', 'left')}
                   className={`flex-1 p-1 rounded ${currentStyle.align === 'left' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                 >
                   <AlignLeft size={16} className="mx-auto" />
                 </button>
                 <button 
                   onClick={() => updateStyle('align', 'justify')}
                   className={`flex-1 p-1 rounded ${currentStyle.align === 'justify' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                 >
                   <AlignJustify size={16} className="mx-auto" />
                 </button>
               </div>
             </div>
          </>
        )}

        {(activeTab === 'style' || isPresetMode) && (
          <div className="space-y-4">
            <div>
               <label className="block text-xs font-medium text-slate-400 mb-2">تشكيل النص</label>
               <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => {
                        updateStyle('textWrap', 'balance');
                        updateStyle('align', 'center');
                    }}
                    className={`p-2 rounded border flex flex-col items-center gap-1 ${
                        currentStyle.textWrap === 'balance' 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title="توزيع متوازن"
                  >
                      <Diamond size={18} />
                      <span className="text-[10px]">متوازن</span>
                  </button>

                   <button 
                    onClick={() => {
                        updateStyle('textWrap', 'pretty');
                        updateStyle('align', 'justify');
                    }}
                    className={`p-2 rounded border flex flex-col items-center gap-1 ${
                        currentStyle.textWrap === 'pretty' && currentStyle.align === 'justify'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title="توزيع كتلة"
                  >
                      <Box size={18} />
                      <span className="text-[10px]">كتلة</span>
                  </button>

                  <button 
                    onClick={() => {
                        updateStyle('textWrap', 'wrap');
                    }}
                    className={`p-2 rounded border flex flex-col items-center gap-1 ${
                        currentStyle.textWrap === 'wrap'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title="توزيع عادي"
                  >
                      <AlignLeft size={18} />
                      <span className="text-[10px]">عادي</span>
                  </button>
               </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                 <label className="block text-xs font-medium text-slate-400">الخط</label>
                 <label className="text-[10px] text-blue-400 flex items-center gap-1 cursor-pointer hover:text-blue-300">
                     <Upload size={10} />
                     استيراد خط
                     <input type="file" accept=".ttf,.otf" onChange={onUploadFont} className="hidden" />
                 </label>
              </div>
              <select 
                value={fontList.find(f => f.name === currentStyle.fontFamily)?.name || fontList[0].name}
                onChange={(e) => updateStyle('fontFamily', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded p-2"
              >
                {fontList.map(f => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">الحجم (px)</label>
                <input 
                  type="number" 
                  value={currentStyle.fontSize}
                  onChange={(e) => updateStyle('fontSize', parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded p-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">السمك</label>
                <select 
                  value={currentStyle.fontWeight}
                  onChange={(e) => updateStyle('fontWeight', parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded p-2"
                >
                  <option value="300">خفيف</option>
                  <option value="400">عادي</option>
                  <option value="700">عريض</option>
                  <option value="900">عريض جداً</option>
                </select>
              </div>
            </div>

             <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">هامش داخلي (%)</label>
                <input 
                  type="number" 
                  min="0"
                  max="40"
                  value={currentStyle.padding}
                  onChange={(e) => updateStyle('padding', parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded p-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">ارتفاع السطر</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={currentStyle.lineHeight}
                  onChange={(e) => updateStyle('lineHeight', parseFloat(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded p-2"
                />
              </div>
            </div>

            <div>
               <label className="block text-xs font-medium text-slate-400 mb-2">لون النص</label>
               <div className="flex items-center gap-2">
                 <input 
                    type="color" 
                    value={currentStyle.color}
                    onChange={(e) => updateStyle('color', e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border-0 p-0"
                 />
                 <span className="text-sm text-slate-300 font-mono">{currentStyle.color}</span>
               </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-800 rounded border border-slate-700">
               <span className="text-sm text-slate-300">احتواء تلقائي للنص</span>
               <input 
                  type="checkbox" 
                  checked={currentStyle.isAutoFit}
                  onChange={(e) => updateStyle('isAutoFit', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
               />
            </div>
          </div>
        )}

        {showBulkModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[500px] max-w-[90%] shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <FileText className="text-blue-500" />
                        إدخال نص مجمع
                    </h3>
                    <textarea
                        value={bulkInput}
                        onChange={(e) => setBulkInput(e.target.value)}
                        placeholder={`مثال:
مرحبا، كيف حالك؟

بخير، وأنت؟`}
                        className="w-full h-60 bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-blue-500 resize-none mb-4 font-sans"
                        dir="rtl"
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setShowBulkModal(false)}
                            className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                        >
                            إلغاء
                        </button>
                        <button 
                            onClick={handleBulkSubmit}
                            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 font-bold"
                        >
                            توزيع النص
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;