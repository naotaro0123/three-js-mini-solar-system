import type * as THREE from 'three';

/** animate() 関数群に渡す共有タイミング状態 */
export interface AnimateContext {
  dayIndex: number;
  dayFraction: number;
  frameCount: number;
  /** 毎フレームアロケーション回避用の共有 Vector3 バッファ */
  buf: THREE.Vector3;
}

/** DrawScene._cachedMeshes の型 */
export type CachedMeshes = {
  // 地球
  earthPlanetSystem: THREE.Group;
  earthPlanet: THREE.Mesh;
  earthAtmosphere: THREE.Mesh;
  moon: THREE.Mesh;
  // 水星
  mercuryPlanetSystem: THREE.Group;
  mercuryPlanet: THREE.Mesh;
  // 金星
  venusPlanetSystem: THREE.Group;
  venusPlanet: THREE.Mesh;
  venusAtmosphere: THREE.Mesh;
  // 火星
  marsPlanetSystem: THREE.Group;
  marsPlanet: THREE.Mesh;
  phobos: THREE.Mesh;
  deimos: THREE.Mesh;
  // 木星
  jupiterPlanetSystem: THREE.Group;
  jupiterPlanet: THREE.Mesh;
  io: THREE.Mesh;
  europa: THREE.Mesh;
  ganymede: THREE.Mesh;
  callisto: THREE.Mesh;
  // 土星
  saturnPlanetSystem: THREE.Group;
  saturnPlanet: THREE.Mesh;
  titan: THREE.Mesh;
  rhea: THREE.Mesh;
  iapetus: THREE.Mesh;
  mimas: THREE.Mesh;
  enceladus: THREE.Mesh;
  // 天王星
  uranusPlanetSystem: THREE.Group;
  uranusPlanet: THREE.Mesh;
  miranda: THREE.Mesh;
  ariel: THREE.Mesh;
  umbriel: THREE.Mesh;
  titania: THREE.Mesh;
  oberon: THREE.Mesh;
  // 海王星
  neptunePlanetSystem: THREE.Group;
  neptunePlanet: THREE.Mesh;
  triton: THREE.Mesh;
  proteus: THREE.Mesh;
  nereid: THREE.Mesh;
};
