
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { DepthLayer } from '../types';

const FAL_API_KEY = process.env.FAL_API_KEY || '';
const FAL_BASE_URL = 'https://fal.run/fal-ai/nano-banana-2';

// Helper for retrying API calls with exponential backoff
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const isQuotaError = 
            error.status === 429 || 
            error.code === 429 || 
            (error.message && /quota|429|rate.limit|too.many.requests/i.test(error.message));
        
        if (isQuotaError && retries > 0) {
            console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryWithBackoff(fn, retries - 1, delay * 2);
        }
        
        // Handle auth errors
        const isAuthError = 
            error.status === 401 || error.code === 401 || 
            error.status === 403 || error.code === 403 ||
            (error.message && /unauthorized|invalid.key|authentication/i.test(error.message));

        if (isAuthError) {
            throw new Error(`FAL API authentication failed. Please check your FAL_API_KEY.`);
        }

        throw error;
    }
};

// Helper to get intrinsic image dimensions from a File object
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
    });
};

// Helper to crop a square image back to an original aspect ratio, removing padding.
const cropToOriginalAspectRatio = (
    imageDataUrl: string,
    originalWidth: number,
    originalHeight: number,
    targetDimension: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;
        img.onload = () => {
            const aspectRatio = originalWidth / originalHeight;
            let contentWidth, contentHeight;
            if (aspectRatio > 1) { // Landscape
                contentWidth = targetDimension;
                contentHeight = targetDimension / aspectRatio;
            } else { // Portrait or square
                contentHeight = targetDimension;
                contentWidth = targetDimension * aspectRatio;
            }

            const x = (targetDimension - contentWidth) / 2;
            const y = (targetDimension - contentHeight) / 2;

            const canvas = document.createElement('canvas');
            canvas.width = contentWidth;
            canvas.height = contentHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for cropping.'));
            }
            
            ctx.drawImage(img, x, y, contentWidth, contentHeight, 0, 0, contentWidth, contentHeight);
            
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = (err) => reject(new Error(`Image load error during cropping: ${err}`));
    });
};


// Resize logic to enforce a consistent aspect ratio without cropping by adding padding
const resizeImage = (file: File, targetDimension: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetDimension;
                canvas.height = targetDimension;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context.'));
                }

                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, targetDimension, targetDimension);

                const aspectRatio = img.width / img.height;
                let newWidth, newHeight;

                if (aspectRatio > 1) { // Landscape image
                    newWidth = targetDimension;
                    newHeight = targetDimension / aspectRatio;
                } else { // Portrait or square image
                    newHeight = targetDimension;
                    newWidth = targetDimension * aspectRatio;
                }

                const x = (targetDimension - newWidth) / 2;
                const y = (targetDimension - newHeight) / 2;
                
                ctx.drawImage(img, x, y, newWidth, newHeight);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg', 
                            lastModified: Date.now()
                        }));
                    } else {
                        reject(new Error('Canvas to Blob conversion failed.'));
                    }
                }, 'image/jpeg', 0.95);
            };
            img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
    });
};

// Helper to convert File to a data URL string
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// Helper to fetch an image URL and convert it to a data URL
const fetchImageAsDataUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// Helper to draw a marker on an image and return a new File object
const markImage = async (
    paddedSquareFile: File, 
    position: { xPercent: number; yPercent: number; },
    originalDimensions: { originalWidth: number; originalHeight: number; }
): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(paddedSquareFile);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file for marking."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const targetDimension = canvas.width;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context for marking.'));
                }

                ctx.drawImage(img, 0, 0);

                const { originalWidth, originalHeight } = originalDimensions;
                const aspectRatio = originalWidth / originalHeight;
                let contentWidth, contentHeight;

                if (aspectRatio > 1) { // Landscape
                    contentWidth = targetDimension;
                    contentHeight = targetDimension / aspectRatio;
                } else { // Portrait or square
                    contentHeight = targetDimension;
                    contentWidth = targetDimension * aspectRatio;
                }
                
                const offsetX = (targetDimension - contentWidth) / 2;
                const offsetY = (targetDimension - contentHeight) / 2;

                const markerXInContent = (position.xPercent / 100) * contentWidth;
                const markerYInContent = (position.yPercent / 100) * contentHeight;

                const finalMarkerX = offsetX + markerXInContent;
                const finalMarkerY = offsetY + markerYInContent;

                const markerRadius = Math.max(5, Math.min(canvas.width, canvas.height) * 0.015);

                ctx.beginPath();
                ctx.arc(finalMarkerX, finalMarkerY, markerRadius, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.lineWidth = markerRadius * 0.2;
                ctx.strokeStyle = 'white';
                ctx.stroke();

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], `marked-${paddedSquareFile.name}`, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    } else {
                        reject(new Error('Canvas to Blob conversion failed during marking.'));
                    }
                }, 'image/jpeg', 0.95);
            };
            img.onerror = (err) => reject(new Error(`Image load error during marking: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error during marking: ${err}`));
    });
};

// Helper to remove white background from an image
const removeWhiteBackground = (imageUrl: string, threshold = 240): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context for background removal."));
                return;
            }
            
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                if (r > threshold && g > threshold && b > threshold) {
                    data[i + 3] = 0; 
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => reject(new Error(`Failed to load image for background removal: ${err}`));
    });
};

