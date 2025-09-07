import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 1ヶ月ごとの地球の位置データ (AU単位)
const dataList: { x: number; y: number; z: number }[] = [
  { x: -2.673066229892559e7, y: 1.446585671920011e8, z: -7.643589382000268e3 },
  { x: -9.868437168826628e7, y: 1.095041885483843e8, z: -5.547663238540292e3 },
  { x: -1.395523282499756e8, y: 4.996333903915221e7, z: -2.019848448123783e3 },
  { x: -1.466517885910457e8, y: -2.894930462633439e7, z: 2.241918603369966e3 },
  { x: -1.145577272135454e8, y: -9.794553507222724e7, z: 6.056259210675955e3 },
  { x: -5.083222443804654e7, y: -1.429165239292724e8, z: 8.525004076011479e3 },
  { x: 2.400825742134599e7, y: -1.501779616186016e8, z: 8.787137377016246e3 },
  { x: 9.487022255787645e7, y: -1.18549402123514e8, z: 6.844814914941788e3 },
  { x: 1.404523085048895e8, y: -5.539645061197723e7, z: 2.98721993759647e3 },
  { x: 1.484277473129742e8, y: 2.013015070780902e7, z: -1.621436063981615e3 },
  { x: 1.16267436012639e8, y: 9.236734066427481e7, z: -6.056292050734162e3 },
  { x: 5.363216352801231e7, y: 1.374296469376432e8, z: -8.676566772088408e3 },
  { x: -2.607213844816194e7, y: 1.447746738210197e8, z: -8.892861905746162e3 },
];
// 最大絶対値を計算
const maxAbsX = Math.max(...dataList.map((p) => Math.abs(p.x)));
const maxAbsY = Math.max(...dataList.map((p) => Math.abs(p.y)));
const maxAbsZ = Math.max(...dataList.map((p) => Math.abs(p.z)));

// 新しい座標範囲を設定
const newRangeX = 90;
const newRangeY = 0; // Y座標は0に固定
const newRangeZ = 90;

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

    // {
    //   const arrowGeometry = new THREE.ConeGeometry(0.03, 0.1, 30);
    //   arrowGeometry.rotateX(Math.PI / 2);
    //   const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    //   const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
    //   arrowMesh.scale.setScalar(8);
    //   arrowMesh.position.set(0, 0, 0);
    //   arrowMesh.lookAt(new THREE.Vector3(-1, 0, 0));
    //   // this.scene.add(arrowMesh);
    // }
    // {
    //   const arrowGeometry = new THREE.CylinderGeometry(0, 10, 100, 12);
    //   arrowGeometry.rotateX(Math.PI / 2);
    //   // arrowGeometry.rotateZ(Math.PI / 2);
    //   const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    //   const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
    //   arrowMesh.scale.setScalar(0.01);
    //   arrowMesh.position.set(0, 0, 0);
    //   arrowMesh.lookAt(new THREE.Vector3(0, 1, 0));
    //   // this.scene.add(arrowMesh);
    // }
    {
      const lineGeometry = new THREE.BufferGeometry();
      const transformedData = dataList.map((point) => {
        return {
          // X軸は-90から90の範囲に変換
          x: (point.x / maxAbsX) * newRangeX,
          // Y軸は0に固定
          y: newRangeY,
          // Z軸は-90から90の範囲に変換
          z: (point.z / maxAbsZ) * newRangeZ,
        };
      });
      // const positions = new Float32Array([-1, 0, 0, 1, 0, 0]);
      const positions = new Float32Array([
        ...transformedData.flatMap((d) => [d.x, d.y, d.z]),
        transformedData[0].x,
        transformedData[0].y,
        transformedData[0].z,
      ]);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.scene.add(line);
    }
    // {
    //   const extendLineGeometry = new THREE.BufferGeometry();
    //   const positions = new Float32Array([-1, 0, 0, 1, 0, 0]);
    //   extendLineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    //   const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    //   const line = new THREE.Line(extendLineGeometry, lineMaterial);
    //   line.position.set(0, 0, 2);
    //   this.scene.add(line);

    //   const lineVertices = line.geometry.getAttribute('position').array;
    //   const lineVectorList: THREE.Vector3[] = [];
    //   for (let i = 0; i < lineVertices.length; i += 3) {
    //     lineVectorList.push(
    //       new THREE.Vector3(lineVertices[i], lineVertices[i + 1], lineVertices[i + 2]),
    //     );
    //   }
    //   const lineLength = lineVectorList[0].distanceTo(lineVectorList[1]);
    //   const lineCenter = lineVectorList[0].clone().add(lineVectorList[1]).multiplyScalar(0.5);
    //   // 長さが2の場合、multiplyScalar(2)でデフォルトサイズ
    //   // length - offsetで短い長さが求められそう
    //   const offset = 0.2;
    //   const scalar = lineLength - offset;
    //   {
    //     // 始点に縮小した値にする
    //     const shortenLineStart = lineVectorList[0]
    //       .clone()
    //       .sub(lineVectorList[1])
    //       .normalize()
    //       .multiplyScalar(scalar)
    //       .add(lineVectorList[1]);
    //     line.geometry.attributes.position.setXYZ(
    //       0,
    //       shortenLineStart.x,
    //       shortenLineStart.y,
    //       shortenLineStart.z,
    //     );

    //     const arrowGeometry = new THREE.ConeGeometry(0.03, 0.1, 30);
    //     arrowGeometry.rotateX(Math.PI / 2);
    //     const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    //     const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
    //     arrowMesh.position.copy(lineCenter);
    //     arrowMesh.lookAt(shortenLineStart);
    //     arrowMesh.position.copy(shortenLineStart);
    //     line.add(arrowMesh);
    //   }

    //   // 終点に縮小した値にする
    //   {
    //     const shortenLineEnd = lineVectorList[1]
    //       .clone()
    //       .sub(lineVectorList[0])
    //       .normalize()
    //       .multiplyScalar(scalar)
    //       .add(lineVectorList[0]);
    //     line.geometry.attributes.position.setXYZ(
    //       1,
    //       shortenLineEnd.x,
    //       shortenLineEnd.y,
    //       shortenLineEnd.z,
    //     );

    //     const arrowGeometry = new THREE.ConeGeometry(0.03, 0.1, 30);
    //     arrowGeometry.rotateX(Math.PI / 2);
    //     const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    //     const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
    //     arrowMesh.position.copy(lineCenter);
    //     arrowMesh.lookAt(shortenLineEnd);
    //     arrowMesh.position.copy(shortenLineEnd);
    //     line.add(arrowMesh);
    //   }
    // }

    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();

    requestAnimationFrame(() => this.render());
  }
}
