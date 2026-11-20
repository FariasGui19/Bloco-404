import * as T from "../vendor/three.module.js";
import { bakeEnvironment, LIMIAR_ENVIRONMENT } from "./environment-data.js";

const skyVertex = `varying vec3 vDirection;
void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const skyFragment = `uniform vec3 uZenith,uUpper,uHorizon,uAfterglow;varying vec3 vDirection;
void main(){vec3 dir=normalize(vDirection);float h=max(0.0,dir.y);
 vec3 color=mix(uHorizon,uUpper,smoothstep(0.0,0.42,h));color=mix(color,uZenith,smoothstep(0.28,0.95,h));
 float glow=pow(max(0.0,dot(dir,normalize(vec3(-0.8,0.08,-0.5)))),8.0)*(1.0-smoothstep(0.0,0.38,h));
 color=mix(color,uAfterglow,glow*0.4);gl_FragColor=vec4(color,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
const waterVertex = `uniform float uTime,uSea,uAmplitude;uniform sampler2D uHeight;uniform vec4 uBounds;uniform float uHeightSize;
varying vec3 vWorld;
#include <fog_pars_vertex>
float sampleHeight(vec2 p){
 vec2 g=clamp((p-uBounds.xy)/uBounds.zw,0.0,1.0)*(uHeightSize-1.0);
 vec2 cell=min(floor(g),vec2(uHeightSize-2.0)),f=g-cell;
 vec4 h=texture2D(uHeight,(cell+0.5)/uHeightSize);
 return mix(mix(h.r,h.g,f.x),mix(h.b,h.a,f.x),f.y);
}
void main(){vec3 p=position;float bed=sampleHeight(p.xz);
 float fade=smoothstep(0.0,2.5,uSea-bed);
 p.y=uSea+(sin(p.x*.12+uTime*.8)*cos(p.z*.10+uTime*.5)*uAmplitude+sin((p.x+p.z)*.19-uTime*.6)*.035)*fade;
 vec4 world=modelMatrix*vec4(p,1.0);vWorld=world.xyz;vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
}`;
const waterFragment = `uniform float uTime,uSea,uHeightSize;uniform sampler2D uHeight,uRipples;uniform vec4 uBounds;
uniform vec3 uDeep,uShallow,uFoam,uReflection;varying vec3 vWorld;
#include <fog_pars_fragment>
float sampleHeight(vec2 p){
 vec2 g=clamp((p-uBounds.xy)/uBounds.zw,0.0,1.0)*(uHeightSize-1.0);
 vec2 cell=min(floor(g),vec2(uHeightSize-2.0)),f=g-cell;
 vec4 h=texture2D(uHeight,(cell+0.5)/uHeightSize);
 return mix(mix(h.r,h.g,f.x),mix(h.b,h.a,f.x),f.y);
}
void main(){
 float bed=sampleHeight(vWorld.xz);float depth=max(0.0,uSea-bed);
 vec2 pixel=floor(vWorld.xz*5.0)/5.0;
 float ripple=texture2D(uRipples,pixel*.045+vec2(uTime*.004,-uTime*.002)).r;
 float crossing=texture2D(uRipples,pixel.yx*.033+vec2(-uTime*.003,uTime*.001)).r;
 vec3 N=normalize(vec3(-cos(pixel.x*.12+uTime*.8)*.11+(ripple-.5)*.10,1.0,sin(pixel.y*.10+uTime*.5)*.09+(crossing-.5)*.10));
 vec3 V=normalize(cameraPosition-vWorld);float fresnel=pow(1.0-max(0.0,dot(N,V)),3.0);
 vec3 color=mix(uDeep,uShallow,1.0-smoothstep(.2,8.0,depth));
 color*=.94+ripple*.09+crossing*.04;float crest=smoothstep(.65,.80,ripple)*smoothstep(.35,.65,crossing);color+=uReflection*crest*.10;color=mix(color,uReflection,.10+fresnel*.30);
 vec3 halfVector=normalize(normalize(vec3(-.65,.7,-.3))+V);
 float glint=pow(max(0.0,dot(N,halfVector)),100.0)*smoothstep(.40,.67,ripple+crossing*.17);
 color+=vec3(.27,.28,.31)*glint*.32;
 float tide=sin(pixel.x*.45+pixel.y*.32-uTime*.85)*.18;
 float band=1.0-smoothstep(.05,.23,abs(depth-(.38+tide)));
 float backwash=1.0-smoothstep(.03,.17,abs(depth-(1.0+tide*.6)));
 float foam=(band*.65+backwash*.16)*(0.45+ripple*.55)*smoothstep(0.0,.14,depth);
 foam*=smoothstep(.38,.68,ripple+crossing*.12);color=mix(color,uFoam,foam);
 float alpha=mix(.62,.91,smoothstep(.2,5.0,depth))+foam*.08;
 if(!gl_FrontFacing){color=mix(uDeep,uShallow,.25);alpha=.70;}
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;

export function createEnvironment(
  scene,
  { heightAt, profile = LIMIAR_ENVIRONMENT } = {},
) {
  const bake = bakeEnvironment(heightAt, profile),
    textures = [];
  function dataTexture(
    data,
    w,
    h,
    format = T.RGBAFormat,
    type = T.UnsignedByteType,
  ) {
    const tex = new T.DataTexture(data, w, h, format, type);
    tex.magFilter = tex.minFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    textures.push(tex);
    return tex;
  }
  const albedo = dataTexture(bake.albedo, bake.size, bake.size);
  albedo.colorSpace = T.SRGBColorSpace;
  const height = dataTexture(
    bake.heightCorners,
    bake.heightSize,
    bake.heightSize,
    T.RGBAFormat,
    T.FloatType,
  );
  const ripplePixels = new Uint8Array(128 * 128 * 4);
  // Seamless, low-contrast pixel wavelets. Sinusoidal ribbon contours, not hash snow.
  for (let z = 0; z < 128; z++)
    for (let x = 0; x < 128; x++) {
      const a = (x / 128) * Math.PI * 2,
        b = (z / 128) * Math.PI * 2;
      const ribbon =
        Math.sin(a * 3 + Math.sin(b * 2) * 1.8) +
        Math.sin(b * 5 + a * 2) * 0.34;
      const value = (Math.round((0.5 + ribbon * 0.19) * 12) / 12) * 255,
        i = (z * 128 + x) * 4;
      ripplePixels[i] = ripplePixels[i + 1] = ripplePixels[i + 2] = value;
      ripplePixels[i + 3] = 255;
    }
  const ripples = dataTexture(ripplePixels, 128, 128);
  ripples.wrapS = ripples.wrapT = T.RepeatWrapping;
  const sky = new T.Mesh(
    new T.SphereGeometry(350, 20, 12),
    new T.ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: T.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: Object.fromEntries(
        Object.entries(profile.sky).map(([name, color]) => [
          "u" + name[0].toUpperCase() + name.slice(1),
          { value: new T.Color(color) },
        ]),
      ),
    }),
  );
  sky.name = "environment-sky";
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  scene.add(sky);
  const celestial = new T.Group();
  celestial.name = "environment-celestial";
  scene.add(celestial);
  const hemisphere = new T.HemisphereLight(
    profile.light.sky,
    profile.light.ground,
    profile.light.ambient,
  );
  const key = new T.DirectionalLight(
    profile.light.key,
    profile.light.intensity,
  );
  key.position.set(-50, 70, 25);
  scene.add(hemisphere, key);
  scene.fog = new T.FogExp2(profile.fog.color, profile.fog.density);
  scene.background = new T.Color(profile.fog.color);
  const fogAbove = new T.Color(profile.fog.color),
    fogBelow = new T.Color(profile.fog.underwaterColor);
  const bounds = profile.bounds;
  const waterMaterial = new T.ShaderMaterial({
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    fog: true,
    uniforms: {
      ...T.UniformsUtils.clone(T.UniformsLib.fog),
      uTime: { value: 0 },
      uSea: { value: profile.seaLevel },
      uAmplitude: { value: profile.water.amplitude },
      uHeight: { value: height },
      uHeightSize: { value: bake.heightSize },
      uRipples: { value: ripples },
      uBounds: {
        value: new T.Vector4(
          bounds.minX,
          bounds.minZ,
          bounds.sizeX,
          bounds.sizeZ,
        ),
      },
      uDeep: { value: new T.Color(profile.water.deep) },
      uShallow: { value: new T.Color(profile.water.shallow) },
      uFoam: { value: new T.Color(profile.water.foam) },
      uReflection: { value: new T.Color(profile.water.reflection) },
    },
  });
  const terrainMaterial = new T.MeshLambertMaterial({
    map: albedo,
    flatShading: true,
  });
  function applyTerrainUV(geometry) {
    const p = geometry.attributes.position,
      uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++)
      uv.setXY(
        i,
        (p.getX(i) - bounds.minX) / bounds.sizeX,
        (p.getZ(i) - bounds.minZ) / bounds.sizeZ,
      );
  }
  function setCamera(camera, underwater) {
    sky.position.copy(camera.position);
    celestial.position.copy(camera.position);
    sky.visible = celestial.visible = !underwater;
    scene.fog.color.copy(underwater ? fogBelow : fogAbove);
    scene.fog.density = underwater
      ? profile.fog.underwaterDensity
      : profile.fog.density;
    scene.background.copy(underwater ? fogBelow : fogAbove);
  }
  let disposed = false;
  return {
    profile,
    bake,
    textures,
    sky,
    celestial,
    terrainMaterial,
    waterMaterial,
    applyTerrainUV,
    setCamera,
    update(time) {
      waterMaterial.uniforms.uTime.value = time;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const tex of textures) tex.dispose();
    },
  };
}
