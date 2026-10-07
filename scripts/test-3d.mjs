import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildWalkWorld, WalkingController, EYE_HEIGHT, WALK_SPEED } from '../src/lib/3d/walker.ts';
import { readFile, stat } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

function worldWith(...walls) {
  const scene = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100)); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  for (const [x, z, width, depth] of walls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, 5, depth)); wall.position.set(x, 2.5, z); scene.add(wall);
  }
  scene.updateMatrixWorld(true); return buildWalkWorld(scene);
}
const step = (player, forward, right, seconds) => { let blocked = false; for (let i = 0; i < seconds * 120; i++) blocked = player.step(forward, right, 0, 1 / 120) || blocked; return blocked; };
const player = new WalkingController(worldWith());
player.reset(new THREE.Vector3(0, 2, 0)); step(player, 0, 0, 2);
assert(Math.abs(player.getEye().y - EYE_HEIGHT) < 0.015, 'eye height should follow the ground');
const start = player.getEye(); step(player, 1, 1, 1);
assert(Math.abs(Math.hypot(player.getEye().x - start.x, player.getEye().z - start.z) - WALK_SPEED) < 0.01, 'diagonal movement must not be faster');
const beforePause = player.getEye(); player.step(1, 0, 0, 8);
assert(player.getEye().distanceTo(beforePause) < 0.65, 'background-tab time jump must be clamped');

const wallPlayer = new WalkingController(worldWith([0, 0, 0.12, 10]));
wallPlayer.reset(new THREE.Vector3(-3, 0.1, 0));
assert(step(wallPlayer, 0, 1, 5), 'wall contact should give feedback');
assert(wallPlayer.getEye().x < -0.33, 'cannot walk through a thin wall');
const doorway = new WalkingController(worldWith([-2, 0, 2, 0.2], [2, 0, 2, 0.2]));
doorway.reset(new THREE.Vector3(0, 0.1, 4)); step(doorway, 1, 0, 2);
assert(doorway.getEye().z < -1, 'open doorway must remain passable');
doorway.reset(new THREE.Vector3(2, 0.1, 4)); step(doorway, 1, 0, 2);
assert(doorway.getEye().z > 0.37, 'wall beside a doorway must block movement');

const scannedScene = new THREE.Group();
const scannedFloor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30)); scannedFloor.rotation.x = -Math.PI / 2; scannedScene.add(scannedFloor);
const singleFace = new THREE.Mesh(new THREE.PlaneGeometry(10, 5)); singleFace.position.y = 2.5; scannedScene.add(singleFace);
const scannedWall = new WalkingController(buildWalkWorld(scannedScene));
scannedWall.reset(new THREE.Vector3(0, 0.1, -3)); step(scannedWall, -1, 0, 2);
assert(scannedWall.getEye().z < -0.27, 'scanned wall must also block from the back');
scannedWall.reset(new THREE.Vector3(0, 0.1, 3)); step(scannedWall, 1, 0, 2);
assert(scannedWall.getEye().z > 0.27, 'scanned wall must block from the front');

const info = JSON.parse(await readFile('public/models/ngo-mon-game-info.json', 'utf8'));
// Exercise the actual scan's collision transforms and the complete outside route.
const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read('public/models/ngo-mon-collision.glb');
function copyNode(node) {
  const group = new THREE.Group(); group.matrix.fromArray(node.getMatrix()); group.matrixAutoUpdate = false;
  for (const primitive of node.getMesh()?.listPrimitives() || []) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(primitive.getAttribute('POSITION').getArray(), 3));
    geometry.setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray(), 1));
    group.add(new THREE.Mesh(geometry));
  }
  for (const child of node.listChildren()) group.add(copyNode(child));
  return group;
}
const level = new THREE.Group(); const scan = new THREE.Group();
for (const node of document.getRoot().listScenes()[0].listChildren()) scan.add(copyNode(node));
const [min, max] = [info.bounds.min, info.bounds.max]; const scale = 17 / (max[1] - min[1]);
scan.scale.setScalar(scale); scan.position.set(-(min[0] + max[0]) / 2 * scale, -min[1] * scale, -(min[2] + max[2]) / 2 * scale); level.add(scan);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180)); ground.rotation.x = -Math.PI / 2; level.add(ground);
const actual = new WalkingController(buildWalkWorld(level));
const width = (max[0] - min[0]) * scale / 2 + 4; const depth = (max[2] - min[2]) * scale / 2 + 4;
actual.reset(new THREE.Vector3(0, 0.6, depth + 16));
for (const target of [[0, depth], [-width, depth], [-width, 0], [-width, -depth], [0, -depth]]) {
  const from = actual.getEye(); const yaw = Math.atan2(from.x - target[0], from.z - target[1]);
  let reached = false;
  for (let tick = 0; tick < 3000; tick++) {
    const eye = actual.getEye();
    if (Math.hypot(eye.x - target[0], eye.z - target[1]) < 1.8) { reached = true; break; }
    actual.step(1, 0, yaw, 1 / 60);
  }
  assert(reached, `scan route is blocked before ${target}`);
}
assert(info.visualTriangles < 300000 && info.colliderTriangles < 10000, 'geometry budgets exceeded');
assert(info.previewBytes < 1500000 && info.visualBytes < 6000000, 'download budgets exceeded');
for (const id of ['gate', 'pavilion', 'context']) assert((await stat(`public/audio/ngo-mon/${id}.mp3`)).size > 10000, `missing narration: ${id}`);
console.log('PASS: eye height, gravity, diagonal speed, tab resume, thin wall, bidirectional scanned wall, doorway, real scan route to all three stops, asset budgets and three narrations');
