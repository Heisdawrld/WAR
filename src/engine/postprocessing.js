import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { getTier } from './renderer.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.tier = getTier();
    this.composer = null;
    this.bloomPass = null;
    this.enabled = this.tier !== 'low';
    if (this.enabled) {
      this.setup(renderer, scene, camera);
    }
  }

  setup(renderer, scene, camera) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = this.tier === 'high' ? 1 : 0.5;

    this.composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    if (this.tier === 'high') {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(w * pr, h * pr),
        0.3, 0.4, 0.85
      );
      this.composer.addPass(this.bloomPass);
    }

    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(1 / (w * renderer.getPixelRatio()), 1 / (h * renderer.getPixelRatio()));
    this.composer.addPass(fxaaPass);

    const vignetteShader = {
      uniforms: {
        tDiffuse: { value: null },
        darkness: { value: 0.5 },
        offset: { value: 1.0 }
      },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float darkness;
        uniform float offset;
        varying vec2 vUv;
        void main(){
          vec4 texel=texture2D(tDiffuse,vUv);
          vec2 uv=(vUv-vec2(0.5))*vec2(offset);
          float vignette=1.0-dot(uv,uv);
          texel.rgb*=smoothstep(0.0,1.0,vignette*(1.0-darkness));
          gl_FragColor=texel;
        }`
    };
    const vignettePass = new ShaderPass(vignetteShader);
    this.composer.addPass(vignettePass);
  }

  render() {
    if (this.enabled && this.composer) {
      this.composer.render();
    }
  }

  resize(w, h) {
    if (this.composer) {
      this.composer.setSize(w, h);
    }
  }
}
