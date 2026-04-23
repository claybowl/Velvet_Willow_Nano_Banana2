
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateCompositeImage, isolateProductImage, editScene } from './services/falService';
import { Product, DepthLayer } from './types';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import ObjectCard from './components/ObjectCard';
import Spinner from './components/Spinner';
import DebugModal from './components/DebugModal';
import TouchGhost from './components/TouchGhost';
import AdminDashboard from './components/AdminDashboard';

// Pre-load a transparent image to use for hiding the default drag ghost.
const transparentDragImage = new Image();
transparentDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const defaultVenues = [
    { 
        name: "Empty Sunlit Studio", 
        url: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?q=80&w=1200&auto=format&fit=crop" 
    },
    { 
        name: "Spacious White Room", 
        url: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop" 
    },
    { 
        name: "Modern Empty Hall", 
        url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop" 
    }
];

// Initial stock data - Furniture only, clean backgrounds
const initialInventory: Product[] = [
    { id: 101, name: "Velvet Armchair", imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80" },
    { id: 102, name: "Marble Coffee Table", imageUrl: "https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&w=800&q=80" },
    { id: 107, name: "Chesterfield Sofa", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80" },
    { id: 108, name: "Minimalist Side Table", imageUrl: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=800&q=80" },
    { id: 109, name: "Modern Lounge Chair", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80" }
];

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// Helper to fetch a URL and convert to File
const urlToFile = async (url: string, filename: string): Promise<File> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
}

const loadingMessages = [
    "Scanning room for existing furniture...",
    "Harmonizing scale with surrounding items...",
    "Curating the arrangement...",
    "Calculating perspective vanishing points...",
    "Generating photorealistic options...",
    "Finalizing shadows and reflections..."
];


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'studio' | 'dashboard'>('studio');
  const [inventory, setInventory] = useState<Product[]>(initialInventory);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [sceneImage, setSceneImage] = useState<File | null>(null);
  const [history, setHistory] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [persistedOrbPosition, setPersistedOrbPosition] = useState<{x: number, y: number} | null>(null);
  const [debugImageUrl, setDebugImageUrl] = useState<string | null>(null);
  const [debugPrompt, setDebugPrompt] = useState<string | null>(null);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  
  // Quick Edit State
  const [editPrompt, setEditPrompt] = useState('');
  const [showEditInfo, setShowEditInfo] = useState(true);

  // Depth Control State
  const [selectedDepth, setSelectedDepth] = useState<DepthLayer>('midground');

  // State for touch drag & drop
  const [isTouchDragging, setIsTouchDragging] = useState<boolean>(false);
  const [touchGhostPosition, setTouchGhostPosition] = useState<{x: number, y: number} | null>(null);
  const [isHoveringDropZone, setIsHoveringDropZone] = useState<boolean>(false);
  const [touchOrbPosition, setTouchOrbPosition] = useState<{x: number, y: number} | null>(null);
  const sceneImgRef = useRef<HTMLImageElement>(null);
  
  const sceneImageUrl = sceneImage ? URL.createObjectURL(sceneImage) : null;
  const productImageUrl = selectedProduct ? selectedProduct.imageUrl : null;

  const handleError = useCallback((err: any) => {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Action failed: ${errorMessage}`);
      console.error(err);
  }, []);

  // Handles transient file uploads (Drag & Drop or "Add New" in sidebar)
  const handleProductImageUpload = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);
    try {
        let finalFile = file;
        let finalImageUrl = '';

        try {
          // Attempt to isolate the product
          const isolatedDataUrl = await isolateProductImage(file);
          finalFile = dataURLtoFile(isolatedDataUrl, file.name);
          finalImageUrl = isolatedDataUrl; 
        } catch (isolationError: any) {
          console.warn("Product isolation failed, falling back to original image.", isolationError);
          finalImageUrl = URL.createObjectURL(file);
        }

        const product: Product = {
            id: Date.now(),
            name: file.name.split('.')[0] || "New Item",
            imageUrl: finalImageUrl,
        };
        setProductImageFile(finalFile);
        setSelectedProduct(product);
    } catch(err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Handles selecting a pre-existing item from the inventory
  const handleInventorySelect = useCallback((product: Product) => {
      setSelectedProduct(product);
      setProductImageFile(null);
  }, []);

  const handleProductDrop = useCallback(async (position: {x: number, y: number}, relativePosition: { xPercent: number; yPercent: number; }) => {
    if (!sceneImage || !selectedProduct) {
      if (!selectedProduct) return; 
      setError('Please upload a product and a scene first.');
      return;
    }

    setPersistedOrbPosition(position);
    setIsLoading(true);
    setError(null);
    try {
      let finalProductFile = productImageFile;
      if (!finalProductFile) {
          try {
              finalProductFile = await urlToFile(selectedProduct.imageUrl, `${selectedProduct.name}.jpg`);
          } catch (e) {
              throw new Error("Could not load the selected product image from the library.");
          }
      }

      const { finalImageUrl, debugImageUrl, finalPrompt } = await generateCompositeImage(
        finalProductFile, 
        selectedProduct.name,
        sceneImage,
        sceneImage.name,
        relativePosition,
        selectedDepth
      );
      setDebugImageUrl(debugImageUrl);
      setDebugPrompt(finalPrompt);
      const newSceneFile = dataURLtoFile(finalImageUrl, `generated-scene-${Date.now()}.jpeg`);
      
      setHistory(prev => [...prev, sceneImage]);
      setSceneImage(newSceneFile);

    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
      setPersistedOrbPosition(null);
    }
  }, [productImageFile, sceneImage, selectedProduct, selectedDepth, handleError]);


  const handleReset = useCallback(() => {
    setSelectedProduct(null);
    setProductImageFile(null);
    setSceneImage(null);
    setHistory([]);
    setError(null);
    setIsLoading(false);
    setPersistedOrbPosition(null);
    setDebugImageUrl(null);
    setDebugPrompt(null);
  }, []);
  
  const handleUndo = useCallback(() => {
      if (history.length > 0) {
          const previousScene = history[history.length - 1];
          setSceneImage(previousScene);
          setHistory(prev => prev.slice(0, -1));
      }
  }, [history]);

  const handleQuickEdit = async () => {
      if (!editPrompt.trim() || !sceneImage) return;
      
      setIsLoading(true);
      setError(null);
      try {
          setHistory(prev => [...prev, sceneImage]);
          const newImageUrl = await editScene(sceneImage, editPrompt);
          const newFile = dataURLtoFile(newImageUrl, `edited-scene-${Date.now()}.png`);
          setSceneImage(newFile);
          setEditPrompt('');
      } catch (err) {
          handleError(err);
      } finally {
          setIsLoading(false);
      }
  };

  const handleDefaultVenueSelect = async (url: string) => {
      setIsLoading(true);
      setError(null);
      try {
          const response = await fetch(url);
          const blob = await response.blob();
          const file = new File([blob], "default-venue.jpg", { type: 'image/jpeg' });
          setSceneImage(file);
      } catch (err) {
          console.error("Error loading default venue:", err);
          setError("Could not load the template gallery. Please try uploading your own photo.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleAddProduct = (product: Product) => {
      setInventory(prev => [...prev, product]);
  };

  const handleDeleteProduct = (id: number) => {
      setInventory(prev => prev.filter(p => p.id !== id));
      if (selectedProduct?.id === id) {
          setSelectedProduct(null);
          setProductImageFile(null);
      }
  };

  useEffect(() => {
    return () => {
        if (sceneImageUrl) URL.revokeObjectURL(sceneImageUrl);
    };
  }, [sceneImageUrl]);
  
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isLoading) {
        setLoadingMessageIndex(0); 
        interval = setInterval(() => {
            setLoadingMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
        }, 3000);
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const handleTouchStart = (e: React.TouchEvent, product: Product) => {
    if (selectedProduct?.id !== product.id) {
        handleInventorySelect(product);
    }
    
    setIsTouchDragging(true);
    const touch = e.touches[0];
    setTouchGhostPosition({ x: touch.clientX, y: touch.clientY });
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchDragging) return;
      e.preventDefault(); 
      const touch = e.touches[0];
      setTouchGhostPosition({ x: touch.clientX, y: touch.clientY });
      
      const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropZone = elementUnderTouch?.closest<HTMLDivElement>('[data-dropzone-id="scene-uploader"]');

      if (dropZone) {
          const rect = dropZone.getBoundingClientRect();
          setTouchOrbPosition({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
          setIsHoveringDropZone(true);
      } else {
          setIsHoveringDropZone(false);
          setTouchOrbPosition(null);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTouchDragging) return;
      
      const touch = e.changedTouches[0];
      const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropZone = elementUnderTouch?.closest<HTMLDivElement>('[data-dropzone-id="scene-uploader"]');

      if (dropZone && sceneImgRef.current) {
          const img = sceneImgRef.current;
          const containerRect = dropZone.getBoundingClientRect();
          const { naturalWidth, naturalHeight } = img;
          const { width: containerWidth, height: containerHeight } = containerRect;

          const imageAspectRatio = naturalWidth / naturalHeight;
          const containerAspectRatio = containerWidth / containerHeight;

          let renderedWidth, renderedHeight;
          if (imageAspectRatio > containerAspectRatio) {
              renderedWidth = containerWidth;
              renderedHeight = containerWidth / imageAspectRatio;
          } else {
              renderedHeight = containerHeight;
              renderedWidth = containerHeight * imageAspectRatio;
          }
          
          const offsetX = (containerWidth - renderedWidth) / 2;
          const offsetY = (containerHeight - renderedHeight) / 2;

          const dropX = touch.clientX - containerRect.left;
          const dropY = touch.clientY - containerRect.top;

          const imageX = dropX - offsetX;
          const imageY = dropY - offsetY;
          
          if (!(imageX < 0 || imageX > renderedWidth || imageY < 0 || imageY > renderedHeight)) {
            const xPercent = (imageX / renderedWidth) * 100;
            const yPercent = (imageY / renderedHeight) * 100;
            
            handleProductDrop({ x: dropX, y: dropY }, { xPercent, yPercent });
          }
      }

      setIsTouchDragging(false);
      setTouchGhostPosition(null);
      setIsHoveringDropZone(false);
      setTouchOrbPosition(null);
    };

    if (isTouchDragging) {
      document.body.style.overflow = 'hidden'; 
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isTouchDragging, handleProductDrop]);

  const triggerSceneUpload = () => {
    const fileInput = document.getElementById('scene-uploader') as HTMLInputElement;
    if (fileInput) fileInput.click();
  };

  return (
    <div className="h-screen bg-white text-zinc-800 flex flex-col font-sans overflow-hidden">
      <TouchGhost 
        imageUrl={isTouchDragging ? productImageUrl : null} 
        position={touchGhostPosition}
      />
      <Header currentView={currentView} onViewChange={setCurrentView} onReset={handleReset} />
      
      {currentView === 'dashboard' ? (
          <AdminDashboard 
            products={inventory}
            onAddProduct={handleAddProduct}
            onDeleteProduct={handleDeleteProduct}
            onError={handleError}
          />
      ) : (
          <div className="flex flex-1 h-full overflow-hidden">
            {/* SIDEBAR: The Atelier */}
            <aside className="w-80 md:w-96 flex-shrink-0 border-r border-zinc-100 flex flex-col bg-white z-10 shadow-sm h-full">
                <div className="p-6 pb-2">
                    <h2 className="font-serif text-3xl text-zinc-800 italic mb-1">The Atelier</h2>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Select an item to place</p>
                </div>
                
                {/* Tabs */}
                <div className="px-6 flex gap-4 border-b border-zinc-100 mb-6">
                    <button className="text-xs font-semibold uppercase tracking-wider py-3 border-b-2 border-zinc-800 text-zinc-900">Library</button>
                    <button className="text-xs font-semibold uppercase tracking-wider py-3 border-b-2 border-transparent text-zinc-400 hover:text-zinc-600">Favorites</button>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Inventory Items */}
                        {inventory.map(product => {
                            const isSelected = selectedProduct?.id === product.id;
                            return (
                                <div 
                                    key={product.id}
                                    draggable="true" 
                                    onDragStart={(e) => {
                                        if (!isSelected) handleInventorySelect(product);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setDragImage(transparentDragImage, 0, 0);
                                    }}
                                    onTouchStart={(e) => handleTouchStart(e, product)}
                                    className={`relative cursor-grab active:cursor-grabbing ${isSelected ? 'ring-2 ring-zinc-800 ring-offset-2' : ''}`}
                                    onClick={() => handleInventorySelect(product)}
                                >
                                    {isSelected && <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Active</div>}
                                    <ObjectCard product={product} isSelected={isSelected} />
                                </div>
                            );
                        })}
                        
                        {inventory.length === 0 && (
                            <div className="col-span-2 py-12 text-center">
                                <p className="text-xs text-zinc-400 mb-2">The library is empty.</p>
                                <button 
                                    onClick={() => setCurrentView('dashboard')}
                                    className="text-xs font-bold underline text-zinc-800"
                                >
                                    Go to Dashboard to add items
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {selectedProduct && (
                        <div className="mt-8 p-4 bg-zinc-50 border border-zinc-100 rounded text-center">
                            <p className="text-xs text-zinc-500 mb-2">Drag the active product onto the mood board to visualize it.</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN CANVAS: Mood Board */}
            <main className="flex-1 relative bg-dot-pattern flex flex-col h-full overflow-hidden">
                {/* Canvas Header */}
                <div className="absolute top-6 left-8 z-10 pointer-events-none">
                    <h1 className="font-serif text-5xl text-zinc-300 italic tracking-tight opacity-50 mix-blend-multiply">Mood Board</h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mt-2 ml-1">Project: The Velvet Experience</p>
                </div>

                {/* Depth Controls - Floating Top Center */}
                {sceneImage && (
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center gap-1">
                        <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-semibold mb-1">Layer Depth</span>
                        <div className="bg-white/90 backdrop-blur-sm shadow-md border border-zinc-200 p-1 rounded-full flex gap-1">
                            {(['foreground', 'midground', 'background'] as DepthLayer[]).map((depth) => (
                                <button
                                    key={depth}
                                    onClick={() => setSelectedDepth(depth)}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                        selectedDepth === depth 
                                        ? 'bg-zinc-800 text-white shadow-sm' 
                                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                                    }`}
                                >
                                    {depth}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Canvas Actions */}
                <div className="absolute top-6 right-8 z-20">
                    <button 
                        onClick={triggerSceneUpload}
                        className="bg-white border border-zinc-200 shadow-sm hover:shadow-md text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full transition-all text-zinc-800 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Upload Venue Photo
                    </button>
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 relative w-full h-full p-8 md:p-12 flex items-center justify-center">
                    {isLoading && sceneImage && (
                        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
                            <Spinner />
                            <h3 className="font-serif text-2xl italic mt-6 text-zinc-800">Curating Vision...</h3>
                            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mt-2">{loadingMessages[loadingMessageIndex]}</p>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 z-40 bg-red-50/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                            <h2 className="font-serif text-3xl text-red-800 mb-2">Design Error</h2>
                            <p className="text-red-600 mb-6 max-w-md">{error}</p>
                            <button onClick={handleReset} className="px-6 py-2 bg-red-800 text-white rounded-full text-xs font-bold uppercase tracking-wider">Try Again</button>
                        </div>
                    )}

                    <div className="w-full h-full relative border-2 border-dashed border-zinc-200 rounded-lg overflow-hidden group hover:border-zinc-300 transition-colors bg-white/40">
                        <ImageUploader 
                            ref={sceneImgRef}
                            id="scene-uploader" 
                            onFileSelect={setSceneImage} 
                            imageUrl={sceneImageUrl}
                            isDropZone={!!sceneImage && !isLoading}
                            onProductDrop={handleProductDrop}
                            persistedOrbPosition={persistedOrbPosition}
                            showDebugButton={!!debugImageUrl && !isLoading}
                            onDebugClick={() => setIsDebugModalOpen(true)}
                            isTouchHovering={isHoveringDropZone}
                            touchOrbPosition={touchOrbPosition}
                            variant="canvas"
                        />
                        
                        {!sceneImage && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                                <p className="font-serif text-3xl text-zinc-300 italic mb-8">Start by uploading a venue...</p>
                                
                                <div className="flex flex-col items-center gap-4 pointer-events-auto">
                                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Or select a template</p>
                                    <div className="flex gap-4">
                                        {defaultVenues.map((venue, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleDefaultVenueSelect(venue.url)}
                                                className="group relative w-32 h-20 rounded-md overflow-hidden border border-zinc-200 hover:border-zinc-400 hover:shadow-md transition-all"
                                                title={venue.name}
                                            >
                                                <img src={venue.url} alt={venue.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Toolbar for Quick Edits and Undo */}
                {sceneImage && (
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center gap-2 w-full max-w-lg">
                        {showEditInfo && history.length > 0 && (
                            <div className="bg-zinc-900 text-white text-xs py-2 px-4 rounded-lg shadow-lg mb-2 flex items-center gap-3 animate-fade-in relative">
                                <span className="font-serif italic text-sm">Design Tip:</span>
                                <span>Refine the scene with a prompt or Undo changes.</span>
                                <button onClick={() => setShowEditInfo(false)} className="ml-2 hover:text-zinc-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2 bg-white p-2 rounded-full shadow-xl border border-zinc-100 w-full">
                             <button 
                                onClick={handleUndo}
                                disabled={history.length === 0 || isLoading}
                                className="p-3 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                title="Undo last change"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                             </button>
                             <div className="h-6 w-px bg-zinc-200 mx-1"></div>
                             <div className="flex-1 relative">
                                <input 
                                    type="text" 
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    placeholder="Make a quick edit (e.g. 'Add shadows', 'Make it brighter')" 
                                    className="w-full bg-transparent text-sm focus:outline-none placeholder-zinc-400 px-2"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleQuickEdit();
                                    }}
                                    disabled={isLoading}
                                />
                             </div>
                             <button 
                                onClick={handleQuickEdit}
                                disabled={!editPrompt.trim() || isLoading}
                                className="bg-zinc-900 text-white p-2 rounded-full hover:bg-black disabled:bg-zinc-300 transition-colors"
                             >
                                {isLoading ? (
                                   <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                )}
                             </button>
                        </div>
                    </div>
                )}
            </main>
          </div>
      )}
      
      <DebugModal 
        isOpen={isDebugModalOpen} 
        onClose={() => setIsDebugModalOpen(false)}
        imageUrl={debugImageUrl}
        prompt={debugPrompt}
      />
    </div>
  );
};

export default App;
