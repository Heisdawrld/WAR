import * as THREE from 'three';
import { getTier } from './renderer.js';

export function createLighting(scene) {
  const tier = getTier();

  const ambient = new THREE.AmbientLight(0x6688aa, tier === 'low' ? 0.6 : 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
  sun.position.set(50, 80, 30);
  sun.castShadow = tier !== 'low';
  if (sun.castShadow) {
    sun.shadow.mapSize.width = tier === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.height = tier === 'high' ? 2048 : 1024;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 250;
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    sun.shadow.bias = -0.001;
    sun.shadow.normalBias = 0.02;
  }
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0x88aacc, 0x445522, 0.3);
  scene.add(hemi);

  if (tier !== 'low') {
    const fog = new THREE.FogExp2(0x87CEEB, 0.003);
    scene.fog = fog;
  }

  return { ambient, sun, hemi };
}
