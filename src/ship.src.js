/* 3D ship for the services wheel.
   Bundled to js/ship.js by tools/ship/bundle.mjs (three.js is tree-shaken in).

   The page drives it: js/site.js calls WMShip.update({ pos, vis }) every frame
   the reel is on screen, where pos is the wheel position 0..8 (one unit per
   service) and vis fades the canvas in. Between services the camera pulls back,
   swings and the model tilts, then settles on the next part of the ship and
   lights it. If anything fails (no WebGL, file://, missing model) it stays out
   of the way and the page keeps its photos. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Fog, HemisphereLight, DirectionalLight,
  Vector3, Color, ACESFilmicToneMapping, SRGBColorSpace, PCFSoftShadowMap,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.querySelector("[data-ship-canvas]");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const D2R = Math.PI / 180;
const sm = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/* One view per service: where to look, from which angle, how far, and how the model is tilted.
   az is measured around the ship from the bow (+x) toward the dock's water side (+z). */
const VIEWS = [
  /* 0 dry docking        */ { t: [0.2, -0.5, 0.6], az: 24, el: 17, d: 21.5, tx: 0, tz: 0 },
  /* 1 barge construction */ { t: [-1.4, -1.0, 7.4], az: 150, el: 24, d: 14.5, tx: 1.2, tz: -2.2 },
  /* 2 afloat repairs     */ { t: [0.4, -0.45, 1.3], az: 86, el: 17, d: 14.5, tx: 0, tz: 1.6 },
  /* 3 steel and piping   */ { t: [0.6, 0.7, 0], az: 100, el: 52, d: 8.8, tx: -1.8, tz: 0 },
  /* 4 hydraulic tube     */ { t: [5.0, 1.2, 0.5], az: 58, el: 20, d: 8.2, tx: 0.6, tz: -2.0 },
  /* 5 mechanical         */ { t: [-4.2, 1.5, 0], az: 128, el: 22, d: 11, tx: 1.0, tz: 2.2 },
  /* 6 machine shop       */ { t: [-5.9, -1.0, 0], az: 161, el: 4, d: 5.2, tx: 0, tz: -1.6 },
  /* 7 blasting           */ { t: [0.4, -0.1, 1.2], az: 84, el: 15, d: 12.5, tx: -0.8, tz: 1.8 },
  /* 8 spray painting     */ { t: [5.3, -0.1, 0.4], az: 22, el: 12, d: 9.4, tx: 0.8, tz: -1.2 },
];
const HIGHLIGHTS = ["hl_dock", "hl_barge", "ov_waterline", "hl_pipes", "hl_crane", "hl_engine", "hl_prop", "ov_hullside", "ov_bow"];

const WMShip = { ready: false, update() {} };
window.WMShip = WMShip;

function webgl() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}

if (canvas && !reduce && webgl()) init();

/* Over http(s) the model is fetched as a normal file. Browsers refuse that from a
   page opened straight off the disk (file://), so there the same model is read from
   js/ship-model.js, a copy embedded as base64 (written by tools/ship/make-model.mjs). */
function loadModel(onLoad, onError) {
  const loader = new GLTFLoader();
  if (location.protocol !== "file:") { loader.load("assets/models/ship.glb", onLoad, undefined, onError); return; }
  const tag = document.createElement("script");
  tag.src = "js/ship-model.js";
  tag.onload = () => {
    try {
      const bin = atob(window.WM_SHIP_GLB), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      loader.parse(bytes.buffer, "", onLoad, onError);
    } catch (e) { onError(e); }
  };
  tag.onerror = onError;
  document.head.appendChild(tag);
}

