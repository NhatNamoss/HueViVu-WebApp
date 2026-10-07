'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildWalkWorld, WalkingController } from '@/lib/3d/walker';

export type GameInput = { forward: number; right: number; reset: number; guide: number; autoWalk: boolean; overview: boolean; paused: boolean };
type Props = {
  input: React.RefObject<GameInput>; retry: number; visited: Set<number>;
  onReady: () => void; onError: (message: string) => void;
  onLoading: (percent: number, message: string) => void;
  onDetail: (percent: number, failed?: boolean) => void;
  onNearby: (index: number | null, distance: number, hint: string) => void;
  onSelect: (index: number) => void; onNotice: (message: string) => void;
  onAutoStop: () => void;
};

function disposeTree(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
  });
  for (const texture of textures) { texture.dispose(); const image = texture.source.data; if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close(); }
}

async function download(url: string, signal: AbortSignal, progress: (value: number) => void, timeoutMs = 60000, cache: RequestCache = 'force-cache') {
  const request = new AbortController();
  const cancel = () => request.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) cancel();
  const timer = setTimeout(cancel, timeoutMs);
  try {
  const response = await fetch(url, { signal: request.signal, cache });
  if (!response.ok) throw new Error('Chưa tải được cảnh tham quan.');
  const total = Number(response.headers.get('content-length'));
  if (!response.body) return response.arrayBuffer();
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let loaded = 0;
  while (true) {
    const part = await reader.read(); if (part.done) break;
    chunks.push(part.value); loaded += part.value.length;
    progress(total ? Math.min(99, Math.round(loaded / total * 100)) : 0);
  }
  const result = new Uint8Array(loaded); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  progress(100); return result.buffer;
  } finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); }
}

