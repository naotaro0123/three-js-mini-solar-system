import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const loadGlTFModel = (modelPath: string): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        reject(error);
      },
    );
  });
};
