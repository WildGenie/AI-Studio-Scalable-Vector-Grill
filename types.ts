/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export interface MenuItem {
  name: string;
  price: number;
}

export interface OrderItem extends MenuItem {
  id: string;
  ingredients?: string[];
}

export interface FlyingIngredient {
  id: string;
  svg: string;
  top: string; // CSS percentage for vertical position
}

export type SceneState = 'order' | 'pickup';

export const MENU: MenuItem[] = [
    { name: "BEZIER BURGER", price: 8.50 },
    { name: "VECTOR FRIES", price: 3.50 },
    { name: "PIXEL SHAKE", price: 5.25 },
    { name: "RASTER RINGS", price: 4.50 },
    { name: "ALPHA SODA", price: 2.99 },
    { name: "PATH NUGGETS", price: 6.00 },
    { name: "GRADIENT WRAP", price: 7.50 },
    { name: "CLIP MASK PIE", price: 4.25 }
];