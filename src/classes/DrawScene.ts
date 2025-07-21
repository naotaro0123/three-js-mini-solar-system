import * as THREE from 'three';
import {
  EffectComposer,
  OutlinePass,
  RenderPass,
  UnrealBloomPass,
} from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

const SUN_MESH_NAME = 'SUN';

const loadTexture = new THREE.TextureLoader();
const settings = {
  accelerationOrbit: 1, // 公転スピード
  acceleration: 1, // 自転スピード
  sunIntensity: 1.9, // 太陽の明るさ
};
// Earth
type EarthMoon = {
  size: number;
  texture: string;
  bump: string;
  orbitSpeed: number;
  orbitRadius: number;
  mesh?: THREE.Mesh;
};
const earthMoon: EarthMoon[] = [
  {
    size: 1.6,
    texture: '/images/moonmap.jpg',
    bump: '/images/moonbump.jpg',
    orbitSpeed: 0.001 * settings.accelerationOrbit,
    orbitRadius: 10,
  },
];

const sunMat = new THREE.MeshStandardMaterial({
  emissive: 0xfff88f,
  emissiveMap: loadTexture.load('./images/sun.jpg'),
  emissiveIntensity: settings.sunIntensity,
});
const createSunMesh = (scene: THREE.Scene): void => {
  const sunSize = 697 / 40; // 40 times smaller scale than earth
  const sunGeom = new THREE.SphereGeometry(sunSize, 32, 20);
  const sun = new THREE.Mesh(sunGeom, sunMat);
  sun.name = SUN_MESH_NAME;
  scene.add(sun);

  //point light in the sun
  const pointLight = new THREE.PointLight(0xfdffd3, 1200, 400, 1.4);
  scene.add(pointLight);
};

type Ring = {
  innerRadius: number;
  outerRadius: number;
  texture: string;
};
const createPlanet = (
  platenetName: string,
  size: number,
  position: number,
  tilt: number,
  texture: THREE.Material | string,
  bump: string | null,
  ring: Ring | null,
  atmosphere: string | null,
  moons: EarthMoon[],
): THREE.Group => {
  let material: THREE.Material | THREE.Texture;
  if (texture instanceof THREE.Material) {
    material = texture;
  } else if (bump) {
    material = new THREE.MeshPhongMaterial({
      map: loadTexture.load(texture),
      bumpMap: loadTexture.load(bump),
      bumpScale: 0.7,
    });
  } else {
    material = new THREE.MeshPhongMaterial({
      map: loadTexture.load(texture),
    });
  }

  const geometry = new THREE.SphereGeometry(size, 32, 20);
  const planet = new THREE.Mesh(geometry, material);
  planet.position.x = position;
  planet.position.z = (tilt * Math.PI) / 180;
  const planetSystem = new THREE.Group();
  planetSystem.add(planet);

  const orbitPath = new THREE.EllipseCurve(
    0,
    0, // ax, aY
    position,
    position, // xRadius, yRadius
    0,
    2 * Math.PI, // aStartAngle, aEndAngle
    false, // aClockwise
    0, // aRotation
  );
  const pathPoints = orbitPath.getPoints(100);
  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.03,
  });
  const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
  orbit.rotation.x = Math.PI / 2;
  planetSystem.add(orbit);

  if (ring) {
    const ringGeometry = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius, 30);
    const ringMaterial = new THREE.MeshStandardMaterial({
      map: loadTexture.load(ring.texture),
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    planetSystem.add(ringMesh);
    ringMesh.position.x = position;
    ringMesh.position.x = 0.5 * Math.PI;
    ringMesh.rotation.y = (-tilt * Math.PI) / 180;
  }

  if (atmosphere) {
    const atmosphereGeometry = new THREE.SphereGeometry(size + 0.1, 32, 20);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      map: loadTexture.load(atmosphere),
      transparent: true,
      opacity: 0.4,
      depthTest: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphereMesh.rotation.z = 0.41;
    planet.add(atmosphereMesh);
  }

  for (const moon of moons) {
    let moonMaterial: THREE.MeshStandardMaterial;

    if (moon.bump) {
      moonMaterial = new THREE.MeshStandardMaterial({
        map: loadTexture.load(moon.texture),
        bumpMap: loadTexture.load(moon.bump),
        bumpScale: 0.5,
      });
    } else {
      moonMaterial = new THREE.MeshStandardMaterial({
        map: loadTexture.load(moon.texture),
      });
    }
    const moonGeometry = new THREE.SphereGeometry(moon.size, 32, 20);
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    const moonOrbitDistance = size * 1.5;
    moonMesh.position.set(moonOrbitDistance, 0, 0);
    planetSystem.add(moonMesh);
    moon.mesh = moonMesh;
  }

  const planet3d = new THREE.Group();
  planet3d.add(planetSystem);
  planet3d.name = platenetName;
  return planet3d;
};

