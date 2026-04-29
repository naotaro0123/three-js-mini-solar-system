import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const getAssetPath = (path: string): string => {
  if (/^(?:https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }

  return `${import.meta.env.BASE_URL}${path.replace(/^\.?\//, '')}`;
};

export const loadGlTFModel = (modelPath: string): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      getAssetPath(modelPath),
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
