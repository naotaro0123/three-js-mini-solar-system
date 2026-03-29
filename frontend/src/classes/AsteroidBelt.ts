import * as THREE from 'three';

const ASTEROID_COUNT = 5000;
const ROCK_TYPES = 5;
const MIN_ORBIT_RADIUS = 185;
const MAX_ORBIT_RADIUS = 275;
const VERTICAL_SPREAD = 30;

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const rng = this.seededRandom(seed + i);
      const j = Math.floor(rng * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 8 ? y : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number, z: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const zi = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);
    const p = this.permutation;
    const aaa = p[p[p[xi] + yi] + zi];
    const aba = p[p[p[xi] + yi + 1] + zi];
    const aab = p[p[p[xi] + yi] + zi + 1];
    const abb = p[p[p[xi] + yi + 1] + zi + 1];
    const baa = p[p[p[xi + 1] + yi] + zi];
    const bba = p[p[p[xi + 1] + yi + 1] + zi];
    const bab = p[p[p[xi + 1] + yi] + zi + 1];
    const bbb = p[p[p[xi + 1] + yi + 1] + zi + 1];
    const g000 = this.grad(aaa, xf, yf, zf);
    const g100 = this.grad(baa, xf - 1, yf, zf);
    const g010 = this.grad(aba, xf, yf - 1, zf);
    const g110 = this.grad(bba, xf - 1, yf - 1, zf);
    const g001 = this.grad(aab, xf, yf, zf - 1);
    const g101 = this.grad(bab, xf - 1, yf, zf - 1);
    const g011 = this.grad(abb, xf, yf - 1, zf - 1);
    const g111 = this.grad(bbb, xf - 1, yf - 1, zf - 1);
    const l00 = this.lerp(u, g000, g100);
    const l10 = this.lerp(u, g010, g110);
    const l0 = this.lerp(v, l00, l10);
    const l01 = this.lerp(u, g001, g101);
    const l11 = this.lerp(u, g011, g111);
    const l1 = this.lerp(v, l01, l11);
    return this.lerp(w, l0, l1);
  }

  fbm(x: number, y: number, z: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise(x * frequency, y * frequency, z * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / maxValue;
  }
}

function createRandomRockGeometry(seed: number): THREE.BufferGeometry {
  const baseGeometry = new THREE.IcosahedronGeometry(1, 4);
  const positionAttribute = baseGeometry.getAttribute('position');
  const positions = positionAttribute.array as Float32Array;
  const perlin = new PerlinNoise(seed);

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const length = Math.sqrt(x * x + y * y + z * z);
    const nx = x / length;
    const ny = y / length;
    const nz = z / length;
    const noiseValue = perlin.fbm(x * 2, y * 2, z * 2, 3);
    const offset = noiseValue * 0.3;
    positions[i] = x + nx * offset;
    positions[i + 1] = y + ny * offset;
    positions[i + 2] = z + nz * offset;
  }

  positionAttribute.needsUpdate = true;
  baseGeometry.computeVertexNormals();
  return baseGeometry;
}

export class AsteroidBelt {
  private group: THREE.Group;
  private instancedMeshes: THREE.InstancedMesh[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'AsteroidBelt';
    this.initAsteroidBelt();
  }

  private initAsteroidBelt(): void {
    const rockGeometries: THREE.BufferGeometry[] = [];
    for (let i = 0; i < ROCK_TYPES; i++) {
      rockGeometries.push(createRandomRockGeometry(i * 12345));
    }

    const asteroidsPerType = Math.floor(ASTEROID_COUNT / ROCK_TYPES);

    rockGeometries.forEach((geometry, typeIndex) => {
      const material = this.createRockMaterial(typeIndex);
      const instancedMesh = new THREE.InstancedMesh(geometry, material, asteroidsPerType);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;

      const matrix = new THREE.Matrix4();
      for (let i = 0; i < asteroidsPerType; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = MIN_ORBIT_RADIUS + Math.random() * (MAX_ORBIT_RADIUS - MIN_ORBIT_RADIUS);
        const height = (Math.random() - 0.5) * VERTICAL_SPREAD;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = height;

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(
          new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
          ),
        );

        const scale = 0.3 + Math.random() * 0.7;
        const scaleX = scale * (0.8 + Math.random() * 0.4);
        const scaleY = scale * (0.8 + Math.random() * 0.4);
        const scaleZ = scale * (0.8 + Math.random() * 0.4);

        matrix.compose(
          new THREE.Vector3(x, y, z),
          quaternion,
          new THREE.Vector3(scaleX, scaleY, scaleZ),
        );
        instancedMesh.setMatrixAt(i, matrix);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      this.instancedMeshes.push(instancedMesh);
      this.group.add(instancedMesh);
    });
  }

  private createRockMaterial(typeIndex: number): THREE.MeshStandardMaterial {
    const colors = [0x8b7355, 0x696969, 0x808080, 0x6b5d54, 0x4a4a4a];
    const material = new THREE.MeshStandardMaterial({
      color: colors[typeIndex % colors.length],
      metalness: 0.3 + Math.random() * 0.2,
      roughness: 0.7 + Math.random() * 0.2,
      emissive: 0x000000,
      emissiveIntensity: 0,
      wireframe: false,
    });
    return material;
  }

  public animate(deltaTime: number = 0.016): void {
    this.instancedMeshes.forEach((mesh) => {
      // ベルト面を水平のまま保つ
      mesh.rotation.x = 0;
      mesh.rotation.z = 0;
      mesh.rotation.y += deltaTime * 0.015;
    });
  }

  public getGroup(): THREE.Group {
    return this.group;
  }
}
