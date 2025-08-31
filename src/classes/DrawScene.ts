import * as THREE from 'three';
import {
  EffectComposer,
  OutlinePass,
  RenderPass,
  UnrealBloomPass,
} from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { createEarthMesh } from '../functions/earth';
import {
  earthMoon,
  PLANET_ATMO_SPHERE_NAME,
  PLANET_MOONS_NAME,
  PLANET_NAME,
} from '../functions/planet-common';
import { settings } from '../functions/settings';
import { createSunMesh } from '../functions/sun';

export class DrawScene {
  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  controls!: OrbitControls;
  composer!: EffectComposer;
  sunMesh!: THREE.Mesh;
  earthGroup!: THREE.Group;
  isAnimating = settings.isAnimating;

  constructor() {
    this.initEnvironment();
    // 太陽のメッシュを作成
    this.sunMesh = createSunMesh();
    this.scene.add(this.sunMesh);
    // 地球と月のメッシュを作成
    this.earthGroup = createEarthMesh(this.sunMesh.position);
    this.scene.add(this.earthGroup);

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
        (this.sunMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = value;
      });
      // アニメーションを再生/定時する
      gui
        .add(settings, 'isAnimating')
        .name('アニメーション再生')
        .onChange((value) => {
          this.isAnimating = value;
        });
      gui.add(settings, 'getCurrentPosition').name('現在の地球の位置を取得');
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
    if (this.isAnimating) {
      this.animate();
    }
  }

  animate(): void {
    this.sunMesh.rotateY(0.001 * settings.acceleration);

    {
      // planet3dがearth。コードコピーする時間違えないように
      const planet = this.earthGroup.getObjectByName(PLANET_NAME) as THREE.Mesh;
      const atmosphere = this.earthGroup.getObjectByName(PLANET_ATMO_SPHERE_NAME) as THREE.Mesh;
      const moon = this.earthGroup.getObjectByName(`${PLANET_MOONS_NAME}_0`) as THREE.Mesh;

      this.earthGroup.rotateY(0.001 * settings.accelerationOrbit);
      planet.rotateY(0.005 * settings.acceleration);
      atmosphere.rotateY(0.001 * settings.acceleration);
      const time = performance.now();
      const tiltAngle = (5 * Math.PI) / 180;

      const { orbitRadius, orbitSpeed } = earthMoon[0];
      const moonX = planet.position.x + orbitRadius * Math.cos(time * orbitSpeed);
      const moonY = orbitRadius * Math.sin(time * orbitSpeed) * Math.sin(tiltAngle);
      const moonZ =
        planet.position.z + orbitRadius * Math.sin(time * orbitSpeed) * Math.cos(tiltAngle);

      moon.position.set(moonX, moonY, moonZ);
      moon.rotateY(0.01);

      // ワールドマトリックスを更新
      this.earthGroup.updateWorldMatrix(true, false);
      // earthのワールド座標を取得
      const earthWorldPosition = new THREE.Vector3();
      planet.getWorldPosition(earthWorldPosition);
      // MEMO: earthGroupはposition(0, 0, 0)でplanetはxが90ずれてる。earthGroupを回転させることで公転させてる
      console.log('# earth position:', earthWorldPosition);
    }
  }
}
