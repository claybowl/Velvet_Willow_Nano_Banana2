/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { Product } from '../types';
import ImageUploader from './ImageUploader';
import ObjectCard from './ObjectCard';
import { isolateProductImage } from '../services/falService';
import Spinner from './Spinner';

interface AdminDashboardProps {
    products: Product[];
    onAddProduct: (product: Product) => void;
    onDeleteProduct: (id: number) => void;
    onError: (error: any) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ products, onAddProduct, onDeleteProduct, onError }) => {
    const [newItemName, setNewItemName] = useState('');
    const [newItemImage, setNewItemImage] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = (file: File) => {
        setNewItemImage(file);
        // Auto-populate name if empty
        if (!newItemName) {
            setNewItemName(file.name.split('.')[0]);
        }
    };

    const handleAddClick = async () => {
        if (!newItemName || !newItemImage) return;
        
        setIsProcessing(true);

        try {
            let finalImageUrl: string;
            
            try {
                finalImageUrl = await isolateProductImage(newItemImage);
            } catch (err: any) {
                console.warn("Image isolation failed, using original.", err);
                finalImageUrl = URL.createObjectURL(newItemImage);
            }

            const newProduct: Product = {
                id: Date.now(),
                name: newItemName,
                imageUrl: finalImageUrl,
            };

            onAddProduct(newProduct);
            
            // Reset form
            setNewItemName('');
            setNewItemImage(null);
        } catch (e: any) {
            console.error("Error adding product:", e);
            onError(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex-1 bg-zinc-50 overflow-y-auto p-8 animate-fade-in">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12">
                    <h2 className="font-serif text-4xl text-zinc-800 italic mb-2">Inventory Manager</h2>
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Manage your Atelier stock</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add New Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100 sticky top-8">
                            <h3 className="text-lg font-bold text-zinc-800 mb-6">Add New Item</h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Item Name</label>
                                    <input 
                                        type="text" 
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        placeholder="e.g. Velvet Armchair"
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded px-4 py-3 text-sm focus:outline-none focus:border-zinc-800 transition-colors"
                                    />
                                </div>

                                <div className="aspect-square relative">
                                    {isProcessing && (
                                        <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center">
                                            <div className="scale-50">
                                                <Spinner />
                                            </div>
                                        </div>
                                    )}
                                    <ImageUploader 
                                        id="admin-uploader"
                                        label="Product Image"
                                        onFileSelect={handleFileSelect}
                                        imageUrl={newItemImage ? URL.createObjectURL(newItemImage) : null}
                                        onError={onError}
                                    />
                                </div>

                                <button 
                                    onClick={handleAddClick}
                                    disabled={!newItemName || !newItemImage || isProcessing}
                                    className="w-full bg-zinc-900 text-white py-3 rounded text-xs font-bold uppercase tracking-widest hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                                >
                                    {isProcessing ? 'Processing with AI...' : 'Add to Stock'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stock Grid */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                             <h3 className="text-lg font-bold text-zinc-800">Current Stock ({products.length})</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {products.map(product => (
                                <div key={product.id} className="relative group">
                                    <ObjectCard product={product} isSelected={false} />
                                    <button 
                                        onClick={() => onDeleteProduct(product.id)}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                                        title="Delete Item"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            
                            {products.length === 0 && (
                                <div className="col-span-full py-12 text-center text-zinc-400">
                                    <p className="font-serif italic text-lg">Your stock is empty.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;