/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useCallback, useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { isolateProductImage } from '../services/geminiService';

interface ImageUploaderProps {
  id: string;
  label?: string;
  onFileSelect: (file: File) => void;
  imageUrl: string | null;
  isDropZone?: boolean;
  onProductDrop?: (position: {x: number, y: number}, relativePosition: { xPercent: number; yPercent: number; }) => void;
  persistedOrbPosition?: { x: number; y: number } | null;
  showDebugButton?: boolean;
  onDebugClick?: () => void;
  isTouchHovering?: boolean;
  touchOrbPosition?: { x: number; y: number } | null;
  variant?: 'standard' | 'canvas'; // New prop to control styling
  onError?: (error: any) => void;
}

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const WarningIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

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

const ImageUploader = forwardRef<HTMLImageElement, ImageUploaderProps>(({ id, label, onFileSelect, imageUrl, isDropZone = false, onProductDrop, persistedOrbPosition, showDebugButton, onDebugClick, isTouchHovering = false, touchOrbPosition = null, variant = 'standard', onError }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [orbPosition, setOrbPosition] = useState<{x: number, y: number} | null>(null);
  const [fileTypeError, setFileTypeError] = useState<string | null>(null);
  const [isProcessingBg, setIsProcessingBg] = useState(false);

  // Expose the internal imgRef to the parent component via the forwarded ref
  useImperativeHandle(ref, () => imgRef.current as HTMLImageElement);
  
  useEffect(() => {
    if (!imageUrl) {
      setFileTypeError(null);
    }
  }, [imageUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setFileTypeError('For best results, please use PNG, JPG, or JPEG formats.');
      } else {
        setFileTypeError(null);
      }
      onFileSelect(file);
    }
  };
  
  // A shared handler for both click and drop placements.
  const handlePlacement = useCallback((clientX: number, clientY: number, currentTarget: HTMLDivElement) => {
    const img = imgRef.current;
    if (!img || !onProductDrop) return;

    const containerRect = currentTarget.getBoundingClientRect();
    const { naturalWidth, naturalHeight } = img;
    const { width: containerWidth, height: containerHeight } = containerRect;

    // Calculate the rendered image's dimensions inside the container (due to object-contain)
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

    const pointX = clientX - containerRect.left;
    const pointY = clientY - containerRect.top;

    const imageX = pointX - offsetX;
    const imageY = pointY - offsetY;

    // Check if the action was outside the image area (in the padding)
    if (imageX < 0 || imageX > renderedWidth || imageY < 0 || imageY > renderedHeight) {
      console.warn("Action was outside the image boundaries.");
      return;
    }

    const xPercent = (imageX / renderedWidth) * 100;
    const yPercent = (imageY / renderedHeight) * 100;

    onProductDrop({ x: pointX, y: pointY }, { xPercent, yPercent });
  }, [onProductDrop]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Priority 1: Drop Zone Interaction (Placing Items)
    if (isDropZone && onProductDrop) {
      handlePlacement(event.clientX, event.clientY, event.currentTarget);
      return;
    }
    
    // Priority 2: Uploading Logic
    // Allow upload if:
    // 1. It's not a canvas variant (Standard uploader -> always allow replace/upload)
    // 2. OR it is a canvas variant but it is empty (Allow initial upload)
    if (variant !== 'canvas' || !imageUrl) {
        inputRef.current?.click();
    }
  };

  const handleRemoveBg = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imageUrl) return;

    setIsProcessingBg(true);
    setFileTypeError(null);
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        // Create a File object from the blob, defaulting to png if unknown, but name doesn't matter much for isolation
        const file = new File([blob], "original-image.png", { type: blob.type });
        
        const isolatedDataUrl = await isolateProductImage(file);
        const newFile = dataURLtoFile(isolatedDataUrl, "isolated-product.png");
        onFileSelect(newFile);
    } catch (err: any) {
        console.error("Background removal failed:", err);
        // If it's a permission error, pass it up to trigger auth flow
        if (err.message && (err.message.includes("Permission Denied") || err.message.includes("403"))) {
            if (onError) onError(err);
        } else {
            setFileTypeError("Failed to remove background. Please try again.");
        }
    } finally {
        setIsProcessingBg(false);
    }
  };
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingOver(true);
      if (isDropZone && onProductDrop) {
          const rect = event.currentTarget.getBoundingClientRect();
          setOrbPosition({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top
          });
      }
  }, [isDropZone, onProductDrop]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingOver(false);
      setOrbPosition(null);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingOver(false);
      setOrbPosition(null);

      if (isDropZone && onProductDrop) {
          // Case 1: A product is being dropped onto the scene
          handlePlacement(event.clientX, event.clientY, event.currentTarget);
      } else {
          // Case 2: A file is being dropped to be uploaded
          const file = event.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) {
              const allowedTypes = ['image/jpeg', 'image/png'];
              if (!allowedTypes.includes(file.type)) {
                  setFileTypeError('For best results, please use PNG, JPG, or JPEG formats.');
              } else {
                  setFileTypeError(null);
              }
              onFileSelect(file);
          }
      }
  }, [isDropZone, onProductDrop, onFileSelect, handlePlacement]);
  
  const showHoverState = isDraggingOver || isTouchHovering;
  const currentOrbPosition = orbPosition || touchOrbPosition;
  const isActionable = isDropZone || (!imageUrl && variant === 'canvas') || variant !== 'canvas';

  // Conditional styles based on variant
  const baseClasses = "flex items-center justify-center transition-all duration-300 relative overflow-hidden";
  const standardClasses = `w-full aspect-square bg-zinc-50 border border-dashed rounded-sm ${
      showHoverState ? 'border-zinc-400 bg-zinc-100' : 'border-zinc-300 hover:border-zinc-400 cursor-pointer'
  }`;
  const canvasClasses = `w-full h-full absolute inset-0 ${
      showHoverState ? 'bg-black/5' : ''
  } ${isDropZone ? 'cursor-crosshair' : (imageUrl ? '' : 'cursor-pointer')}`;

  const uploaderClasses = `${baseClasses} ${variant === 'canvas' ? canvasClasses : standardClasses} ${!isActionable && variant !== 'canvas' ? 'cursor-default' : ''}`;

  return (
    <div className={`flex flex-col items-center w-full ${variant === 'canvas' ? 'h-full' : ''}`}>
      {label && <h3 className="text-xs font-bold uppercase tracking-widest mb-3 text-zinc-500 w-full text-left">{label}</h3>}
      <div
        className={uploaderClasses}
        onClick={isActionable ? handleClick : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-dropzone-id={id}
      >
        <input
          type="file"
          id={id}
          ref={inputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg"
          className="hidden"
        />
        {imageUrl ? (
          <>
            <img 
              ref={imgRef}
              src={imageUrl} 
              alt={label || 'Uploaded Scene'} 
              className={`w-full h-full ${variant === 'canvas' ? 'object-contain' : 'object-cover'}`} 
            />
            {/* Background Removal Button */}
            {variant !== 'canvas' && (
                <button
                    onClick={handleRemoveBg}
                    disabled={isProcessingBg}
                    className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white text-zinc-800 p-2 rounded-full shadow-sm border border-zinc-200 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group"
                    title="Remove Background with AI"
                >
                    {isProcessingBg ? (
                        <svg className="animate-spin h-4 w-4 text-zinc-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v3h3a1 1 0 110 2H6v3a1 1 0 11-2 0v-3H1a1 1 0 110-2h3V8a1 1 0 011-1zm5-4.464l1.171 2.372 2.618.38a.5.5 0 01.277.853l-1.895 1.847.447 2.607a.5.5 0 01-.725.527L10 12.82l-2.342 1.23a.5.5 0 01-.725-.527l.447-2.607-1.895-1.847a.5.5 0 01.277-.853l2.618-.38L9.464 2.536A.5.5 0 0110 2.536zM15 13a1 1 0 100 2 1 1 0 000-2zm3 1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
            )}
            <div 
                className="drop-orb" 
                style={{ 
                    left: currentOrbPosition ? currentOrbPosition.x : -9999, 
                    top: currentOrbPosition ? currentOrbPosition.y : -9999 
                }}
            ></div>
            {persistedOrbPosition && (
                <div 
                    className="drop-orb" 
                    style={{ 
                        left: persistedOrbPosition.x, 
                        top: persistedOrbPosition.y,
                        opacity: 1,
                        transform: 'translate(-50%, -50%) scale(1)',
                        transition: 'none', // Appear instantly without animation
                    }}
                ></div>
            )}
            {showDebugButton && onDebugClick && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDebugClick();
                    }}
                    className="absolute bottom-6 right-6 bg-black/80 backdrop-blur text-white text-[10px] font-bold tracking-widest uppercase px-3 py-2 rounded-full hover:bg-black transition-all z-20"
                    aria-label="Show debug view"
                >
                    Debug Info
                </button>
            )}
          </>
        ) : (
          <div className={`text-center text-zinc-400 p-4 ${variant === 'canvas' ? 'hidden' : ''}`}>
             <span className="text-4xl block font-light mb-2">+</span>
             <span className="text-xs font-medium uppercase tracking-wider">Add Item</span>
          </div>
        )}
      </div>
      {fileTypeError && (
        <div className="w-full mt-2 text-[10px] text-red-600 bg-red-50 border border-red-100 rounded p-2 flex items-center animate-fade-in" role="alert">
            <WarningIcon />
            <span>{fileTypeError}</span>
        </div>
      )}
    </div>
  );
});

export default ImageUploader;