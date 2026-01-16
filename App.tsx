
import React, { useState, useEffect, useRef } from 'react';
import { parsePromptToLayout } from './services/geminiService';
import { generateSketchFile } from './services/sketchGenerator';
import { LayoutSpec } from './types';
import LayoutPreview from './components/LayoutPreview';

interface DimensionItem {
  id: string;
  name: string;
  width: number | '';
  height: number | '';
}

const App: React.FC = () => {
  const [items, setItems] = useState<DimensionItem[]>([
    { id: '1', name: '375*812', width: 375, height: 812 }
  ]);
  const [layoutSpec, setLayoutSpec] = useState<LayoutSpec | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensionTags, setDimensionTags] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load unique dimension tags from localStorage on mount
  useEffect(() => {
    const savedTags = localStorage.getItem('sketch_gen_dimension_tags');
    if (savedTags) {
      try {
        setDimensionTags(JSON.parse(savedTags));
      } catch (e) {
        console.error("Failed to parse tags", e);
      }
    }
  }, []);

  const saveToTags = (currentItems: DimensionItem[]) => {
    const validItems = currentItems.filter(it => typeof it.width === 'number' && typeof it.height === 'number');
    const currentStrings = validItems.map(it => `${it.width}*${it.height}`);
    // Only add if there are valid strings
    if (currentStrings.length === 0) return;
    
    const newTags = Array.from(new Set([...dimensionTags, ...currentStrings])).slice(0, 30);
    setDimensionTags(newTags);
    localStorage.setItem('sketch_gen_dimension_tags', JSON.stringify(newTags));
  };

  const addItem = (width: number | '' = '', height: number | '' = '', insertAtIndex?: number) => {
    const newItem: DimensionItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: width !== '' && height !== '' ? `${width}*${height}` : 'New Artboard',
      width,
      height
    };
    
    if (typeof insertAtIndex === 'number') {
      const newItems = [...items];
      newItems.splice(insertAtIndex, 0, newItem);
      setItems(newItems);
    } else {
      setItems(prev => [...prev, newItem]);
    }
    
    // Scroll to bottom after adding if it's appended or at the very end
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  const addTagToItems = (tag: string) => {
    const [w, h] = tag.split('*').map(Number);
    if (!isNaN(w) && !isNaN(h)) {
      // Find the first index that is un-filled
      const firstEmptyIndex = items.findIndex(it => it.width === '' || it.height === '');
      if (firstEmptyIndex !== -1) {
        addItem(w, h, firstEmptyIndex);
      } else {
        addItem(w, h);
      }
    }
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      // If only one left, reset to empty instead of removing
      setItems([{ id: '1', name: 'New Artboard', width: '', height: '' }]);
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const clearCurrentItems = () => {
    // Reset the active items list to a single empty entry
    // This does NOT modify dimensionTags (history)
    setItems([{ id: '1', name: 'New Artboard', width: '', height: '' }]);
    setLayoutSpec(null);
  };

  const clearHistoryTags = () => {
    setDimensionTags([]);
    localStorage.removeItem('sketch_gen_dimension_tags');
  };

  const updateItem = (id: string, field: 'width' | 'height', value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const numericVal = value === '' ? '' : parseInt(value);
        const newItem = { ...item, [field]: numericVal };
        // Sync name if both are numbers
        if (typeof newItem.width === 'number' && typeof newItem.height === 'number') {
          newItem.name = `${newItem.width}*${newItem.height}`;
        } else {
          newItem.name = 'New Artboard';
        }
        return newItem;
      }
      return item;
    }));
  };

  const handleGeneratePreview = async () => {
    const validItems = items.filter(it => typeof it.width === 'number' && typeof it.height === 'number');
    
    if (validItems.length === 0) {
      setError("Please enter valid dimensions for at least one artboard.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const prompt = validItems
        .map(it => `${it.width}x${it.height}`)
        .join(', ');
      
      const spec = await parsePromptToLayout(`Create one artboard for each size: ${prompt}. Each artboard name must be width*height.`);
      setLayoutSpec(spec);
      saveToTags(validItems);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while parsing dimensions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSketch = async () => {
    if (!layoutSpec) return;
    try {
      const blob = await generateSketchFile(layoutSpec);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `artboards_${new Date().getTime()}.sketch`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to generate Sketch file.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-200">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
              <path d="M12 2L4.5 9L12 22L19.5 9L12 2Z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">Sketch Spec Gen</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Fast Dimension Tagging</p>
          </div>
        </div>
        
        {layoutSpec && (
          <button
            onClick={handleDownloadSketch}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-md active:scale-95 hover:shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download .sketch
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 max-w-[1600px] mx-auto w-full overflow-hidden">
        {/* Input Sidebar */}
        <div className="w-full lg:w-2/5 flex flex-col gap-6 h-full min-h-[400px]">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4 overflow-hidden max-h-[60vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Dimensions
              </h2>
              <button 
                onClick={clearCurrentItems}
                className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase transition-colors flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded"
                title="Reset active dimension list only"
              >
                Clear All
              </button>
            </div>

            <div 
              ref={scrollContainerRef}
              className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar"
            >
              {items.map((item, index) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative group animate-in slide-in-from-left-1 duration-150">
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="absolute -top-1 -right-1 bg-white shadow-sm border border-slate-200 rounded-full text-slate-300 hover:text-red-500 hover:border-red-100 opacity-0 group-hover:opacity-100 transition-all p-1 z-10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-0.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Width</label>
                      </div>
                      <input
                        type="number"
                        placeholder="px"
                        value={item.width}
                        onChange={(e) => updateItem(item.id, 'width', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-orange-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-0.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Height</label>
                      </div>
                      <input
                        type="number"
                        placeholder="px"
                        value={item.height}
                        onChange={(e) => updateItem(item.id, 'height', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-orange-500 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => addItem()}
                className="w-full py-2.5 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50 transition-all flex items-center justify-center gap-2 group mb-2 mt-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:scale-110" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-xs uppercase tracking-wider">Add Size</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              onClick={handleGeneratePreview}
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                isLoading 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-100 active:scale-95'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Building...</span>
                </div>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.3 1.047a1 1 0 01.897.95L12.5 7h4a1 1 0 01.945 1.332l-6 11a1 1 0 01-1.744-.943L10.5 13H6.5a1 1 0 01-.945-1.332l6-11a1 1 0 01.745-.621z" clipRule="evenodd" />
                  </svg>
                  <span>Build Artboards</span>
                </>
              )}
            </button>
          </div>

          {/* Dimension Tags (History) Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Frequent Dimensions
              </h3>
              {dimensionTags.length > 0 && (
                <button 
                  onClick={clearHistoryTags}
                  className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase transition-colors px-2 py-1 hover:bg-red-50 rounded"
                >
                  Clear Tags
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 overflow-y-auto custom-scrollbar content-start pb-2">
              {dimensionTags.length === 0 ? (
                <p className="w-full text-xs text-slate-400 text-center py-6 italic border border-dashed border-slate-100 rounded-lg">
                  Dimensions you build will appear here
                </p>
              ) : (
                dimensionTags.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => addTagToItems(tag)}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-orange-500 hover:text-white transition-all border border-slate-200 hover:border-orange-400 shadow-sm"
                  >
                    {tag}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex flex-col h-full min-h-[500px]">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 h-full flex flex-col overflow-hidden">
             <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 mb-2">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Live SVG Canvas</span>
               </div>
               {layoutSpec && (
                 <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                   {layoutSpec.elements.filter(e => e.type === 'ARTBOARD').length} Artboards
                 </span>
               )}
             </div>
             <div className="flex-1 overflow-hidden relative bg-slate-50/50">
               <LayoutPreview spec={layoutSpec} />
             </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-slate-400 text-[10px] border-t border-slate-200 bg-white">
        &copy; 2024 Sketch Spec Generator • All artboards automatically named as "Width*Height"
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default App;
