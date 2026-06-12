import * as THREE from 'three';

let renderer;
let deviceTier = 'high';

export function getDeviceTier() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return 'low';

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const maxRenderbuffers = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  if (isMobile || maxTextureSize < 8192) {
    deviceTier = 'low';
  } else if (maxTextureSize < 16384 || pixelRatio > 2) {
    deviceTier = 'medium';
  } else {
    deviceTier = 'high';
  }

  return deviceTier;
}

export function createRenderer(canvas) {
  const tier = getDeviceTier();
  const pixelRatio = tier === 'low' ? 1 : Math.min(window.devicePixelRatio, 2);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: tier !== 'low',
    powerPreference: tier === 'low' ? 'low-power' : 'high-performance',
    alpha: false
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = tier !== 'low';
  renderer.shadowMap.type = tier === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = tier === 'low' ? 1.2 : 1.0;
  renderer.setClearColor(0x87CEEB);

  return renderer;
}

export function getRenderer() { return renderer; }
export function getTier() { return deviceTier; }
