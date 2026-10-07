import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { cloneDocument, dedup, getBounds, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { stat, writeFile } from 'node:fs/promises';

// Preserve the original scan. Visual detail and collision have separate budgets.
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
const input = 'public/models/ngo-mon.glb';
const visual = await io.read(input);
const triangles = doc => doc.getRoot().listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((n, p) => n + (p.getIndices()?.getCount() || p.getAttribute('POSITION').getCount()) / 3, 0), 0);
const renderedTriangles = doc => {
  const visit = node => (node.getMesh()?.listPrimitives().reduce((sum, p) => sum + (p.getIndices()?.getCount() || p.getAttribute('POSITION').getCount()) / 3, 0) || 0) + node.listChildren().reduce((sum, child) => sum + visit(child), 0);
  return doc.getRoot().listScenes()[0].listChildren().reduce((sum, node) => sum + visit(node), 0);
};
const originalTriangles = renderedTriangles(visual);
await visual.transform(dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.025, error: 0.003 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 88 }), prune());
await io.write('public/models/ngo-mon-game.glb', visual);

const collider = cloneDocument(visual);
for (const mesh of collider.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
  primitive.setMaterial(null);
  for (const semantic of primitive.listSemantics()) if (semantic !== 'POSITION') primitive.setAttribute(semantic, null);
}
await collider.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.04, error: 0.008 }), prune());
await io.write('public/models/ngo-mon-collision.glb', collider);
const preview = cloneDocument(visual);
await preview.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.08, error: 0.006 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 75 }), prune());
const bounds = getBounds(collider.getRoot().listScenes()[0]);
await preview.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await visual.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write('public/models/ngo-mon-game.glb', visual);
await io.write('public/models/ngo-mon-preview.glb', preview);
const result = { source: input, bounds, originalTriangles, visualTriangles: renderedTriangles(visual), visualUniqueTriangles: triangles(visual), colliderTriangles: renderedTriangles(collider),
  visualBytes: (await stat('public/models/ngo-mon-game.glb')).size, colliderBytes: (await stat('public/models/ngo-mon-collision.glb')).size,
  previewBytes: (await stat('public/models/ngo-mon-preview.glb')).size, previewTriangles: renderedTriangles(preview), textureMaxSize: 2048, generatedAt: new Date().toISOString() };
await writeFile('public/models/ngo-mon-game-info.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