// Helper to call FAL nano-banana-2/edit endpoint
const callFalEdit = async (imageUrls: string[], prompt: string): Promise<string> => {
    const response = await fetch(`${FAL_BASE_URL}/edit`, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt,
            image_urls: imageUrls,
            num_images: 1,
            output_format: 'jpeg',
            resolution: '1K',
        }),
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FAL API error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    if (result.images && result.images.length > 0) {
        return result.images[0].url;
    }
    throw new Error('FAL did not return an image');
};


/**
 * Generates a composite image using fal-ai/nano-banana-2/edit.
 */
export const generateCompositeImage = async (
    objectImage: File, 
    objectDescription: string,
    environmentImage: File,
    _environmentDescription: string,
    dropPosition: { xPercent: number; yPercent: number; },
    depthLayer: DepthLayer = 'midground'
): Promise<{ finalImageUrl: string; debugImageUrl: string; finalPrompt: string; }> => {
  console.log('Starting multi-step image generation process with FAL...');

  const { width: originalWidth, height: originalHeight } = await getImageDimensions(environmentImage);
  const MAX_DIMENSION = 1024;
  
  console.log('Resizing product and scene images...');
  const resizedObjectImage = await resizeImage(objectImage, MAX_DIMENSION);
  const resizedEnvironmentImage = await resizeImage(environmentImage, MAX_DIMENSION);

  console.log('Marking scene image for analysis...');
  const markedResizedEnvironmentImage = await markImage(resizedEnvironmentImage, dropPosition, { originalWidth, originalHeight });
  const debugImageUrl = await fileToDataUrl(markedResizedEnvironmentImage);

  const objectImageDataUrl = await fileToDataUrl(resizedObjectImage);
  const markedSceneDataUrl = await fileToDataUrl(markedResizedEnvironmentImage);

  const depthInstructionMap = {
      foreground: "The item must be placed in the immediate FOREGROUND. Appear larger and sharper.",
      midground: "The item must be placed in the MIDDLE GROUND. Scale harmoniously with standard furniture depth.",
      background: "The item must be placed in the BACKGROUND. Appear smaller and visually distant."
  };

  const prompt = `
Place the furniture item from the first image into the room scene from the second image.
The red dot in the second image marks the exact placement location.
${depthInstructionMap[depthLayer]}
Match perspective, lighting, and realistic contact shadows.
Scale the "${objectDescription}" to fit naturally with surrounding items.
`;

  console.log('Sending images to fal-ai/nano-banana-2/edit...');
  const generatedImageUrl = await retryWithBackoff(() => callFalEdit(
    [objectImageDataUrl, markedSceneDataUrl],
    prompt
  ));

  console.log('Fetching generated image from FAL...');
  const generatedDataUrl = await fetchImageAsDataUrl(generatedImageUrl);
  const finalImageUrl = await cropToOriginalAspectRatio(generatedDataUrl, originalWidth, originalHeight, MAX_DIMENSION);
  
  return { finalImageUrl, debugImageUrl, finalPrompt: prompt };
};

/**
 * Isolates a product from its background using fal-ai/nano-banana-2/edit.
 */
export const isolateProductImage = async (imageFile: File): Promise<string> => {
    console.log('Isolating product with fal-ai/nano-banana-2/edit...');
    
    const MAX_DIMENSION = 1024;
    const resizedImage = await resizeImage(imageFile, MAX_DIMENSION);
    const imageDataUrl = await fileToDataUrl(resizedImage);
    
    const prompt = "Isolate the main furniture item from this image and place it on a pure white (#FFFFFF) background. Maintain exact details and perspective.";
    
    const generatedImageUrl = await retryWithBackoff(() => callFalEdit(
        [imageDataUrl],
        prompt
    ));
    
    console.log('Fetching isolated image from FAL...');
    const whiteBgImageUrl = await fetchImageAsDataUrl(generatedImageUrl);
    return await removeWhiteBackground(whiteBgImageUrl);
};

/**
 * Edits a scene image based on a text prompt using fal-ai/nano-banana-2/edit.
 */
export const editScene = async (imageFile: File, prompt: string): Promise<string> => {
    console.log('Editing scene with fal-ai/nano-banana-2/edit:', prompt);

    const MAX_DIMENSION = 1024;
    const { width: originalWidth, height: originalHeight } = await getImageDimensions(imageFile);
    const resizedImage = await resizeImage(imageFile, MAX_DIMENSION);
    const imageDataUrl = await fileToDataUrl(resizedImage);

    const fullPrompt = `Edit this room scene image: "${prompt}". Return only the final image with preserved lighting and style.`;

    const generatedImageUrl = await retryWithBackoff(() => callFalEdit(
        [imageDataUrl],
        fullPrompt
    ));

    console.log('Fetching edited image from FAL...');
    const generatedDataUrl = await fetchImageAsDataUrl(generatedImageUrl);
    return await cropToOriginalAspectRatio(generatedDataUrl, originalWidth, originalHeight, MAX_DIMENSION);
};
