/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Product } from '../types';

interface ObjectCardProps {
    product: Product;
    isSelected: boolean;
    onClick?: () => void;
}

const ObjectCard: React.FC<ObjectCardProps> = ({ product, isSelected, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className={`group relative bg-white border transition-all duration-300 cursor-pointer overflow-hidden ${
                isSelected 
                ? 'border-zinc-800 shadow-lg ring-1 ring-zinc-800' 
                : 'border-zinc-200 hover:border-zinc-400'
            }`}
        >
            <div className="aspect-square w-full bg-white p-2 flex items-center justify-center">
                <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-contain mix-blend-multiply" 
                    loading="lazy"
                />
            </div>
            <div className="p-3 border-t border-zinc-100 bg-zinc-50/50">
                <h4 className="text-xs font-serif italic text-zinc-900 truncate">{product.name}</h4>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Velvet Collection</p>
            </div>
        </div>
    );
};

export default ObjectCard;