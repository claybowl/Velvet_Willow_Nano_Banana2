
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DepthLayer } from '../types';

// Helper for retrying API calls with exponential backoff
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const isQuotaError = 
            error.status === 429 || 
            error.code === 429 || 
            (error.message && /quota|429|resource_exhausted/i.test(error.message));
        
        if (isQuotaError && retries > 0) {
            console.warn(`Quota exceeded/Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryWithBackoff(fn, retries - 1, delay * 2);
        }
        
        // Handle Permission Denied (403) or Not Found errors specifically as fatal for current key
        const isAuthError = 
            error.status === 400 || error.code === 400 || 
            error.status === 403 || error.code === 403 ||
            (error.message && /API key|permission|403|not found/i.test(error.message));

        if (isAuthError) {
            throw new Error(`Permission Denied: Ensure your API key project has billing enabled for Gemini 3 Pro (Nano Banana Pro).`);
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
            // Re-calculate the dimensions of the content area within the padded square image
            const aspectRatio = originalWidth / originalHeight;
            let contentWidth, contentHeight;
            if (aspectRatio > 1) { // Landscape
                contentWidth = targetDimension;
                contentHeight = targetDimension / aspectRatio;
            } else { // Portrait or square
                contentHeight = targetDimension;
                contentWidth = targetDimension * aspectRatio;
            }

            // Calculate the top-left offset of the content area
            const x = (targetDimension - contentWidth) / 2;
            const y = (targetDimension - contentHeight) / 2;

            const canvas = document.createElement('canvas');
            // Set canvas to the final, un-padded dimensions
            canvas.width = contentWidth;
            canvas.height = contentHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for cropping.'));
            }
            
            // Draw the relevant part of the square generated image onto the new, smaller canvas
            ctx.drawImage(img, x, y, contentWidth, contentHeight, 0, 0, contentWidth, contentHeight);
            
            // Return the data URL of the newly cropped image
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = (err) => reject(new Error(`Image load error during cropping: ${err}`));
    });
};


// New resize logic to enforce a consistent aspect ratio without cropping by adding padding
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

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
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


/**
 * Generates a composite image using gemini-3-pro-image-preview.
 */
export const generateCompositeImage = async (
    objectImage: File, 
    objectDescription: string,
    environmentImage: File,
    environmentDescription: string,
    dropPosition: { xPercent: number; yPercent: number; },
    depthLayer: DepthLayer = 'midground'
): Promise<{ finalImageUrl: string; debugImageUrl: string; finalPrompt: string; }> => {
  console.log('Starting multi-step image generation process...');
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  const { width: originalWidth, height: originalHeight } = await getImageDimensions(environmentImage);
  const MAX_DIMENSION = 1024;
  
  console.log('Resizing product and scene images...');
  const resizedObjectImage = await resizeImage(objectImage, MAX_DIMENSION);
  const resizedEnvironmentImage = await resizeImage(environmentImage, MAX_DIMENSION);

  console.log('Marking scene image for analysis...');
  const markedResizedEnvironmentImage = await markImage(resizedEnvironmentImage, dropPosition, { originalWidth, originalHeight });
  const debugImageUrl = await fileToDataUrl(markedResizedEnvironmentImage);

  console.log('Generating semantic location description with gemini-3-pro-preview...');
  const markedEnvironmentImagePart = await fileToPart(markedResizedEnvironmentImage);

  const descriptionPrompt = `
Analyze the exact 3D location indicated by the RED MARKER in the provided scene image.
Provide a concise, technical description focusing on:
1. The surface at the marker (material, texture, lighting).
2. The perspective and vanishing points at that point.
3. The scale relative to existing furniture nearby.
`;
  
  let semanticLocationDescription = '';
  try {
    const descriptionResponse = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ text: descriptionPrompt }, markedEnvironmentImagePart] }
    }));
    semanticLocationDescription = descriptionResponse.text || '';
  } catch (error) {
    console.error('Failed to generate semantic location description:', error);
    if (error instanceof Error && (error.message.includes('Permission') || error.message.includes('403'))) {
        throw error;
    }
    semanticLocationDescription = `at the specified location.`;
  }

  const depthInstructionMap = {
      foreground: "The item must be placed in the immediate FOREGROUND. Appear larger and sharper.",
      midground: "The item must be placed in the MIDDLE GROUND. Scale harmoniously with standard furniture depth.",
      background: "The item must be placed in the BACKGROUND. Appear smaller and visually distant."
  };

  console.log('Preparing to generate composite image...');
  const objectImagePart = await fileToPart(resizedObjectImage);
  const cleanEnvironmentImagePart = await fileToPart(resizedEnvironmentImage); 
  
  const prompt = `
Composite the 'product' image into the 'scene' image photorealistically.
Location: ${semanticLocationDescription}
Depth: ${depthInstructionMap[depthLayer]}
Match perspective, lighting, and realistic contact shadows. Scale the "${objectDescription}" to fit naturally with surrounding items.
`;

  console.log('Sending images to gemini-3-pro-image-preview (Nano Banana Pro)...');
  const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [objectImagePart, cleanEnvironmentImagePart, { text: prompt }] },
  }));

  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    const generatedSquareImageUrl = `data:${mimeType};base64,${data}`;
    const finalImageUrl = await cropToOriginalAspectRatio(generatedSquareImageUrl, originalWidth, originalHeight, MAX_DIMENSION);
    return { finalImageUrl, debugImageUrl, finalPrompt: prompt };
  }

  throw new Error("The AI model did not return an image. Please ensure your project supports gemini-3-pro-image-preview.");
};

/**
 * Isolates a product from its background using gemini-3-pro-image-preview.
 */
export const isolateProductImage = async (imageFile: File): Promise<string> => {
    console.log('Isolating product with gemini-3-pro-image-preview...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const MAX_DIMENSION = 1024;
    const resizedImage = await resizeImage(imageFile, MAX_DIMENSION);
    const imagePart = await fileToPart(resizedImage);
    
    const prompt = "Identify the main furniture item. Generate a new image consisting ONLY of that exact item on a pure white (#FFFFFF) background. Maintain exact details and perspective.";
    
    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [imagePart, { text: prompt }] },
    }));
    
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePartFromResponse?.inlineData) {
        const whiteBgImageUrl = `data:${imagePartFromResponse.inlineData.mimeType};base64,${imagePartFromResponse.inlineData.data}`;
        return await removeWhiteBackground(whiteBgImageUrl);
    }
    throw new Error("Failed to isolate product image with gemini-3-pro-image-preview.");
};

/**
 * Edits a scene image based on a text prompt using gemini-3-pro-image-preview.
 */
export const editScene = async (imageFile: File, prompt: string): Promise<string> => {
    console.log('Editing scene with gemini-3-pro-image-preview:', prompt);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const MAX_DIMENSION = 1024;
    const { width: originalWidth, height: originalHeight } = await getImageDimensions(imageFile);
    const resizedImage = await resizeImage(imageFile, MAX_DIMENSION);
    const imagePart = await fileToPart(resizedImage);

    const fullPrompt = `Edit this image: "${prompt}". Return only the final image with preserved lighting and style.`;

    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] }
    }));

    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePartFromResponse?.inlineData) {
        const generatedSquareImageUrl = `data:${imagePartFromResponse.inlineData.mimeType};base64,${imagePartFromResponse.inlineData.data}`;
        return await cropToOriginalAspectRatio(generatedSquareImageUrl, originalWidth, originalHeight, MAX_DIMENSION);
    }
    throw new Error("Failed to edit image with gemini-3-pro-image-preview.");
};
