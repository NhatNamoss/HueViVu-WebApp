import * as THREE from 'three';
import { GLTFLoader } from './assets/vendor/three/loaders/GLTFLoader.js';
import { OrbitControls } from './assets/vendor/three/controls/OrbitControls.js';
import { MeshoptDecoder } from './assets/vendor/three/libs/meshopt_decoder.module.js';

export async function mountHeritage(host, onStatus) {
  let renderer;
  let controls;
  let resizeObserver;
  let scene;
  const textures = new Set();
  const dispose = () => {
    resizeObserver?.disconnect();
    controls?.dispose();
    scene?.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        material.dispose();
      }
    });
    textures.forEach(texture => { texture.dispose(); texture.source.data?.close?.(); });
    renderer?.dispose();
    renderer?.domElement.remove();
  };
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.setClearColor('#e1d5dc');
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff8ef, 0x746574, 2));
    const sunlight = new THREE.DirectionalLight(0xffeddb, 2.8);
    sunlight.position.set(12, 20, 17);
    scene.add(sunlight);
    const camera = new THREE.PerspectiveCamera(40, 1, .05, 200);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * .47;
    controls.minPolarAngle = .15;
    controls.zoomSpeed = .6;
    controls.rotateSpeed = .65;
    onStatus('Đang tải mô hình Ngọ Môn…');
    const modelUrl = new URL('./assets/models/ngo-mon-preview.glb', import.meta.url);
    const response = await fetch(modelUrl, { signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error('Model unavailable');
    const buffer = await response.arrayBuffer();
    onStatus('Đang chuẩn bị hình khối và chất liệu…');
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.parseAsync(buffer, new URL('.', modelUrl).href);
    const model = gltf.scene;
    const originalBox = new THREE.Box3().setFromObject(model);
    const originalSize = originalBox.getSize(new THREE.Vector3());
    model.scale.multiplyScalar(14 / Math.max(originalSize.x, originalSize.y, originalSize.z));
    const box = new THREE.Box3().setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    scene.add(model);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const radius = size.length() / 2;
    const render = () => { if (renderer.domElement.isConnected) renderer.render(scene, camera); };
    const initialDirection = new THREE.Vector3(1, .65, 1.3).normalize();
    const reset = () => {
      const limitingFov = Math.min(THREE.MathUtils.degToRad(camera.fov), 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
      const distance = radius / Math.sin(limitingFov / 2) * (camera.aspect < 1 ? 1.04 : .8);
      controls.target.set(0, 0, 0);
      camera.position.copy(initialDirection.clone().multiplyScalar(distance));
      controls.minDistance = radius * .9;
      controls.maxDistance = distance * 2;
      controls.update();
      render();
    };
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      reset();
    };
    const action = type => {
      if (type === 'reset') { reset(); return; }
      const relative = camera.position.clone().sub(controls.target);
      relative.applyAxisAngle(new THREE.Vector3(0, 1, 0), type === 'left' ? -.35 : .35);
      camera.position.copy(relative.add(controls.target));
      controls.update();
      render();
    };
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Mô hình Ngọ Môn 3D. Dùng phím trái, phải để xoay và Home để đặt lại góc nhìn.');
    renderer.domElement.tabIndex = 0;
    renderer.domElement.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
      event.preventDefault();
      action(event.key === 'Home' ? 'reset' : event.key === 'ArrowLeft' ? 'left' : 'right');
    });
    host.append(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      onStatus('Trình duyệt đã tạm dừng cảnh 3D. Chọn thử tải lại để mở lại mô hình.', true);
    });
    controls.addEventListener('change', render);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    return { action, resize, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
