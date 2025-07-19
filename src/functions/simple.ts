import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Simple {
  private width: number;
  private height: number;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  constructor() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xf3f3f3, 1.0);
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 1, 1000);
    this.camera.position.set(0, 5, 8);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.controls.keyPanSpeed = 0.0;
    this.controls.maxDistance = 5000.0;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.autoRotateSpeed = 1.0;

    const light = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(light);

    const grid = new THREE.GridHelper(10, 5);
    this.scene.add(grid);

    {
      const arrowGeometry = new THREE.ConeGeometry(0.03, 0.1, 30);
      arrowGeometry.rotateX(Math.PI / 2);
      const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrowMesh.scale.setScalar(8);
      arrowMesh.position.set(0, 0, 0);
      arrowMesh.lookAt(new THREE.Vector3(-1, 0, 0));
      // this.scene.add(arrowMesh);
    }
    {
      const arrowGeometry = new THREE.CylinderGeometry(0, 10, 100, 12);
      arrowGeometry.rotateX(Math.PI / 2);
      // arrowGeometry.rotateZ(Math.PI / 2);
      const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrowMesh.scale.setScalar(0.01);
      arrowMesh.position.set(0, 0, 0);
      arrowMesh.lookAt(new THREE.Vector3(0, 1, 0));
      // this.scene.add(arrowMesh);
    }
    {
      const lineGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array([-1, 0, 0, 1, 0, 0]);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.scene.add(line);
    }
    {
      const extendLineGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array([-1, 0, 0, 1, 0, 0]);
      extendLineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
      const line = new THREE.Line(extendLineGeometry, lineMaterial);
      line.position.set(0, 0, 2);
      this.scene.add(line);

      const lineVertices = line.geometry.getAttribute('position').array;
      const lineVectorList: THREE.Vector3[] = [];
      for (let i = 0; i < lineVertices.length; i += 3) {
        lineVectorList.push(
          new THREE.Vector3(lineVertices[i], lineVertices[i + 1], lineVertices[i + 2]),
        );
      }
      const lineLength = lineVectorList[0].distanceTo(lineVectorList[1]);
      const lineCenter = lineVectorList[0].clone().add(lineVectorList[1]).multiplyScalar(0.5);
      // 長さが2の場合、multiplyScalar(2)でデフォルトサイズ
      // length - offsetで短い長さが求められそう
      const offset = 0.2;
      const scalar = lineLength - offset;
      {
        // 始点に縮小した値にする
        const shortenLineStart = lineVectorList[0]
          .clone()
          .sub(lineVectorList[1])
          .normalize()
          .multiplyScalar(scalar)
          .add(lineVectorList[1]);
        line.geometry.attributes.position.setXYZ(
          0,
          shortenLineStart.x,
          shortenLineStart.y,
          shortenLineStart.z,
        );

        const arrowGeometry = new THREE.ConeGeometry(0.03, 0.1, 30);
        arrowGeometry.rotateX(Math.PI / 2);
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrowMesh.position.copy(lineCenter);
        arrowMesh.lookAt(shortenLineStart);
        arrowMesh.position.copy(shortenLineStart);
        line.add(arrowMesh);
      }

      // 終点に縮小した値にする
      {
        const shortenLineEnd = lineVectorList[1]
          .clone()
          .sub(lineVectorList[0])
          .normalize()
          .multiplyScalar(scalar)
          .add(lineVectorList[0]);
        line.geometry.attributes.position.setXYZ(
          1,
          shortenLineEnd.x,
          shortenLineEnd.y,
          shortenLineEnd.z,
        );

        const arrowGeometry = new THREE.ConeGeometry(0.03, 0.1, 30);
        arrowGeometry.rotateX(Math.PI / 2);
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrowMesh.position.copy(lineCenter);
        arrowMesh.lookAt(shortenLineEnd);
        arrowMesh.position.copy(shortenLineEnd);
        line.add(arrowMesh);
      }
    }

    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();

    requestAnimationFrame(() => this.render());
  }
}
