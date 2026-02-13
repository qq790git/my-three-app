import * as THREE from 'three';
import GUI from 'lil-gui';

/**
 * 自定义 BoxGeometry 实现，类似 THREE.BoxGeometry
 * 参考: https://threejs.org/docs/#api/en/geometries/BoxGeometry
 */
class BoxGeometry extends THREE.BufferGeometry {
    constructor(width = 1, height = 1, depth = 1, widthSegments = 1, heightSegments = 1, depthSegments = 1) {
        super();

        this.type = 'BoxGeometry';
        this.parameters = { width, height, depth, widthSegments, heightSegments, depthSegments };

        widthSegments = Math.floor(widthSegments);
        heightSegments = Math.floor(heightSegments);
        depthSegments = Math.floor(depthSegments);

        const indices = [];
        const vertices = [];
        const normals = [];
        const uvs = [];

        let numberOfVertices = 0;

        // 构建每个面: 方向(u,v,w), 尺寸, 分段数, 法线方向
        const buildPlane = (u, v, w, udir, vdir, width, height, depth, gridX, gridY) => {
            const segmentWidth = width / gridX;
            const segmentHeight = height / gridY;
            const widthHalf = width / 2;
            const heightHalf = height / 2;
            const depthHalf = depth / 2;
            const gridX1 = gridX + 1;
            const gridY1 = gridY + 1;

            const vector = [0, 0, 0]; // [x, y, z]

            for (let iy = 0; iy < gridY1; iy++) {
                const y = iy * segmentHeight - heightHalf;
                for (let ix = 0; ix < gridX1; ix++) {
                    const x = ix * segmentWidth - widthHalf;

                    // 顶点位置
                    vector[u] = x * udir;
                    vector[v] = y * vdir;
                    vector[w] = depthHalf;
                    vertices.push(vector[0], vector[1], vector[2]);

                    // 法线
                    vector[u] = 0;
                    vector[v] = 0;
                    vector[w] = depth > 0 ? 1 : -1;
                    normals.push(vector[0], vector[1], vector[2]);

                    // UV
                    uvs.push(ix / gridX, 1 - iy / gridY);
                }
            }

            // 索引
            for (let iy = 0; iy < gridY; iy++) {
                for (let ix = 0; ix < gridX; ix++) {
                    const a = numberOfVertices + ix + gridX1 * iy;
                    const b = numberOfVertices + ix + gridX1 * (iy + 1);
                    const c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1);
                    const d = numberOfVertices + (ix + 1) + gridX1 * iy;

                    indices.push(a, b, d);
                    indices.push(b, c, d);
                }
            }

            numberOfVertices += gridX1 * gridY1;
        };

        // u=x轴索引, v=y轴索引, w=z轴索引
        // 6个面: +z, -z, +y, -y, +x, -x
        buildPlane(2, 1, 0, -1, -1, depth, height,  width,  depthSegments,  heightSegments); // +x
        buildPlane(2, 1, 0,  1, -1, depth, height, -width,  depthSegments,  heightSegments); // -x
        buildPlane(0, 2, 1,  1,  1, width, depth,   height, widthSegments,  depthSegments);  // +y
        buildPlane(0, 2, 1,  1, -1, width, depth,  -height, widthSegments,  depthSegments);  // -y
        buildPlane(0, 1, 2,  1, -1, width, height,  depth,  widthSegments,  heightSegments); // +z
        buildPlane(0, 1, 2, -1, -1, width, height, -depth,  widthSegments,  heightSegments); // -z

        this.setIndex(indices);
        this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }

    copy(source) {
        super.copy(source);
        this.parameters = Object.assign({}, source.parameters);
        return this;
    }

    static fromJSON(data) {
        return new BoxGeometry(data.width, data.height, data.depth, data.widthSegments, data.heightSegments, data.depthSegments);
    }
}

// ===== 交互式演示 (类似 Three.js 官方文档) =====

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 3, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 4, 3);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// 使用自定义 BoxGeometry
const mat = new THREE.MeshPhongMaterial({ color: 0x44aa88 });
const wireframeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });

let mesh, wireframe;

// GUI 参数
const params = {
    width: 1,
    height: 1,
    depth: 1,
    widthSegments: 1,
    heightSegments: 1,
    depthSegments: 1,
};

function rebuildGeometry() {
    if (mesh) {
        mesh.geometry.dispose();
        scene.remove(mesh);
    }
    if (wireframe) {
        wireframe.geometry.dispose();
        scene.remove(wireframe);
    }

    const geo = new BoxGeometry(
        params.width, params.height, params.depth,
        params.widthSegments, params.heightSegments, params.depthSegments
    );

    mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geo), wireframeMat);
    scene.add(wireframe);
}

rebuildGeometry();

// lil-gui 控制面板
const gui = new GUI();
gui.add(params, 'width', 1, 30, 0.1).onChange(rebuildGeometry);
gui.add(params, 'height', 1, 30, 0.1).onChange(rebuildGeometry);
gui.add(params, 'depth', 1, 30, 0.1).onChange(rebuildGeometry);
gui.add(params, 'widthSegments', 1, 10, 1).onChange(rebuildGeometry);
gui.add(params, 'heightSegments', 1, 10, 1).onChange(rebuildGeometry);
gui.add(params, 'depthSegments', 1, 10, 1).onChange(rebuildGeometry);

function animate() {
    requestAnimationFrame(animate);
    if (mesh && wireframe) {
        mesh.rotation.x += 0.005;
        mesh.rotation.y += 0.01;
        wireframe.rotation.copy(mesh.rotation);
    }
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

export { BoxGeometry };
