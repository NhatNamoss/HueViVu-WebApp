import { Box3, Mesh, Triangle, Vector3 } from 'three';
import type { Object3D } from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';

export const EYE_HEIGHT = 1.65;
export const WALK_SPEED = 3;
const RADIUS = 0.28;

// The addon's stock split creates children with fresh default limits. Keep the
// collision index bounded at every level, while retaining its exact tests.
class WalkOctree extends Octree {
  constructor(box?: Box3) { super(box); this.maxLevel = 8; this.trianglesPerLeaf = 24; }
  override split(level: number): this {
    if (!this.box) return this;
    const half = this.box.getSize(new Vector3()).multiplyScalar(0.5);
    const origin = this.box.min.clone();
    const children = Array.from({ length: 8 }, (_, index) => {
      const min = origin.clone().add(new Vector3(index & 1, (index >> 1) & 1, (index >> 2) & 1).multiply(half));
      const child = new WalkOctree(new Box3(min, min.clone().add(half)));
      child.triangles = this.triangles.filter(triangle => child.box!.intersectsTriangle(triangle));
      return child;
    });
    this.triangles = [];
    for (const child of children) {
      if (!child.triangles.length) continue;
      if (child.triangles.length > this.trianglesPerLeaf && level < this.maxLevel) child.split(level + 1);
      this.subTrees.push(child);
    }
    return this;
  }
}

export function buildWalkWorld(root: Object3D) {
  const world = new WalkOctree();
  // A capsule is ~56 cm wide; sub-millimetre subdivision of a scan adds startup
  // work without improving the exact triangle/capsule intersection checks.
  world.maxLevel = 8; world.trianglesPerLeaf = 24;
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const positions = object.geometry.getAttribute('position');
    const indices = object.geometry.getIndex();
    const count = indices?.count ?? positions.count;
    for (let i = 0; i < count; i += 3) {
      const point = (offset: number) => new Vector3().fromBufferAttribute(positions, indices ? indices.getX(i + offset) : i + offset).applyMatrix4(object.matrixWorld);
      const triangle = new Triangle(point(0), point(1), point(2));
      if (triangle.getArea() < 0.000001) continue;
      world.addTriangle(triangle);
      // Scanned walls may have only one face. Block either approach direction;
      // retain one-sided ground so gravity can land and stairs can be followed.
      if (Math.abs(triangle.getNormal(new Vector3()).y) < 0.6) world.addTriangle(new Triangle(triangle.c.clone(), triangle.b.clone(), triangle.a.clone()));
    }
  });
  world.build(); return world;
}

export class WalkingController {
  collider = new Capsule();
  velocity = new Vector3();
  grounded = false;
  world: Octree;
  constructor(world: Octree) { this.world = world; }

  reset(foot: Vector3) {
    this.collider.set(foot.clone().add(new Vector3(0, RADIUS, 0)), foot.clone().add(new Vector3(0, EYE_HEIGHT - RADIUS, 0)), RADIUS);
    this.velocity.set(0, 0, 0);
    this.grounded = false;
  }

  getEye(target = new Vector3()) { return target.copy(this.collider.end).add(new Vector3(0, RADIUS, 0)); }

  step(forward: number, right: number, yaw: number, elapsed: number) {
    // Substeps prevent crossing thin walls and large jumps after a background tab.
    const dt = Math.min(Math.max(elapsed, 0), 0.2);
    const count = Math.max(1, Math.ceil(dt / (1 / 120)));
    const direction = new Vector3(right, 0, -forward);
    if (direction.lengthSq() > 1) direction.normalize();
    direction.applyAxisAngle(new Vector3(0, 1, 0), yaw).multiplyScalar(WALK_SPEED);
    let blocked = false;
    for (let i = 0; i < count; i++) {
      const delta = dt / count;
      this.velocity.x = direction.x; this.velocity.z = direction.z;
      this.velocity.y = this.grounded ? -0.5 : this.velocity.y - 18 * delta;
      this.collider.translate(this.velocity.clone().multiplyScalar(delta));
      this.grounded = false;
      // More than one surface may touch the capsule at a corner.
      for (let iteration = 0; iteration < 3; iteration++) {
        const hit = this.world.capsuleIntersect(this.collider);
        if (!hit) break;
        if (hit.normal.y > 0.5) { this.grounded = true; this.velocity.y = 0; }
        else if (Math.abs(hit.normal.y) < 0.5 && direction.lengthSq() > 0) blocked = true;
        this.collider.translate(hit.normal.clone().multiplyScalar(hit.depth + 0.0001));
      }
    }
    return blocked;
  }
}
