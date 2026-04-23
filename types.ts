/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Product {
  id: number;
  name: string;
  imageUrl: string;
}

export type DepthLayer = 'foreground' | 'midground' | 'background';
