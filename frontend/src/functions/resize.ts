import * as THREE from 'three';

export const handleResize = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // レンダラーの更新
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};