const createEarthMesh = (scene: THREE.Scene): void => {
  const sun = scene.getObjectByName(SUN_MESH_NAME) as THREE.Mesh;
  // Earth day/night effect shader material
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: loadTexture.load('/images/earth_daymap.jpg') },
      nightTexture: { value: loadTexture.load('/images/earth_nightmap.jpg') },
      sunPosition: { value: sun.position },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vSunDirection;

      uniform vec3 sunPosition;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
        vSunDirection = normalize(sunPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D dayTexture;
      uniform sampler2D nightTexture;

      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vSunDirection;

      void main() {
        float intensity = max(dot(vNormal, vSunDirection), 0.0);
        vec4 dayColor = texture2D(dayTexture, vUv);
        vec4 nightColor = texture2D(nightTexture, vUv)* 0.2;
        gl_FragColor = mix(nightColor, dayColor, intensity);
      }
    `,
  });
  const earth = createPlanet(
    'Earth',
    6.4,
    90,
    23,
    earthMaterial,
    null,
    null,
    '/images/earth_atmosphere.jpg',
    earthMoon,
  );
  scene.add(earth);
};

export class DrawScene {
  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  controls!: OrbitControls;
  composer!: EffectComposer;

  constructor() {
    this.initEnvironment();
    createSunMesh(this.scene);
    createEarthMesh(this.scene);

    window.addEventListener('resize', this.resizeCanvas);
    this.render();
  }

  get width(): number {
    return window.innerWidth;
  }

  get height(): number {
    return window.innerHeight;
  }

  initEnvironment(): void {
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x00000, 1.0);
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 1, 1000);
    this.camera.position.set(0, 5, 50);

    {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      // outline Pass
      const outLinePass = new OutlinePass(
        new THREE.Vector2(this.width, this.height),
        this.scene,
        this.camera,
      );
      outLinePass.edgeStrength = 3;
      outLinePass.edgeGlow = 1;
      outLinePass.visibleEdgeColor.set(0xffffff);
      outLinePass.hiddenEdgeColor.set(0x190a05);
      this.composer.addPass(outLinePass);
      // Bloom Pass
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.width, this.height),
        1,
        0.4,
        0.85,
      );
      bloomPass.threshold = 1;
      bloomPass.radius = 0.9;
      this.composer.addPass(bloomPass);
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    {
      const gui = new GUI();
      gui.domElement.style.top = '6px';
      gui.domElement.style.right = '6px';
      gui.add(settings, 'accelerationOrbit', 0, 10);
      gui.add(settings, 'acceleration', 0, 10);
      gui.add(settings, 'sunIntensity', 1, 10).onChange((value) => {
        sunMat.emissiveIntensity = value;
      });
    }

    const lightAmbient = new THREE.AmbientLight(0x222222, 6);
    this.scene.add(lightAmbient);
  }

  resizeCanvas = () => {
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
  };

  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
    this.composer.render();

    this.renderer.setAnimationLoop(() => this.render());
  }
}
