import * as THREE from 'three';

// 场景、相机
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 5;

// WebGL 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

// 画线功能 - 参考 https://threejs.org/manual/#en/drawing-lines
const points = [
  new THREE.Vector3(-2, 0, 0),
  new THREE.Vector3(0, 2, 0),
  new THREE.Vector3(2, 0, 0)
];
const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
const line = new THREE.Line(lineGeometry, lineMaterial);
scene.add(line);

// 渲染
renderer.render(scene, camera);

// 响应窗口变化
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.render(scene, camera);
});
