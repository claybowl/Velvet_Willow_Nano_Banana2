
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
        name: "Grand Ballroom", 
        url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1200&auto=format&fit=crop",
        description: "Crystal chandeliers and gilded elegance"
    },
    { 
        name: "Garden Estate", 
        url: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=1200&auto=format&fit=crop",
        description: "European-inspired outdoor ceremony"
    },
    { 
        name: "Vintage Lounge", 
        url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1200&auto=format&fit=crop",
        description: "Warm tones and timeless sophistication"
    },
    { 
        name: "Osage Hills Studio", 
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
        description: "The Velvet Willow's creative atelier"
    },
    { 
        name: "Sunlit Conservatory", 
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop",
        description: "Floor-to-ceiling natural light"
    },
    { 
        name: "Moody Velvet Room", 
        url: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=1200&auto=format&fit=crop",
        description: "Dramatic hues and rich textures"
    }
];

// Initial stock data - Scraped from thevelvetwillow.com/shop
const initialInventory: Product[] = [
    { id: 1000, name: 'Silver Ornate Raised Cake Platter (Square)', imageUrl: 'https://static.wixstatic.com/media/ca5ead_5a15c1e24faa444f98d7fc94dd9760ba~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_5a15c1e24faa444f98d7fc94dd9760ba~mv2.png' },
    { id: 1001, name: 'Moody jewel toned runners', imageUrl: 'https://static.wixstatic.com/media/ca5ead_ba6c2dbea15d42b9a0865da7507aea7f~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_ba6c2dbea15d42b9a0865da7507aea7f~mv2.png' },
    { id: 1002, name: 'Olive green velvet runners', imageUrl: 'https://static.wixstatic.com/media/ca5ead_beb5a58e84e84f6c8b3ed47c8e8daf9b~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_beb5a58e84e84f6c8b3ed47c8e8daf9b~mv2.png' },
    { id: 1003, name: 'Pink French Louis XV Settee', imageUrl: 'https://static.wixstatic.com/media/ca5ead_6217c13321ca40b2b245e4330b9fb770~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_6217c13321ca40b2b245e4330b9fb770~mv2.jpg' },
    { id: 1004, name: 'Gold Victorian Loveseat', imageUrl: 'https://static.wixstatic.com/media/ca5ead_ec87ec0aa2b14e7aaadd9e52b5633960~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_ec87ec0aa2b14e7aaadd9e52b5633960~mv2.png' },
    { id: 1005, name: 'White Hairpin Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_8dff5272259c40db8abb94f2a406563c~mv2.jpg/v1/fill/w_243,h_243,al_c,lg_1,q_80,enc_avif,quality_auto/ca5ead_8dff5272259c40db8abb94f2a406563c~mv2.jpg' },
    { id: 1006, name: 'Roman Bust Rentals', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f655797702c34e3ea18b2a92f6766ba3~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f655797702c34e3ea18b2a92f6766ba3~mv2.jpg' },
    { id: 1007, name: 'Feather Candelabra Centerpiece.', imageUrl: 'https://static.wixstatic.com/media/ca5ead_85ab838312e74b358674720a40dcc3d4~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_85ab838312e74b358674720a40dcc3d4~mv2.jpg' },
    { id: 1008, name: 'Burgundy Kid Velvet Vintage Sofa Rental', imageUrl: 'https://static.wixstatic.com/media/ca5ead_6df55780bc2c4ca4a816bbd79e4da646~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_6df55780bc2c4ca4a816bbd79e4da646~mv2.png' },
    { id: 1009, name: 'Ostrich Feather Centerpiece Rental - Roaring 20\'s', imageUrl: 'https://static.wixstatic.com/media/ca5ead_5d18d1cd60ba48549ac6dfeb7a317a5a~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_5d18d1cd60ba48549ac6dfeb7a317a5a~mv2.jpg' },
    { id: 1010, name: 'Vintage Inspired Bud Vase Rental', imageUrl: 'https://static.wixstatic.com/media/ca5ead_dc9a88abf254419bac2a026779107c96~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_dc9a88abf254419bac2a026779107c96~mv2.jpg' },
    { id: 1011, name: 'Blush Beauty', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c6bb561a20a6419a9ef26aef6948b559~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_c6bb561a20a6419a9ef26aef6948b559~mv2.jpg' },
    { id: 1012, name: 'Ada and Alma', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f044acb0db29480bbc418471b9019087~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f044acb0db29480bbc418471b9019087~mv2.jpg' },
    { id: 1013, name: 'Floor Candelabra', imageUrl: 'https://static.wixstatic.com/media/ca5ead_d448b07ae4144c02a8fdf5b7003ffb13~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_d448b07ae4144c02a8fdf5b7003ffb13~mv2.png' },
    { id: 1014, name: 'Flameless Candles', imageUrl: 'https://static.wixstatic.com/media/ca5ead_8bd41db3b75646438fe32939e78e33fe~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_8bd41db3b75646438fe32939e78e33fe~mv2.jpg' },
    { id: 1015, name: 'Vintage Carved Wood Cake Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_66128422a7ed4c5c92c0f3bd1c8c172c~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_66128422a7ed4c5c92c0f3bd1c8c172c~mv2.png' },
    { id: 1016, name: 'Pink Leather Highback Chairs', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c5b2311f29bd45e9912af9ea96b61ff8~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_c5b2311f29bd45e9912af9ea96b61ff8~mv2.jpg' },
    { id: 1017, name: '5\' x 7\' Ivory and Brown Netrual Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_120b939382ab4466975b4ddca9d44c01~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_120b939382ab4466975b4ddca9d44c01~mv2.jpg' },
    { id: 1018, name: 'Large faux florals in vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_a5baf6c3e54349c8a2555c71904f2a32~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_a5baf6c3e54349c8a2555c71904f2a32~mv2.jpg' },
    { id: 1019, name: '6\'5 x 3\'8 Hand-Knotted Turkish Pink Styling Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_fc53b92f66d440619c9a6adb430346ff~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_fc53b92f66d440619c9a6adb430346ff~mv2.jpg' },
    { id: 1020, name: 'Alice and Ada', imageUrl: 'https://static.wixstatic.com/media/ca5ead_79eb58b8c5ab4f97a203f8dc1a7bcc8c~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_79eb58b8c5ab4f97a203f8dc1a7bcc8c~mv2.jpg' },
    { id: 1021, name: 'Grey Lantern', imageUrl: 'https://static.wixstatic.com/media/ca5ead_3482d202c6df4a59856273305b390505~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_3482d202c6df4a59856273305b390505~mv2.jpg' },
    { id: 1022, name: 'Rattan Floor Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_a091b4a0559b4614a610a0f65ca2cc6c~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_a091b4a0559b4614a610a0f65ca2cc6c~mv2.jpg' },
    { id: 1023, name: 'Faux Fur Throw Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c1c2bf164b3f41c8a3ba8f33090b9036~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_c1c2bf164b3f41c8a3ba8f33090b9036~mv2.jpg' },
    { id: 1024, name: 'Brown Leather Woven Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_d8b762ab5cf348139718db86fe519713~mv2.jpe/v1/fill/w_188,h_188,al_c,lg_1,q_80,enc_avif,quality_auto/ca5ead_d8b762ab5cf348139718db86fe519713~mv2.jpe' },
    { id: 1025, name: 'Navy and Pink SouthWest Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_03b0da9adc6745da86c42e82f1155c02~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_03b0da9adc6745da86c42e82f1155c02~mv2.jpg' },
    { id: 1026, name: 'Maggie', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e4001a3693ca4410aebf367d201eede9~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_e4001a3693ca4410aebf367d201eede9~mv2.jpg' },
    { id: 1027, name: 'Ziggy', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e7276ef8f00b412e9207bf52a304cf44~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_e7276ef8f00b412e9207bf52a304cf44~mv2.jpg' },
    { id: 1028, name: 'Vintage Floral Pattern Pillow', imageUrl: 'https://static.wixstatic.com/media/ca5ead_5d2f4b9da93b4bc5832f9d72cdd32939~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_5d2f4b9da93b4bc5832f9d72cdd32939~mv2.jpg' },
    { id: 1029, name: 'White Loveseat', imageUrl: 'https://static.wixstatic.com/media/ca5ead_3ac7d46fcebe4e868d391dd51e56ccf0~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_3ac7d46fcebe4e868d391dd51e56ccf0~mv2.jpg' },
    { id: 1030, name: 'Lucille', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f4d1c51dbd17489a898e269ae22da8cb~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f4d1c51dbd17489a898e269ae22da8cb~mv2.jpg' },
    { id: 1031, name: 'Recycled Green Glass Apothecary Jug / Carafe', imageUrl: 'https://static.wixstatic.com/media/ca5ead_a0764182d6ca4f91ab15c7d3e121266a~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_a0764182d6ca4f91ab15c7d3e121266a~mv2.jpg' },
    { id: 1032, name: 'Gold Accent Table with Metal Legs - Rental', imageUrl: 'https://static.wixstatic.com/media/ca5ead_8223beb4c83e479fb73f28359720dc31~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_8223beb4c83e479fb73f28359720dc31~mv2.jpg' },
    { id: 1033, name: 'Camel Leather Tufted Chairs', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e42993dcb3bb442a999d6c1fc2ee3ef2~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_e42993dcb3bb442a999d6c1fc2ee3ef2~mv2.jpg' },
    { id: 1034, name: 'Salmon and Blue Turkish Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_fb0a3d5c95ac4f45b005471c870981cb~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_fb0a3d5c95ac4f45b005471c870981cb~mv2.jpg' },
    { id: 1035, name: 'Vintage red loveseat rental', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e3e66712fa904be7be30e8e041acf917~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_e3e66712fa904be7be30e8e041acf917~mv2.png' },
    { id: 1036, name: '7\' Bungalow Rose Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_1b01d4c3a9ad44d5b83644a3cc5468b8~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_1b01d4c3a9ad44d5b83644a3cc5468b8~mv2.png' },
    { id: 1037, name: '4 x 6 Tribal Turkish Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_ef8f5a6433e94789b8103a49c552b18f~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_ef8f5a6433e94789b8103a49c552b18f~mv2.png' },
    { id: 1038, name: 'The Silver Fox', imageUrl: 'https://static.wixstatic.com/media/ca5ead_4d4c25543ae14b47b1fce3834d2fe829~mv2.jpg/v1/fill/w_243,h_243,al_c,lg_1,q_80,enc_avif,quality_auto/ca5ead_4d4c25543ae14b47b1fce3834d2fe829~mv2.jpg' },
    { id: 1039, name: 'Red Ruby Loveseat', imageUrl: 'https://static.wixstatic.com/media/ca5ead_259957c55a154742b327661927a594ba~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_259957c55a154742b327661927a594ba~mv2.jpg' },
    { id: 1040, name: 'Welcome Sign Flower Box Rental', imageUrl: 'https://static.wixstatic.com/media/ca5ead_8223f50833fc43248948dd842d5ad40b~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_8223f50833fc43248948dd842d5ad40b~mv2.png' },
    { id: 1041, name: 'Bamboo Spun End Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_901b1643899d44779c5d675ef35e41e7~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_901b1643899d44779c5d675ef35e41e7~mv2.jpg' },
    { id: 1042, name: '10.3 x 4.1 Turkish Handmade Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_2c151618fa7a4919bce13d87855c9619~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_2c151618fa7a4919bce13d87855c9619~mv2.png' },
    { id: 1043, name: '36" Wood Pedestal', imageUrl: 'https://static.wixstatic.com/media/ca5ead_bb5f5366c8fe4264bfceb71c0d430576~mv2.webp/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_bb5f5366c8fe4264bfceb71c0d430576~mv2.webp' },
    { id: 1044, name: 'White Lattice & Flourish Column Pedestal', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e7d8d0e4620b44809656d9a0d24735f6~mv2.jpg/v1/fill/w_243,h_243,al_c,lg_1,q_80,enc_avif,quality_auto/ca5ead_e7d8d0e4620b44809656d9a0d24735f6~mv2.jpg' },
    { id: 1045, name: 'Oversized 3-D Mardi Gras Masks', imageUrl: 'https://static.wixstatic.com/media/ca5ead_3ae0c088336544d1879cdd3a16afea2a~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_3ae0c088336544d1879cdd3a16afea2a~mv2.jpg' },
    { id: 1046, name: '42" Wood Pedestals', imageUrl: 'https://static.wixstatic.com/media/ca5ead_bb5f5366c8fe4264bfceb71c0d430576~mv2.webp/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_bb5f5366c8fe4264bfceb71c0d430576~mv2.webp' },
    { id: 1047, name: 'Wicker and Glass Shelf', imageUrl: 'https://static.wixstatic.com/media/ca5ead_ad05421a0d6f49e0811cdb80942eb499~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_ad05421a0d6f49e0811cdb80942eb499~mv2.jpg' },
    { id: 1048, name: '12\' x 9\' Geometric Area Rug in Ivory/Black', imageUrl: 'https://static.wixstatic.com/media/ca5ead_d57dcbab07e743ed85412f3bbe7a4c3b~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_d57dcbab07e743ed85412f3bbe7a4c3b~mv2.png' },
    { id: 1049, name: 'Pink Three-ball Modern Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c6927475df7048c2bea05beb170d3e00~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_c6927475df7048c2bea05beb170d3e00~mv2.jpg' },
    { id: 1050, name: 'Gold Wire Cake Stand', imageUrl: 'https://static.wixstatic.com/media/ca5ead_3f85095b776d4b70b8c4e9c3c6117c60~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_3f85095b776d4b70b8c4e9c3c6117c60~mv2.jpg' },
    { id: 1051, name: 'Brass and Bamboo Side Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_4dab3c94b2a44171abaa634ccc0d70ca~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_4dab3c94b2a44171abaa634ccc0d70ca~mv2.jpg' },
    { id: 1052, name: 'Moroccan Style Black End Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_7abf9aa5469241d2b304302ddd4ecaf6~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_7abf9aa5469241d2b304302ddd4ecaf6~mv2.jpg' },
    { id: 1053, name: 'Postmodern Black Side Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_2b3f9b535d3f40bdaf34b5cb0fdb72c5~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_2b3f9b535d3f40bdaf34b5cb0fdb72c5~mv2.jpg' },
    { id: 1054, name: 'Embroidered Pillow', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e116e8d28faf46d9be68001e99b1169a~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_e116e8d28faf46d9be68001e99b1169a~mv2.jpg' },
    { id: 1055, name: 'Wide Peacock Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_b77e09053be04dcc81d2c50a26a29650~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_b77e09053be04dcc81d2c50a26a29650~mv2.jpg' },
    { id: 1056, name: 'White and Chrome Mid-Century Coffee Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_32bb4af6e3c1404eb7b250c2bb6c56c3~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_32bb4af6e3c1404eb7b250c2bb6c56c3~mv2.png' },
    { id: 1057, name: 'Modern Backdrop Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_5c6a4b5a2226453bb9de1930a9a1322f~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_5c6a4b5a2226453bb9de1930a9a1322f~mv2.png' },
    { id: 1058, name: 'Disco Ball Rentals', imageUrl: 'https://static.wixstatic.com/media/ca5ead_71b0c5be95f748248060b8cbe721e382~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_71b0c5be95f748248060b8cbe721e382~mv2.png' },
    { id: 1059, name: 'Crackled Amber Glass Votive Rental', imageUrl: 'https://static.wixstatic.com/media/ca5ead_2d79e6716be348109b7b6867eb8c1ef5~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_2d79e6716be348109b7b6867eb8c1ef5~mv2.png' },
    { id: 1060, name: '12 " Mardi Gras Centerpieces', imageUrl: 'https://static.wixstatic.com/media/ca5ead_95e412ce6e894d4d9babf3d3f2753da4~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_95e412ce6e894d4d9babf3d3f2753da4~mv2.jpg' },
    { id: 1061, name: 'Three-ball Mondern Vase (Orange)', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c6927475df7048c2bea05beb170d3e00~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_c6927475df7048c2bea05beb170d3e00~mv2.jpg' },
    { id: 1062, name: 'Mondern Ball single bud vase ( green)', imageUrl: 'https://static.wixstatic.com/media/ca5ead_0f62fb6fed7a41ecb265bd3fdd242733~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_0f62fb6fed7a41ecb265bd3fdd242733~mv2.jpg' },
    { id: 1063, name: 'Blue Wine Bottle Vase Rental', imageUrl: 'https://static.wixstatic.com/media/ca5ead_243b0b9322354f7389039cb923d72316~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_243b0b9322354f7389039cb923d72316~mv2.jpg' },
    { id: 1064, name: 'Bar Cart', imageUrl: 'https://static.wixstatic.com/media/ca5ead_114dd97112d04edea8e78b67fc82b2a7~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_114dd97112d04edea8e78b67fc82b2a7~mv2.jpg' },
    { id: 1065, name: 'Brown Bottle Collection', imageUrl: 'https://static.wixstatic.com/media/ca5ead_cbd770aaa9c844269dd5bae060b7dcf7~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_cbd770aaa9c844269dd5bae060b7dcf7~mv2.jpg' },
    { id: 1066, name: 'Bohemian Metal Stands', imageUrl: 'https://static.wixstatic.com/media/ca5ead_1d03b85e97334a19be0dff9c599e28bd~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_1d03b85e97334a19be0dff9c599e28bd~mv2.png' },
    { id: 1067, name: 'Large Southwest Carved Trunk', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c9717703a1f048b897a318072aa088a4~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_c9717703a1f048b897a318072aa088a4~mv2.jpg' },
    { id: 1068, name: 'Vintage Glass Swans', imageUrl: 'https://static.wixstatic.com/media/ca5ead_1ab1ef0d8d4f46708b547a5262a8017f~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_1ab1ef0d8d4f46708b547a5262a8017f~mv2.jpg' },
    { id: 1069, name: 'Small Southwest Carved Trunk', imageUrl: 'https://static.wixstatic.com/media/ca5ead_44c6722393ad476c939270d7acbbdd17~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_44c6722393ad476c939270d7acbbdd17~mv2.jpg' },
    { id: 1070, name: 'Brass Antelope', imageUrl: 'https://static.wixstatic.com/media/ca5ead_86d786b6cd7948bead2994e40a6c5aee~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_86d786b6cd7948bead2994e40a6c5aee~mv2.png' },
    { id: 1071, name: 'Hollywood Regency Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_fe1d02ca84ac4256b4e3352f5d081f86~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_fe1d02ca84ac4256b4e3352f5d081f86~mv2.jpg' },
    { id: 1072, name: '2\' x 7\' Runner', imageUrl: 'https://static.wixstatic.com/media/ca5ead_89feffd51a51471c81f79429ad6a2f9c~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_89feffd51a51471c81f79429ad6a2f9c~mv2.png' },
    { id: 1073, name: 'Leather-Bound Book Rentals', imageUrl: 'https://static.wixstatic.com/media/ca5ead_decd3ff787af4d99b96e9d0c59fb2fc3~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_decd3ff787af4d99b96e9d0c59fb2fc3~mv2.jpg' },
    { id: 1074, name: 'Eiffel Tower Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c1dc37e71c8f4230b41c80acff7c8491~mv2.jpg/v1/fill/w_243,h_243,al_c,lg_1,q_80,enc_avif,quality_auto/ca5ead_c1dc37e71c8f4230b41c80acff7c8491~mv2.jpg' },
    { id: 1075, name: 'Disney Props', imageUrl: 'https://static.wixstatic.com/media/ca5ead_1ed930a73c1a464886c6890f48f488f2~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_1ed930a73c1a464886c6890f48f488f2~mv2.jpg' },
    { id: 1076, name: 'Fall Styling Package', imageUrl: 'https://static.wixstatic.com/media/ca5ead_9203a5d6170b4f90a2c388f90b97ad43~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_9203a5d6170b4f90a2c388f90b97ad43~mv2.jpg' },
    { id: 1077, name: 'Gold Mirror with Stand', imageUrl: 'https://static.wixstatic.com/media/ca5ead_2a855caa733a42fabb900596c951a7e1~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_2a855caa733a42fabb900596c951a7e1~mv2.jpg' },
    { id: 1078, name: 'Metal Beer Sign', imageUrl: 'https://static.wixstatic.com/media/ca5ead_6ff395c828cd496bb8dd1702bdd0e95a~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_6ff395c828cd496bb8dd1702bdd0e95a~mv2.png' },
    { id: 1079, name: 'Brass Candlestick Collection', imageUrl: 'https://static.wixstatic.com/media/ca5ead_082da3c1d50e42f088e8d58b96f2b500~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_082da3c1d50e42f088e8d58b96f2b500~mv2.jpg' },
    { id: 1080, name: 'Floral Clip', imageUrl: 'https://static.wixstatic.com/media/ca5ead_8a63a1ab1f31420f85d58f9cf075f8df~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_8a63a1ab1f31420f85d58f9cf075f8df~mv2.jpg' },
    { id: 1081, name: 'Copper Moody Candle Holders', imageUrl: 'https://static.wixstatic.com/media/ca5ead_60943284aca5419ca1edd576e6d5cb8e~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_60943284aca5419ca1edd576e6d5cb8e~mv2.jpg' },
    { id: 1082, name: 'Mercury Glass Votives', imageUrl: 'https://static.wixstatic.com/media/ca5ead_0e9035bc9f5d4f79a4fdc90c2bfb2a25~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_0e9035bc9f5d4f79a4fdc90c2bfb2a25~mv2.jpg' },
    { id: 1083, name: '9\'6  x  6\'7  Indoor/Outdoor Area Rug in Natural / Cream', imageUrl: 'https://static.wixstatic.com/media/ca5ead_db7dd8f4dffa49ce8b61ff52f3e70542~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_db7dd8f4dffa49ce8b61ff52f3e70542~mv2.png' },
    { id: 1084, name: 'Copper Cake Stand', imageUrl: 'https://static.wixstatic.com/media/ca5ead_9ac4a4d4df8f473bb65e02f645717399~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_9ac4a4d4df8f473bb65e02f645717399~mv2.png' },
    { id: 1085, name: 'Wood Carved Coffee Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_403bada991ec4a8d855ed0d60a191d2e~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_403bada991ec4a8d855ed0d60a191d2e~mv2.jpg' },
    { id: 1086, name: 'Moon Macramé', imageUrl: 'https://static.wixstatic.com/media/ca5ead_7d80e72bac1640c1b9f72633c99bb49a~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_7d80e72bac1640c1b9f72633c99bb49a~mv2.jpg' },
    { id: 1087, name: 'Matching Peacock Chairs - pair rental', imageUrl: 'https://static.wixstatic.com/media/ca5ead_5ccf233d369a4e8aa6b192c89b933a66~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_5ccf233d369a4e8aa6b192c89b933a66~mv2.png' },
    { id: 1088, name: 'Tall Rattan Lantern', imageUrl: 'https://static.wixstatic.com/media/ca5ead_a06920b6537e4ef09181515edc67e879~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_a06920b6537e4ef09181515edc67e879~mv2.png' },
    { id: 1089, name: 'Wicker Coffee Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_7e45ee1d895f4b14908bb2f40c3f2b58~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_7e45ee1d895f4b14908bb2f40c3f2b58~mv2.jpg' },
    { id: 1090, name: 'Pink fur Pillow', imageUrl: 'https://static.wixstatic.com/media/ca5ead_58d415bb786947bbb98a92cdfa461cfc~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_58d415bb786947bbb98a92cdfa461cfc~mv2.png' },
    { id: 1091, name: 'Small Table Pampas in Glass Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_ffb59fb84efc403288a885dcf3d55110~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_ffb59fb84efc403288a885dcf3d55110~mv2.jpg' },
    { id: 1092, name: 'Mad Hatter Tea Party Rentals', imageUrl: 'https://static.wixstatic.com/media/ca5ead_ef6974792538457c8e71e53542c6c34b~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_ef6974792538457c8e71e53542c6c34b~mv2.jpg' },
    { id: 1093, name: 'Black Wire 9" Lantern', imageUrl: 'https://static.wixstatic.com/media/ca5ead_44c2e26d9f1a4d44b4ca28830f1d64b4~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_44c2e26d9f1a4d44b4ca28830f1d64b4~mv2.jpg' },
    { id: 1094, name: 'Black 18" Rattan Lantern', imageUrl: 'https://static.wixstatic.com/media/ca5ead_d96105ad8d21435998658d00224ceeeb~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_d96105ad8d21435998658d00224ceeeb~mv2.jpg' },
    { id: 1095, name: 'Black 24" Rattan Lantern', imageUrl: 'https://static.wixstatic.com/media/ca5ead_b46fb24d8ebe44cfbeac62425e65f7c0~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_b46fb24d8ebe44cfbeac62425e65f7c0~mv2.jpg' },
    { id: 1096, name: 'Black Wire 18" Lantern', imageUrl: 'https://static.wixstatic.com/media/ca5ead_7a9e8adb34bf45919161d63a46fd37dc~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_7a9e8adb34bf45919161d63a46fd37dc~mv2.jpg' },
    { id: 1097, name: 'Medium Brass Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_2586a143a4f0443bace23157f5f72eb4~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_2586a143a4f0443bace23157f5f72eb4~mv2.png' },
    { id: 1098, name: 'Brass Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_098c5a9393d8452e9ec1ec76bbcb6c50~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_098c5a9393d8452e9ec1ec76bbcb6c50~mv2.png' },
    { id: 1099, name: 'Emerald Dutch', imageUrl: 'https://static.wixstatic.com/media/ca5ead_d3ac25d81f26438d9b690c240d9795e7~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_d3ac25d81f26438d9b690c240d9795e7~mv2.jpg' },
    { id: 1100, name: 'Large Vintage Floral Picture in Gold frame', imageUrl: 'https://static.wixstatic.com/media/ca5ead_1e452fa793864d3daf01a95db7c46b33~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_1e452fa793864d3daf01a95db7c46b33~mv2.png' },
    { id: 1101, name: 'Black Tulip High Top Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_9dc39e86f3824a0287f97d72b2817ebf~mv2.jpg/v1/fill/w_243,h_243,al_c,lg_1,q_80,enc_avif,quality_auto/ca5ead_9dc39e86f3824a0287f97d72b2817ebf~mv2.jpg' },
    { id: 1102, name: 'Mid-Century Modern High Top Table and Bar Stools', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c063a3587d3a47c09ff1f2d19c0c4bd2~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_c063a3587d3a47c09ff1f2d19c0c4bd2~mv2.jpg' },
    { id: 1103, name: 'Vintage Green End Cabinet', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f5b42b4a8d18493bbf572a9983e9b862~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f5b42b4a8d18493bbf572a9983e9b862~mv2.jpg' },
    { id: 1104, name: 'Prince - Purple Tufted Sofa', imageUrl: 'https://static.wixstatic.com/media/ca5ead_2983e46e871b457db7e480afbda533ca~mv2.jpg/v1/fill/w_243,h_243,al_c,lg_1,q_80,enc_avif,quality_auto/ca5ead_2983e46e871b457db7e480afbda533ca~mv2.jpg' },
    { id: 1105, name: 'Mardi Gra Decor', imageUrl: 'https://static.wixstatic.com/media/ca5ead_5f00d63367d6459897595620bd315ee6~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_5f00d63367d6459897595620bd315ee6~mv2.jpg' },
    { id: 1106, name: '12\'5 x 9\' Black and White Checker Matt', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c52992aff8e147d581b04120df7d71ed~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_c52992aff8e147d581b04120df7d71ed~mv2.jpg' },
    { id: 1107, name: 'Assorted Stemmed Vintage Candy Dishes', imageUrl: 'https://static.wixstatic.com/media/ca5ead_9cc0742be77747c99cd4104298cbadb7~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_9cc0742be77747c99cd4104298cbadb7~mv2.png' },
    { id: 1108, name: 'Crackled Black & Gold Hurrica Votives', imageUrl: 'https://static.wixstatic.com/media/ca5ead_a334d887039e4c17ad476f57bb909212~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_a334d887039e4c17ad476f57bb909212~mv2.jpg' },
    { id: 1109, name: 'Cobalt Hurricane Set', imageUrl: 'https://static.wixstatic.com/media/ca5ead_6a3759b438c24dd78f87d0e74a898f37~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_6a3759b438c24dd78f87d0e74a898f37~mv2.jpg' },
    { id: 1110, name: '3" round bottom vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_57d690b8109a4106a7049b60b357f7c2~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_57d690b8109a4106a7049b60b357f7c2~mv2.jpg' },
    { id: 1111, name: '7" single bud vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_bce9abceefa1482c87bd06fc8e622ac2~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_bce9abceefa1482c87bd06fc8e622ac2~mv2.jpg' },
    { id: 1112, name: '4"small arrangement vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f5660fca6e394f0a8ad2533e280612d7~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f5660fca6e394f0a8ad2533e280612d7~mv2.jpg' },
    { id: 1113, name: '12" Mercury Glass Hurricane Candle Holders', imageUrl: 'https://static.wixstatic.com/media/ca5ead_94a13d2afc95450bba75959646be663e~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_94a13d2afc95450bba75959646be663e~mv2.jpg' },
    { id: 1114, name: 'Dried Arrangement Centerpiece', imageUrl: 'https://static.wixstatic.com/media/ca5ead_03a9ecf665214a9dad1a885781c2cd9e~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_03a9ecf665214a9dad1a885781c2cd9e~mv2.jpg' },
    { id: 1115, name: 'Tropical Rattan Sofa', imageUrl: 'https://static.wixstatic.com/media/ca5ead_2836ee20d55d4ccc962360b403ca7bd1~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_2836ee20d55d4ccc962360b403ca7bd1~mv2.png' },
    { id: 1116, name: 'Folding BOHO Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_cab69ef180de431b98a5bb871b187085~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_cab69ef180de431b98a5bb871b187085~mv2.jpg' },
    { id: 1117, name: 'Small Brass Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_2b2ce1663ebd4b9c94ae2e435190d885~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_2b2ce1663ebd4b9c94ae2e435190d885~mv2.png' },
    { id: 1118, name: 'Brass Etched Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_40959379bbf545a5a19b1c05473c2f0c~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_40959379bbf545a5a19b1c05473c2f0c~mv2.jpg' },
    { id: 1119, name: 'Narrow Brass Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_18474c5a1f93458abb091bd4deb2c10e~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_18474c5a1f93458abb091bd4deb2c10e~mv2.jpg' },
    { id: 1120, name: 'Cracked Turquoise Vessels', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c3937d3a7cd74ef6b255d108c87a147c~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_c3937d3a7cd74ef6b255d108c87a147c~mv2.jpg' },
    { id: 1121, name: 'Turquoise Hurricanes', imageUrl: 'https://static.wixstatic.com/media/ca5ead_ef4321c703e446d68f5efec0c96e5a25~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_ef4321c703e446d68f5efec0c96e5a25~mv2.jpg' },
    { id: 1122, name: '14" Mercury Glass Hurricane Candle Holders', imageUrl: 'https://static.wixstatic.com/media/ca5ead_d850f19161024280914d640ba46b7834~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_d850f19161024280914d640ba46b7834~mv2.jpg' },
    { id: 1123, name: 'Blue Azure Loveseat', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e26cb52eed374e73866989ce00d6bc67~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_e26cb52eed374e73866989ce00d6bc67~mv2.png' },
    { id: 1124, name: 'Maple', imageUrl: 'https://static.wixstatic.com/media/ca5ead_5bf3f3fefaaf438c8cea4c7ed3e1cf2c~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_5bf3f3fefaaf438c8cea4c7ed3e1cf2c~mv2.jpg' },
    { id: 1125, name: 'Pink Goblet and Stemware', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c6bef85878ac4aff8b568ce78967ac89~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_c6bef85878ac4aff8b568ce78967ac89~mv2.jpg' },
    { id: 1126, name: '9\'6 x 6\'6 Navy and Berry Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_2d01998cd2e447b4b69ecb3810830294~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_2d01998cd2e447b4b69ecb3810830294~mv2.jpg' },
    { id: 1127, name: '7\'5 x 5\'3 Crème French Country Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_9e0c1d0b6bef4f12b66fa865f78ec3ef~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_9e0c1d0b6bef4f12b66fa865f78ec3ef~mv2.jpg' },
    { id: 1128, name: '10\' x 8\' Distressed Red Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c8125ddd06844af2986f1c3fa257b0b2~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_c8125ddd06844af2986f1c3fa257b0b2~mv2.jpg' },
    { id: 1129, name: 'Bamboo Display Shelf', imageUrl: 'https://static.wixstatic.com/media/ca5ead_6dea9ac0c03f4ea59886dcbcd3856727~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_6dea9ac0c03f4ea59886dcbcd3856727~mv2.jpg' },
    { id: 1130, name: 'Wicker Cake Stand', imageUrl: 'https://static.wixstatic.com/media/ca5ead_28115a9b5c7f4416abd3f7c4df46925e~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_28115a9b5c7f4416abd3f7c4df46925e~mv2.jpg' },
    { id: 1131, name: 'Single Bud Vases', imageUrl: 'https://static.wixstatic.com/media/ca5ead_5cd667bd2b864fc3abed244bbe48e964~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_5cd667bd2b864fc3abed244bbe48e964~mv2.jpg' },
    { id: 1132, name: 'Pinky Chaise Lounge', imageUrl: 'https://static.wixstatic.com/media/ca5ead_7afb909cb22340ea9aaed52192bf8f25~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_7afb909cb22340ea9aaed52192bf8f25~mv2.jpg' },
    { id: 1133, name: 'Coral Arm Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_064f377d1f9148f1b81df0951d7261c0~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_064f377d1f9148f1b81df0951d7261c0~mv2.jpg' },
    { id: 1134, name: 'Hand Bongo', imageUrl: 'https://static.wixstatic.com/media/ca5ead_38b9b2fd8aed4c0e8e27584a57094baf~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_38b9b2fd8aed4c0e8e27584a57094baf~mv2.jpg' },
    { id: 1135, name: '5\'9 x 3\'4 Hand-Knotted Turkish Red Styling Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_8967516569d443c0bfe0e1c481014cab~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_8967516569d443c0bfe0e1c481014cab~mv2.jpg' },
    { id: 1136, name: 'Pampas Spray', imageUrl: 'https://static.wixstatic.com/media/ca5ead_6e05089e1b56485085a5116191dc2719~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_6e05089e1b56485085a5116191dc2719~mv2.jpg' },
    { id: 1137, name: 'U Shaped Clay Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_555cd8ae928041729ef835044ad71fee~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_555cd8ae928041729ef835044ad71fee~mv2.jpg' },
    { id: 1138, name: 'Artisan Patterned Vase - Green', imageUrl: 'https://static.wixstatic.com/media/ca5ead_0743f995be3543c0912ef0926e060836~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_0743f995be3543c0912ef0926e060836~mv2.jpg' },
    { id: 1139, name: 'Artisan Patterned Vase - Black', imageUrl: 'https://static.wixstatic.com/media/ca5ead_8786ae1d51cf450bb9085b62773a88a5~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_8786ae1d51cf450bb9085b62773a88a5~mv2.jpg' },
    { id: 1140, name: 'Vintage Amber Goblets for Rent', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f1edb997ca2f43ad8db38df357623cfe~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f1edb997ca2f43ad8db38df357623cfe~mv2.png' },
    { id: 1141, name: 'Custom Faux and Dried Florals', imageUrl: 'https://static.wixstatic.com/media/ca5ead_01598b7ab3f049d4b4dcaba1893f4213~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_01598b7ab3f049d4b4dcaba1893f4213~mv2.jpg' },
    { id: 1142, name: 'Flower Towers', imageUrl: 'https://static.wixstatic.com/media/ca5ead_46ded8f8d163496e8482c126021219c1~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_46ded8f8d163496e8482c126021219c1~mv2.jpg' },
    { id: 1143, name: 'Floor Size Pampas Arrangement', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f4ceabc0518f49d49fa35f097d059b2e~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f4ceabc0518f49d49fa35f097d059b2e~mv2.png' },
    { id: 1144, name: 'Display Shelf', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e0f2c9d098d5438a8a8701546cdc5626~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_e0f2c9d098d5438a8a8701546cdc5626~mv2.jpg' },
    { id: 1145, name: 'Assorted Straw Vases', imageUrl: 'https://static.wixstatic.com/media/ca5ead_a4666ffa709146fea015cb355429183a~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_a4666ffa709146fea015cb355429183a~mv2.jpg' },
    { id: 1146, name: '6\' x  2\' 3  x  3\' Antique Carved Wood Bar', imageUrl: 'https://static.wixstatic.com/media/ca5ead_ea8ca98cfcd64398964255c2a55fe342~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_ea8ca98cfcd64398964255c2a55fe342~mv2.png' },
    { id: 1147, name: 'Large Brass Coffee Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_d6d0cce82f8b4b1abd95e68fe4899fcc~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_d6d0cce82f8b4b1abd95e68fe4899fcc~mv2.jpg' },
    { id: 1148, name: 'Crème Tufted Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_be8eda842c6248b482ed1ac7ac8c2a3f~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_be8eda842c6248b482ed1ac7ac8c2a3f~mv2.jpg' },
    { id: 1149, name: 'Blush Tufed High Back Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_948a5445abfd48828b10a6d73ed1413c~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_948a5445abfd48828b10a6d73ed1413c~mv2.jpg' },
    { id: 1150, name: 'Vintage Hand Painted Tropical Umbrella', imageUrl: 'https://static.wixstatic.com/media/ca5ead_92f8430b0282489f8b647f4d4835d0cc~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_92f8430b0282489f8b647f4d4835d0cc~mv2.jpg' },
    { id: 1151, name: '4 inch Single Bud Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f9be13bcf04141ea95d78c990f02e5c5~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f9be13bcf04141ea95d78c990f02e5c5~mv2.jpg' },
    { id: 1152, name: 'Bamboo Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e141050e3ea74b02931dda2baa839e70~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_e141050e3ea74b02931dda2baa839e70~mv2.jpg' },
    { id: 1153, name: 'Bright Mustard Arm Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_0274c107e0934f8cab0f80c44d50144d~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_0274c107e0934f8cab0f80c44d50144d~mv2.jpg' },
    { id: 1154, name: 'Baby Blue Tufted High Back Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_abb7d3362ca84bc2b0bb880fc47437ce~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_abb7d3362ca84bc2b0bb880fc47437ce~mv2.jpg' },
    { id: 1155, name: 'Pair of Emerald Velvet Chairs', imageUrl: 'https://static.wixstatic.com/media/ca5ead_515c0818164148e1b8b8c6f1f0cef557~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_515c0818164148e1b8b8c6f1f0cef557~mv2.jpg' },
    { id: 1156, name: 'Oversized flowers in a Woven Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f4a3a2e8624449d4907faf55ef3f29f0~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f4a3a2e8624449d4907faf55ef3f29f0~mv2.png' },
    { id: 1157, name: '3 inch Glass Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f5660fca6e394f0a8ad2533e280612d7~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f5660fca6e394f0a8ad2533e280612d7~mv2.jpg' },
    { id: 1158, name: 'Mustard Arm Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_a5ad2e30595b4a799fec9ac95ff025c3~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_a5ad2e30595b4a799fec9ac95ff025c3~mv2.jpg' },
    { id: 1159, name: 'Rattan Chairs', imageUrl: 'https://static.wixstatic.com/media/ca5ead_6b090fd914ec4e8bbb541c17f78b7062~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_6b090fd914ec4e8bbb541c17f78b7062~mv2.jpg' },
    { id: 1160, name: 'Wood Farm Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_a2e88047865d4c4b86a9511f745e04d8~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_a2e88047865d4c4b86a9511f745e04d8~mv2.jpg' },
    { id: 1161, name: '10" x 17" Gold Wire Candle Holder', imageUrl: 'https://static.wixstatic.com/media/ca5ead_828f09180d034997ade363dcf99dbe0d~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_828f09180d034997ade363dcf99dbe0d~mv2.jpg' },
    { id: 1162, name: '4" x 7" Gold Wire Candle Holder', imageUrl: 'https://static.wixstatic.com/media/ca5ead_6f46c4d5a9354ee0a1e3ac5f42b6320f~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_6f46c4d5a9354ee0a1e3ac5f42b6320f~mv2.jpg' },
    { id: 1163, name: 'Round Gold Coffee Table w/ Glass Top', imageUrl: 'https://static.wixstatic.com/media/ca5ead_323707d84da7472da9b06db815cb401c~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_323707d84da7472da9b06db815cb401c~mv2.jpg' },
    { id: 1164, name: 'Four Panel Wood Carved Screen', imageUrl: 'https://static.wixstatic.com/media/ca5ead_a65eb74cb17a4952af3e5d0dc3daf36d~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_a65eb74cb17a4952af3e5d0dc3daf36d~mv2.jpg' },
    { id: 1165, name: 'Two-tier Dessert Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_34e95e135345466cb4e2f8abae99d33d~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_34e95e135345466cb4e2f8abae99d33d~mv2.jpg' },
    { id: 1166, name: 'Vintage Folding Wood Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_06dcaf8cb29c44eda58a8c4c9c7a7bee~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_06dcaf8cb29c44eda58a8c4c9c7a7bee~mv2.jpg' },
    { id: 1167, name: 'Matching Taupe Arm Chairs', imageUrl: 'https://static.wixstatic.com/media/ca5ead_b413fe1a3fae43af98c7a632b94b69fb~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_b413fe1a3fae43af98c7a632b94b69fb~mv2.jpg' },
    { id: 1168, name: 'Taupe Highback Armchair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_506b9afefdf0465a938c0fb958990b1f~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_506b9afefdf0465a938c0fb958990b1f~mv2.jpg' },
    { id: 1169, name: 'Velvet Navy High back Chairs', imageUrl: 'https://static.wixstatic.com/media/ca5ead_d857b225565b43c8be484d6726f5654c~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_d857b225565b43c8be484d6726f5654c~mv2.jpg' },
    { id: 1170, name: 'Turkish Brass Coffee Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_b808cb48d5f14c60afc7d441e75281b4~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_b808cb48d5f14c60afc7d441e75281b4~mv2.jpg' },
    { id: 1171, name: 'Bamboo Petite Folding Tea Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e55361fdf7ec45159b4c1d1f003f83f2~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_e55361fdf7ec45159b4c1d1f003f83f2~mv2.jpg' },
    { id: 1172, name: '10" x 13" Gold Wire Candle Holder', imageUrl: 'https://static.wixstatic.com/media/ca5ead_36086e7f994644dabdf14f697179051c~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_36086e7f994644dabdf14f697179051c~mv2.jpg' },
    { id: 1173, name: 'Long Wood Gift Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e3879cd4a38d44f18aa2a67ed220c151~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_e3879cd4a38d44f18aa2a67ed220c151~mv2.jpg' },
    { id: 1174, name: 'Large Neutral Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e1eb2d8403e94022b33b25de2e7624c6~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_e1eb2d8403e94022b33b25de2e7624c6~mv2.jpg' },
    { id: 1175, name: '76 in Tall X 84 in Wide Hand-made Floral Wall Backdrop', imageUrl: 'https://static.wixstatic.com/media/ca5ead_78e5d375b64746aba28386dda33c2803~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_78e5d375b64746aba28386dda33c2803~mv2.jpg' },
    { id: 1176, name: 'Rattan Bistro Set', imageUrl: 'https://static.wixstatic.com/media/ca5ead_11f4da35fd8248168d553667757a9a9d~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_11f4da35fd8248168d553667757a9a9d~mv2.jpg' },
    { id: 1177, name: '8\' x 5\' Off-white Shag Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c87cdfe6dba44db0908c3221a9e0edd8~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_c87cdfe6dba44db0908c3221a9e0edd8~mv2.jpg' },
    { id: 1178, name: 'Silver Nesting Tables', imageUrl: 'https://static.wixstatic.com/media/ca5ead_e6d4ca5a714c486788c55cfdb658f17d~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_e6d4ca5a714c486788c55cfdb658f17d~mv2.jpg' },
    { id: 1179, name: 'Vintage Gold Placemats', imageUrl: 'https://static.wixstatic.com/media/ca5ead_59e179efe1444cd5a1803ec17b851bea~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_59e179efe1444cd5a1803ec17b851bea~mv2.jpg' },
    { id: 1180, name: 'Macramé', imageUrl: 'https://static.wixstatic.com/media/ca5ead_86a16fef3e7546f8bb4a2e24f6e6ea75~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_86a16fef3e7546f8bb4a2e24f6e6ea75~mv2.jpg' },
    { id: 1181, name: 'Tall gold floor vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_73013664ed3040158fbbc2eb10eaafb5~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_73013664ed3040158fbbc2eb10eaafb5~mv2.jpg' },
    { id: 1182, name: 'Tall Orange Display Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_7a1033d5192f4579b415ff6c575cc45b~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_7a1033d5192f4579b415ff6c575cc45b~mv2.jpg' },
    { id: 1183, name: 'High-Back Orange Chairs', imageUrl: 'https://static.wixstatic.com/media/ca5ead_2f88b2b956744e3f83ab27b4787de113~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_2f88b2b956744e3f83ab27b4787de113~mv2.jpg' },
    { id: 1184, name: 'Ceremony Pampas Design', imageUrl: 'https://static.wixstatic.com/media/ca5ead_d48e82cc6c53492badfbad9ac256af82~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_d48e82cc6c53492badfbad9ac256af82~mv2.png' },
    { id: 1185, name: '8\' Square Deep Red Oriental Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_0f1493074f2c46e798c871bb2f366ead~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_0f1493074f2c46e798c871bb2f366ead~mv2.jpg' },
    { id: 1186, name: '5\' x 7\' Aztec Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_b32b50ecf04a4884af5dc2603f153cbc~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_b32b50ecf04a4884af5dc2603f153cbc~mv2.jpg' },
    { id: 1187, name: '5 x 7 Summer Field Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_42150a7166be45558f66260571445f4a~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_42150a7166be45558f66260571445f4a~mv2.jpg' },
    { id: 1188, name: 'Pink Goblets and Stemware', imageUrl: 'https://static.wixstatic.com/media/ca5ead_b53d1e2931b24d208173b8a853c2ac81~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_b53d1e2931b24d208173b8a853c2ac81~mv2.jpg' },
    { id: 1189, name: 'Round Wire Candle Holder', imageUrl: 'https://static.wixstatic.com/media/ca5ead_35dbc2d28a7d42879365e5b01433aaa5~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_35dbc2d28a7d42879365e5b01433aaa5~mv2.jpg' },
    { id: 1190, name: 'Silver Ornate Raised Cake Platter (Round)', imageUrl: 'https://static.wixstatic.com/media/ca5ead_fabfe341da0e4ef7bf332c0260c015fc~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_fabfe341da0e4ef7bf332c0260c015fc~mv2.jpg' },
    { id: 1191, name: 'Antique Stain Glass Ball', imageUrl: 'https://static.wixstatic.com/media/ca5ead_95f9fc337fd34de09b4d91c02965a0f8~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_95f9fc337fd34de09b4d91c02965a0f8~mv2.jpg' },
    { id: 1192, name: 'Tall Disco Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f9a022317e2d4d15b362652a297ecc71~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f9a022317e2d4d15b362652a297ecc71~mv2.jpg' },
    { id: 1193, name: 'Green Goblets and Stemware', imageUrl: 'https://static.wixstatic.com/media/ca5ead_72fbdebddf1c46709db9488d385c5852~mv2.jpeg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_72fbdebddf1c46709db9488d385c5852~mv2.jpeg' },
    { id: 1194, name: 'Black Glass Lanterns', imageUrl: 'https://static.wixstatic.com/media/ca5ead_6a3bdd21276f41cfbaed2a39547ba687~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_6a3bdd21276f41cfbaed2a39547ba687~mv2.jpg' },
    { id: 1195, name: 'Bamboo Bar Cart', imageUrl: 'https://static.wixstatic.com/media/ca5ead_43b70fcd4b93439ca1641d71234f2770~mv2.webp/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_43b70fcd4b93439ca1641d71234f2770~mv2.webp' },
    { id: 1196, name: 'Gold Celestial Chimes', imageUrl: 'https://static.wixstatic.com/media/ca5ead_445c700a5611471ba313c62f8030d987~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_445c700a5611471ba313c62f8030d987~mv2.jpg' },
    { id: 1197, name: 'Pair of Wavy Peacocks', imageUrl: 'https://static.wixstatic.com/media/ca5ead_5d5bcf0324c9494dbe5c2a3f7a06d171~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_5d5bcf0324c9494dbe5c2a3f7a06d171~mv2.jpg' },
    { id: 1198, name: 'Clear Stemmed Glassware', imageUrl: 'https://static.wixstatic.com/media/ca5ead_fc41e338f9d64482a6dc41b83f811ba6~mv2.jpeg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_fc41e338f9d64482a6dc41b83f811ba6~mv2.jpeg' },
    { id: 1199, name: 'Blue Goblet and Stemware', imageUrl: 'https://static.wixstatic.com/media/ca5ead_a7e0f3f31dfe4527bbb923825f377f29~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_a7e0f3f31dfe4527bbb923825f377f29~mv2.jpg' },
    { id: 1200, name: 'Purple Goblets', imageUrl: 'https://static.wixstatic.com/media/ca5ead_0e9035bc9f5d4f79a4fdc90c2bfb2a25~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_0e9035bc9f5d4f79a4fdc90c2bfb2a25~mv2.jpg' },
    { id: 1201, name: 'Tall Bamboo Lantern', imageUrl: 'https://static.wixstatic.com/media/ca5ead_de54a036cfc94b0786efe4d142772b98~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_de54a036cfc94b0786efe4d142772b98~mv2.jpg' },
    { id: 1202, name: 'Smoke Goblets and Stemmed Glassware', imageUrl: 'https://static.wixstatic.com/media/ca5ead_2f1f5f3fef1a462f967bef8b95dbcd8a~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto,enc_avif,quality_auto/ca5ead_2f1f5f3fef1a462f967bef8b95dbcd8a~mv2.jpg' },
    { id: 1203, name: 'Tall Black Bamboo Lanterns', imageUrl: 'https://static.wixstatic.com/media/ca5ead_58b86627f5cf4fc6baa0b16ec8104e2f~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_58b86627f5cf4fc6baa0b16ec8104e2f~mv2.jpg' },
    { id: 1204, name: 'Wicker Circle Planter', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c8b0e52f79c74bbdbbc4239ee9c1d68f~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_c8b0e52f79c74bbdbbc4239ee9c1d68f~mv2.jpg' },
    { id: 1205, name: 'Medium Bamboo Lantern', imageUrl: 'https://static.wixstatic.com/media/ca5ead_c064ffe76fd3487a9648ffe33caaa517~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_c064ffe76fd3487a9648ffe33caaa517~mv2.jpg' },
    { id: 1206, name: 'Blue Bonnie Loveseat', imageUrl: 'https://static.wixstatic.com/media/ca5ead_d524fe387be04e0e8086191cdf1bb45a~mv2.png/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_d524fe387be04e0e8086191cdf1bb45a~mv2.png' },
    { id: 1207, name: 'Sally Sue Loveseat', imageUrl: 'https://static.wixstatic.com/media/ca5ead_7c600316e2f54a8899e717c15c618d35~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_7c600316e2f54a8899e717c15c618d35~mv2.jpg' },
    { id: 1208, name: 'Vera May', imageUrl: 'https://static.wixstatic.com/media/ca5ead_05c131dba5ef45e3a294bd85c47d034a~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_05c131dba5ef45e3a294bd85c47d034a~mv2.jpg' },
    { id: 1209, name: 'Large Gold Mirror', imageUrl: 'https://static.wixstatic.com/media/ca5ead_cf81c8fa6bbe428eb7c2e4070b838a9f~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_cf81c8fa6bbe428eb7c2e4070b838a9f~mv2.jpg' },
    { id: 1210, name: 'Gold Diva Loveseat', imageUrl: 'https://static.wixstatic.com/media/ca5ead_a8bb57ceed5645038294010534037fad~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_a8bb57ceed5645038294010534037fad~mv2.jpg' },
    { id: 1211, name: 'Green Chesterfield Loveseat', imageUrl: 'https://static.wixstatic.com/media/ca5ead_fa4c284918e441d98c2a2a241e520134~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_fa4c284918e441d98c2a2a241e520134~mv2.jpg' },
    { id: 1212, name: 'Medium Pampas Arrangement', imageUrl: 'https://static.wixstatic.com/media/ca5ead_77da7185320d4c3394b97ca2df56c767~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_77da7185320d4c3394b97ca2df56c767~mv2.jpg' },
    { id: 1213, name: 'Mirrored Vase', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f9a022317e2d4d15b362652a297ecc71~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f9a022317e2d4d15b362652a297ecc71~mv2.jpg' },
    { id: 1214, name: 'Flameless Pillar Candle Rental', imageUrl: 'https://static.wixstatic.com/media/ca5ead_4ee68b40098a4f15badd85e749625eee~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_4ee68b40098a4f15badd85e749625eee~mv2.jpg' },
    { id: 1215, name: 'Wooded Candle Holders', imageUrl: 'https://static.wixstatic.com/media/ca5ead_15f03ea384a44a9086b9ece043ccde13~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_15f03ea384a44a9086b9ece043ccde13~mv2.jpg' },
    { id: 1216, name: 'Black Velvet Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_4304dd91faad4fbd9fb286449bfad48a~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_4304dd91faad4fbd9fb286449bfad48a~mv2.jpg' },
    { id: 1217, name: 'Vintage Sunburst Screen', imageUrl: 'https://static.wixstatic.com/media/ca5ead_312c5bedb7c24e23804947d48bd0ad02~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_312c5bedb7c24e23804947d48bd0ad02~mv2.jpg' },
    { id: 1218, name: 'Blue and Green Glass Lamp', imageUrl: 'https://static.wixstatic.com/media/ca5ead_9c83ec667f5648e58a5d08cf781258b1~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_9c83ec667f5648e58a5d08cf781258b1~mv2.jpg' },
    { id: 1219, name: 'lack Iron Peacock Chair', imageUrl: 'https://static.wixstatic.com/media/ca5ead_f93f6027d28144d6bcf397d95d630375~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_f93f6027d28144d6bcf397d95d630375~mv2.jpg' },
    { id: 1220, name: 'Glass Top Gold Side Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_68c4a850d83c4f2186a05befb5278195~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_68c4a850d83c4f2186a05befb5278195~mv2.jpg' },
    { id: 1221, name: 'Aztec Foldable Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_d84b0aa5e4a6442fb3daa2d5e8aa6b2e~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_d84b0aa5e4a6442fb3daa2d5e8aa6b2e~mv2.jpg' },
    { id: 1222, name: 'Tan and White Throw Rug', imageUrl: 'https://static.wixstatic.com/media/ca5ead_bcb72b204dc3471b8f02dd126edd6441~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_bcb72b204dc3471b8f02dd126edd6441~mv2.jpg' },
    { id: 1223, name: 'Vintage Birdcages', imageUrl: 'https://static.wixstatic.com/media/ca5ead_eca8cbd6ca9149cab55007bdcb4445eb~mv2.jpg/v1/fill/w_243,h_243,al_c,lg_1,q_80,enc_avif,quality_auto/ca5ead_eca8cbd6ca9149cab55007bdcb4445eb~mv2.jpg' },
    { id: 1224, name: 'Gold Moroccan End Table', imageUrl: 'https://static.wixstatic.com/media/ca5ead_b3b83bcf49644c4590ee0f079b91af5c~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_b3b83bcf49644c4590ee0f079b91af5c~mv2.jpg' },
    { id: 1225, name: 'Vintage Goblets', imageUrl: 'https://static.wixstatic.com/media/ca5ead_951b66c91f6840eb86f4c163b29197a0~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_951b66c91f6840eb86f4c163b29197a0~mv2.jpg' },
    { id: 1226, name: 'Chinese Black and Gold 4 Panel Screen', imageUrl: 'https://static.wixstatic.com/media/ca5ead_405a8a5878414f90822f35388b83f986~mv2.jpg/v1/fill/w_800,h_800,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/ca5ead_405a8a5878414f90822f35388b83f986~mv2.jpg' },
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
  const prevSceneImageUrlRef = useRef<string | null>(null);
  const prevProductImageUrlRef = useRef<string | null>(null);

  const sceneImageUrl = useMemo(() => {
    if (prevSceneImageUrlRef.current) {
      URL.revokeObjectURL(prevSceneImageUrlRef.current);
      prevSceneImageUrlRef.current = null;
    }
    return sceneImage ? URL.createObjectURL(sceneImage) : null;
  }, [sceneImage]);

  useEffect(() => {
    if (sceneImageUrl) {
      prevSceneImageUrlRef.current = sceneImageUrl;
    }
  }, [sceneImageUrl]);

  const productImageUrl = useMemo(() => {
    if (prevProductImageUrlRef.current && prevProductImageUrlRef.current !== selectedProduct?.imageUrl) {
      URL.revokeObjectURL(prevProductImageUrlRef.current);
      prevProductImageUrlRef.current = null;
    }
    return selectedProduct ? selectedProduct.imageUrl : null;
  }, [selectedProduct]);

  useEffect(() => {
    if (productImageUrl && productImageUrl.startsWith('blob:')) {
      prevProductImageUrlRef.current = productImageUrl;
    }
  }, [productImageUrl]);

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
        setSelectedProduct(prev => {
          if (prev?.imageUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(prev.imageUrl);
          }
          return product;
        });
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
      setHistory([]);
      setSelectedProduct(null);
      setProductImageFile(null);
      setDebugImageUrl(null);
      setDebugPrompt(null);
      setPersistedOrbPosition(null);
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

  const handleSceneImageChange = useCallback((file: File | null) => {
    if (file) {
      setHistory([]);
      setSelectedProduct(null);
      setProductImageFile(null);
      setDebugImageUrl(null);
      setDebugPrompt(null);
      setPersistedOrbPosition(null);
    }
    setSceneImage(file);
  }, []);

  const handleAddProduct = (product: Product) => {
      setInventory(prev => [...prev, product]);
  };

  const handleDeleteProduct = (id: number) => {
      setInventory(prev => {
          const product = prev.find(p => p.id === id);
          if (product?.imageUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(product.imageUrl);
          }
          return prev.filter(p => p.id !== id);
      });
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
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Curated event rentals &mdash; Osage Hills, Oklahoma</p>
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
                            <p className="text-xs text-zinc-500 mb-2">Drag the active piece onto the canvas to visualize your event.</p>
                        </div>
                    )}
                </div>
                
                <div className="p-6 border-t border-zinc-100 mt-auto">
                    <div className="text-center">
                        <p className="font-serif text-sm italic text-zinc-600 mb-1">The Velvet Willow</p>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-400 leading-relaxed">
                            Full-service event styling<br/>
                            Osage Hills, Oklahoma
                        </p>
                    </div>
                </div>
            </aside>

            {/* MAIN CANVAS: Mood Board */}
            <main className="flex-1 relative bg-dot-pattern flex flex-col h-full overflow-hidden">
                <div className="absolute top-6 left-8 z-10 pointer-events-none">
                    <h1 className="font-serif text-5xl text-zinc-300 italic tracking-tight opacity-50 mix-blend-multiply">Mood Board</h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mt-2 ml-1">Design your perfect event</p>
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
                            onFileSelect={handleSceneImageChange} 
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
                                <p className="font-serif text-3xl text-zinc-300 italic mb-2">Where dreams come to life</p>
                                <p className="text-sm text-zinc-400 mb-8 max-w-md text-center">Upload your venue photo or choose a backdrop below to begin designing your perfect event.</p>
                                
                                <div className="flex flex-col items-center gap-4 pointer-events-auto">
                                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Select a backdrop</p>
                                    <div className="flex gap-4 flex-wrap justify-center max-w-2xl">
                                        {defaultVenues.map((venue, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleDefaultVenueSelect(venue.url)}
                                                className="group relative w-32 h-20 rounded-md overflow-hidden border border-zinc-200 hover:border-zinc-400 hover:shadow-md transition-all"
                                                title={venue.name}
                                            >
                                                <img src={venue.url} alt={venue.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-center truncate">
                                                    {venue.name}
                                                </div>
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