export default function NgoMonScene(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef(props); callbacks.current = props;

  useEffect(() => {
    if (!host.current) return;
    const element = host.current;
    const abort = new AbortController(); let frame = 0; let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
    catch { callbacks.current.onError('Thiết bị chưa mở được cảnh 3D. Hãy thử trình duyệt khác hoặc quay lại khám phá địa điểm.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', 'Không gian tham quan Ngọ Môn. Kéo để nhìn quanh; dùng W A S D hoặc phím mũi tên để đi.');
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#bcced6'); scene.fog = new THREE.Fog('#bcced6', 85, 170);
    scene.add(new THREE.HemisphereLight(0xe4edff, 0x998975, 2.1));
    const sun = new THREE.DirectionalLight(0xfff2d6, 2.7); sun.position.set(30, 55, 35); scene.add(sun);
    const camera = new THREE.PerspectiveCamera(65, 1, 0.08, 240); camera.rotation.order = 'YXZ';
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enabled = false; orbit.enablePan = false; orbit.enableDamping = true; orbit.minDistance = 12; orbit.maxDistance = 115; orbit.maxPolarAngle = Math.PI / 2 - 0.06;
    const resize = new ResizeObserver(() => { const { width, height } = element.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); if (ready && overview) fitOverview(); });
    resize.observe(element);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const raycaster = new THREE.Raycaster(); const markers: THREE.Mesh[] = [];
    const stops: THREE.Vector3[] = [];
    const routes: THREE.Vector3[][] = [];
    const guide = new THREE.Group();
    const guideOrb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), new THREE.MeshBasicMaterial({ color: '#68b7d3' })); guideOrb.position.y = 1.4; guideOrb.userData.guide = true;
    const guideRing = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.85, 24), new THREE.MeshBasicMaterial({ color: '#68b7d3', side: THREE.DoubleSide })); guideRing.rotation.x = -Math.PI / 2; guideRing.position.y = 0.03;
    guide.add(guideOrb, guideRing); guide.visible = false; scene.add(guide);
    let routeGoal = -1; let routeIndex = 0; let guiding = false;
    const keys = new Set<string>(); let pointer: { id: number; x: number; y: number; moved: boolean } | null = null;
    let player: WalkingController | null = null; const spawn = new THREE.Vector3(); let ready = false;
    let model: THREE.Group | null = null; let collisionRoot: THREE.Group | null = null;
    let previous = performance.now(); let notifyAt = 0; let hudAt = 0; let resetSeen = -1; let overview = false;
    const savedRotation = new THREE.Euler(0, 0, 0, 'YXZ'); let boundary = 80; let guideSeen = 0; let modelRadius = 35;
    const fitOverview = () => {
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const distance = modelRadius / Math.tan(Math.min(verticalFov, horizontalFov) / 2) * 1.08;
      orbit.target.set(0, 5, 0);
      camera.position.copy(new THREE.Vector3(1, 0.65, 1.3).normalize().multiplyScalar(distance).add(orbit.target));
      orbit.maxDistance = Math.max(115, distance * 1.7);
      if (scene.fog instanceof THREE.Fog) { scene.fog.near = distance * 1.15; scene.fog.far = distance * 2.4; }
    };

    const stopAuto = () => { if (callbacks.current.input.current.autoWalk) { callbacks.current.input.current.autoWalk = false; callbacks.current.onAutoStop(); } };
    const clearInput = () => { keys.clear(); pointer = null; callbacks.current.input.current.forward = 0; callbacks.current.input.current.right = 0; stopAuto(); };
    const onContextLost = (event: Event) => { event.preventDefault(); clearInput(); if (!abort.signal.aborted) callbacks.current.onError('Thiết bị vừa tạm dừng cảnh 3D. Bấm tải lại để tiếp tục; các điểm đã khám phá vẫn được giữ.'); };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!ready || callbacks.current.input.current.paused || callbacks.current.input.current.overview) return;
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) { stopAuto(); keys.add(event.code); event.preventDefault(); }
    };
    const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.code); };
    const onPointerDown = (event: PointerEvent) => {
      if (!ready || callbacks.current.input.current.paused || callbacks.current.input.current.overview || event.button !== 0) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      renderer.domElement.setPointerCapture(event.pointerId); renderer.domElement.focus({ preventScroll: true });
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId || callbacks.current.input.current.paused) return;
      const dx = event.clientX - pointer.x; const dy = event.clientY - pointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) pointer.moved = true;
      if (pointer.moved) { guiding = false; stopAuto(); }
      camera.rotation.y -= dx * 0.004; camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy * 0.004, -1.1, 1.1);
      pointer.x = event.clientX; pointer.y = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const click = !pointer.moved; pointer = null;
      if (!click || !player || callbacks.current.input.current.paused) return;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = raycaster.intersectObjects(guide.visible ? [...markers, guideOrb] : markers)[0];
      if (hit) {
        if (hit.object.userData.guide) { callbacks.current.onNotice('Vòng xanh dẫn lối vòng ngoài tường. Đi tới đó để chuyển sang chặng tiếp theo.'); return; }
        const index = hit.object.userData.stop as number;
        if (player.getEye().distanceTo(stops[index]) < 5) callbacks.current.onSelect(index);
        else callbacks.current.onNotice('Hãy đi gần vòng sáng để mở thuyết minh.');
      }
    };
    document.addEventListener('keydown', onKeyDown); document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInput); document.addEventListener('visibilitychange', clearInput);
    renderer.domElement.addEventListener('pointerdown', onPointerDown); renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp); renderer.domElement.addEventListener('pointercancel', clearInput);

    const reset = () => {
      if (!player) return;
      player.reset(spawn); camera.position.copy(player.getEye()); camera.lookAt(0, 5, 0); savedRotation.copy(camera.rotation); clearInput();
      routeIndex = 0; guiding = false;
    };
    const animate = (time: number) => {
      frame = requestAnimationFrame(animate);
      const delta = (time - previous) / 1000; previous = time;
      if (document.hidden) return;
      const input = callbacks.current.input.current;
      if (player && ready) {
        const goal = [0, 1, 2].find(index => !callbacks.current.visited.has(index)) ?? -1;
        if (goal !== routeGoal) { routeGoal = goal; routeIndex = 0; guiding = false; }
        const route = routes[goal] || [];
        const waypoint = route[routeIndex];
        guide.visible = !!waypoint && routeIndex < route.length - 1;
        if (waypoint) guide.position.copy(waypoint);
        if (resetSeen !== input.reset) { resetSeen = input.reset; reset(); }
        if (overview !== input.overview) {
          overview = input.overview; orbit.enabled = overview; clearInput();
          if (overview) { savedRotation.copy(camera.rotation); fitOverview(); }
          else { camera.position.copy(player.getEye()); camera.rotation.copy(savedRotation); if (scene.fog instanceof THREE.Fog) { scene.fog.near = 85; scene.fog.far = 170; } }
        }
        if (overview) orbit.update();
        else if (!input.paused) {
          if (guideSeen !== input.guide) {
            guideSeen = input.guide;
            guiding = true;
            camera.lookAt((waypoint || stops[0]).clone().add(new THREE.Vector3(0, 1.4, 0)));
          }
          const forward = input.autoWalk ? 1 : input.forward + Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
          const right = input.right + Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
          const blocked = player.step(THREE.MathUtils.clamp(forward, -1, 1), THREE.MathUtils.clamp(right, -1, 1), camera.rotation.y, delta);
          camera.position.copy(player.getEye());
          if (blocked && time > notifyAt + 2500) { notifyAt = time; callbacks.current.onNotice('Có vật cản phía trước. Hãy lùi một chút hoặc đi ngang; nút ↺ đưa bạn về lối bắt đầu.'); }
          if (blocked && input.autoWalk) stopAuto();
          if (Math.abs(camera.position.x) > boundary || Math.abs(camera.position.z) > boundary || camera.position.y < -5) {
            reset(); callbacks.current.onNotice('Bạn đã tới rìa khu tham quan. Đã đưa bạn về điểm bắt đầu.');
          }
          if (waypoint && routeIndex < route.length - 1 && Math.hypot(camera.position.x - waypoint.x, camera.position.z - waypoint.z) < 2) {
            routeIndex++;
            if (guiding) camera.lookAt(route[routeIndex].clone().add(new THREE.Vector3(0, 1.4, 0)));
            callbacks.current.onNotice('Đã qua góc tường. Tiếp tục đi tới điểm màu cam trước mặt.');
          }
          if (goal !== -1 && input.autoWalk && Math.hypot(camera.position.x - stops[goal].x, camera.position.z - stops[goal].z) < 3.2) { stopAuto(); callbacks.current.onNotice('Đã tới điểm tham quan. Bấm Nghe để mở thuyết minh.'); }
        } else clearInput();
        if (time > hudAt + 250) {
          hudAt = time;
          const eye = player.getEye(); let nearest = 0; let distance = Infinity;
          stops.forEach((stop, index) => { const d = Math.hypot(stop.x - eye.x, stop.z - eye.z); if (d < distance) { nearest = index; distance = d; } });
          const next = goal === -1 ? nearest : goal;
          const remaining = (routes[next] || [stops[next]]).slice(routeIndex);
          let nextDistance = 0; let previousPoint = eye;
          for (const point of remaining) { nextDistance += Math.hypot(point.x - previousPoint.x, point.z - previousPoint.z); previousPoint = point; }
          const hint = guide.visible ? 'Đi theo vòng xanh tới góc ngoài tường; lối tham quan vòng qua vật cản.' : goal === 0 ? 'Đi đến điểm màu cam phía trước công trình.' : 'Đi dọc phía ngoài tường đến điểm màu cam.';
          callbacks.current.onNearby(distance < 4 ? nearest : null, nextDistance, hint);
          markers.forEach((marker, index) => { (marker.material as THREE.MeshBasicMaterial).color.set(callbacks.current.visited.has(index) ? '#62be95' : '#ffad55'); });
        }
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);

    const load = async () => {
      try {
        callbacks.current.onLoading(0, 'Đang mở không gian Ngọ Môn…');
        const infoBytes = await download('/models/ngo-mon-game-info.json', abort.signal, () => {}, 60000, 'no-cache');
        const info = JSON.parse(new TextDecoder().decode(infoBytes));
        const version = encodeURIComponent(info.generatedAt);
        const [previewBytes, colliderBytes] = await Promise.all([
          download(`/models/ngo-mon-preview.glb?v=${version}`, abort.signal, value => callbacks.current.onLoading(Math.round(value * 0.8), 'Đang mở không gian Ngọ Môn…')),
          download(`/models/ngo-mon-collision.glb?v=${version}`, abort.signal, () => {}),
        ]);
        callbacks.current.onLoading(85, 'Đang chuẩn bị lối đi và các điểm thuyết minh…');
        const [visual, collision] = await Promise.all([loader.parseAsync(previewBytes, '/models/'), loader.parseAsync(colliderBytes, '/models/')]);
        if (abort.signal.aborted) { disposeTree(visual.scene); disposeTree(collision.scene); return; }
        const min = new THREE.Vector3().fromArray(info.bounds.min); const max = new THREE.Vector3().fromArray(info.bounds.max);
        const scale = 17 / (max.y - min.y); const center = min.clone().add(max).multiplyScalar(0.5);
        const normalize = (root: THREE.Group) => { root.scale.multiplyScalar(scale); root.position.set(-center.x * scale, -min.y * scale, -center.z * scale); root.updateMatrixWorld(true); return root; };
        model = normalize(visual.scene); collisionRoot = normalize(collision.scene); scene.add(model);
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshStandardMaterial({ color: '#c6bca9', roughness: 1 }));
        ground.rotation.x = -Math.PI / 2; ground.updateMatrixWorld(true); scene.add(ground);
        const collisionWorld = new THREE.Group(); collisionWorld.add(collisionRoot); collisionWorld.add(ground.clone()); collisionWorld.updateMatrixWorld(true);
        // Build only the small collision asset, never the original multi-million scan.
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        if (abort.signal.aborted) return;
        const octree = buildWalkWorld(collisionWorld);
        player = new WalkingController(octree);
        const halfWidth = (max.x - min.x) * scale / 2; const halfDepth = (max.z - min.z) * scale / 2;
        modelRadius = Math.hypot(halfWidth, halfDepth);
        boundary = Math.min(85, Math.max(halfWidth, halfDepth) + 32);
        spawn.set(0, 0.6, halfDepth + 20);
        stops.push(new THREE.Vector3(0, 0, halfDepth + 4), new THREE.Vector3(-halfWidth - 4, 0, 0), new THREE.Vector3(0, 0, -halfDepth - 4));
        routes.push([stops[0]], [new THREE.Vector3(-halfWidth - 4, 0, halfDepth + 4), stops[1]], [new THREE.Vector3(-halfWidth - 4, 0, -halfDepth - 4), stops[2]]);
        stops.forEach((position, index) => {
          const group = new THREE.Group(); group.position.copy(position);
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffad55' })); sphere.position.y = 1.4; sphere.userData.stop = index;
          const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 24), new THREE.MeshBasicMaterial({ color: '#ffad55', side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.025;
          group.add(sphere, ring); markers.push(sphere); scene.add(group);
        });
        reset(); ready = true; callbacks.current.onReady();
        // The player can walk while the detailed scan downloads in the background.
        try {
          const detailBytes = await download(`/models/ngo-mon-game.glb?v=${version}`, abort.signal, value => callbacks.current.onDetail(Math.min(98, value)), 120000);
          const detail = await loader.parseAsync(detailBytes, '/models/');
          if (abort.signal.aborted) { disposeTree(detail.scene); return; }
          const previousModel = model; model = normalize(detail.scene); scene.add(model);
          model.traverse(object => { if (object instanceof THREE.Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material.map) material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); });
          if (previousModel) { scene.remove(previousModel); disposeTree(previousModel); }
          callbacks.current.onDetail(100);
        } catch { if (!abort.signal.aborted) callbacks.current.onDetail(0, true); }
      } catch { if (!abort.signal.aborted) callbacks.current.onError('Chưa mở được cảnh tham quan. Kiểm tra mạng rồi bấm tải lại; bạn có thể quay về khám phá địa điểm.'); }
    };
    void load();
    return () => {
      abort.abort(); cancelAnimationFrame(frame); resize.disconnect(); clearInput(); orbit.dispose();
      document.removeEventListener('keydown', onKeyDown); document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInput); document.removeEventListener('visibilitychange', clearInput);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown); renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp); renderer.domElement.removeEventListener('pointercancel', clearInput);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      disposeTree(scene); if (collisionRoot) disposeTree(collisionRoot); renderer.dispose(); renderer.domElement.remove();
    };
  }, [props.retry]);

  return <div ref={host} style={{ position: 'absolute', inset: 0 }} />;
}