function init() {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.fog = new Fog(new Color("#1f4a53"), 22, 52);
  const camera = new PerspectiveCamera(30, 1, 0.1, 90);

  scene.add(new HemisphereLight(0xcfe4f1, 0x1a3d4a, 1.15));
  const key = new DirectionalLight(0xfff0dc, 2.7);
  key.position.set(7, 12, 8); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -15, right: 15, top: 12, bottom: -12, near: 1, far: 40 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new DirectionalLight(0x7fd6dd, 0.9);
  rim.position.set(-9, 5, -7); scene.add(rim);

  const pivot = new Group(); scene.add(pivot);     // tilting the model happens here
  const targets = {};                               // highlight name -> [{ mat, base }]

  loadModel((gltf) => {
    const model = gltf.scene;
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    pivot.add(model);

    HIGHLIGHTS.forEach((name) => {
      const node = model.getObjectByName(name);
      const list = [];
      if (node) node.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        list.push({ mesh: o, mat: o.material, emissive: o.material.emissive.clone(), ei: o.material.emissiveIntensity, overlay: name.startsWith("ov_") });
        if (name.startsWith("ov_")) o.castShadow = o.receiveShadow = false;
      });
      targets[name] = list;
    });
    WMShip.ready = true;
    window.dispatchEvent(new CustomEvent("wm-ship-ready"));
  }, () => { /* model failed: the page keeps its photos */ });

  let W = 0, H = 0;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (w === W && h === H)) return;
    W = w; H = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the ship clear of the text: right of the list on desktop, middle band on phones
    if (w >= 900) camera.setViewOffset(w, h, -w * 0.1, h * 0.02, w, h);
    else if (w >= 600) camera.setViewOffset(w, h, 0, -h * 0.04, w, h);
    else camera.setViewOffset(w, h, 0, -h * 0.06, w, h);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);

  const tmpT = new Vector3(), tmpP = new Vector3();
  const A = (k) => VIEWS[Math.min(VIEWS.length - 1, Math.max(0, k))];

  WMShip.update = function (state) {
    if (!WMShip.ready) return;
    resize();
    canvas.style.opacity = state.vis.toFixed(3);
    if (state.vis < 0.01) return;

    const pos = Math.min(VIEWS.length - 1, Math.max(0, state.pos));
    const i = Math.min(VIEWS.length - 2, Math.floor(pos)), f = pos - i;
    const t = sm(f);
    const a = A(i), b = A(i + 1);
    const swing = Math.sin(Math.PI * t);               // 0 at each service, 1 mid-move

    // orbit: lerp the target, angles and distance; pull back and tilt while moving
    const az = lerp(a.az, b.az, t) * D2R;
    const el = (lerp(a.el, b.el, t) + swing * 7) * D2R;
    // narrow screens see less sideways, so stand further back
    const asp = W / H, wide = Math.min(1, Math.max(0, (asp - 0.4) / 0.8));
    const d = (lerp(a.d, b.d, t) + swing * 4.5) * lerp(1.75, 1, wide);
    tmpT.set(lerp(a.t[0], b.t[0], t), lerp(a.t[1], b.t[1], t), lerp(a.t[2], b.t[2], t));
    tmpP.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(d).add(tmpT);
    camera.position.copy(tmpP);
    camera.lookAt(tmpT);

    // tilt the model: settled tilt per service plus a swing during the move
    const dir = (b.tz - a.tz) >= 0 ? 1 : -1;
    pivot.rotation.x = (lerp(a.tx, b.tx, t) + dir * swing * 2.2) * D2R;
    pivot.rotation.z = (lerp(a.tz, b.tz, t) + dir * swing * 3.4) * D2R;

    // highlight: each service glows its own part, easing in as the camera arrives
    HIGHLIGHTS.forEach((name, k) => {
      const w = sm(1 - Math.abs(pos - k) * 1.5);
      (targets[name] || []).forEach((e) => {
        if (e.overlay) { e.mesh.visible = w > 0.01; e.mat.opacity = 0.62 * w; }
        else { e.mat.emissive.set("#00d4a4"); e.mat.emissiveIntensity = (name === "hl_prop" ? 0.32 : 0.55) * w; if (w < 0.01) { e.mat.emissive.copy(e.emissive); e.mat.emissiveIntensity = e.ei; } }
      });
    });

    renderer.render(scene, camera);
  };
}
