import * as THREE from 'three'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#three-canvas') });

renderer.setSize(window.innerWidth, window.innerHeight);

// 添加一个极简的几何体
const geometry = new THREE.IcosahedronGeometry(1, 0);
const material = new THREE.MeshNormalMaterial();
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

camera.position.z = 3;

function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.x += 0.01;
    renderer.render(scene, camera);
}
animate();