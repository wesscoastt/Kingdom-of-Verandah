import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

/* ── Storage ── */
const Store = (() => {
  let mem = {}, ok = false;
  try { const k = "_vt_"; localStorage.setItem(k, "1"); localStorage.removeItem(k); ok = true; } catch (e) {}
  return {
    get: k => { try { return ok ? localStorage.getItem(k) : mem[k] ?? null; } catch(e) { return mem[k] ?? null; } },
    set: (k, v) => { try { ok ? localStorage.setItem(k, v) : (mem[k] = v); } catch(e) { mem[k] = v; } },
    has: k => !!Store.get(k),
  };
})();
const SAVE = "verandah_m2";

/* ── SFX ── */
const SFX = (() => {
  let ctx = null;
  const ac = () => { if (!ctx) try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return ctx; };
  const b = (f=500,d=.06,t="square",g=.05) => {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), gn = c.createGain();
    o.type = t; o.frequency.value = f; gn.gain.value = g;
    o.connect(gn); gn.connect(c.destination);
    const n = c.currentTime; o.start(n);
    gn.gain.exponentialRampToValueAtTime(.0001, n+d); o.stop(n+d+.02);
  };
  return {
    resume() { const c = ac(); if (c?.state === "suspended") c.resume(); },
    talk()  { b(360+Math.random()*100, .032, "square", .04); },
    swing() { b(210, .09, "sawtooth", .05); },
    heavy() { b(140, .15, "sawtooth", .08); },
    hit()   { b(130, .13, "square", .08); },
    block() { b(300, .06, "square", .06); },
    hurt()  { b(100, .18, "square", .09); },
    pickup(){ b(740, .07, "triangle", .06); setTimeout(() => b(1020,.07,"triangle",.05), 60); },
    levelup(){ [523,659,784,1046].forEach((f,i) => setTimeout(() => b(f,.16,"triangle",.07), i*90)); },
    quest() { [659,880].forEach((f,i) => setTimeout(() => b(f,.12,"triangle",.06), i*110)); },
    chest() { [523,659,784].forEach((f,i) => setTimeout(() => b(f,.1,"triangle",.06), i*70)); },
    bow()   { b(900,.05,"triangle",.05); setTimeout(()=>b(420,.08,"sawtooth",.04),30); },
    magic() { b(680,.12,"sine",.06); setTimeout(()=>b(1040,.14,"sine",.05),60); },
  };
})();

/* ── Items ── */
const ITEMS = {
  hunter_bow:      { name:"Hunter's Bow",       icon:"🏹", rar:"common",    type:"weapon",   slot:"weapon",   dmg:13, dex:3,            price:55,  desc:"A reliable recurve for forest hunters." },
    iron_sword:      { name:"Iron Shortsword",   icon:"🗡️", rar:"common",    type:"weapon",   slot:"weapon",   dmg:14, str:2,            price:60,  desc:"A reliable blade for new Wardens." },
  steel_sword:     { name:"Steel Longsword",   icon:"⚔️", rar:"uncommon",  type:"weapon",   slot:"weapon",   dmg:24, str:4,            price:180, desc:"Forged in the furnaces of Stonewatch." },
  warden_blade:    { name:"Wardenlight Blade", icon:"✦",  rar:"epic",      type:"weapon",   slot:"weapon",   dmg:40, str:6, int:4,     price:900, desc:"Hums with ancient relic-light." },
  heartwood_edge:  { name:"Heartwood Edge",    icon:"🌳", rar:"legendary",  type:"weapon",   slot:"weapon",   dmg:54, str:8, int:6, maxHp:20, price:1600, desc:"Hewn from Thornheart's core. The grove's last gift." },
  hunter_bow:      { name:"Oakwood Bow",       icon:"🏹", rar:"common",    type:"weapon",   slot:"weapon",   dmg:18, dex:4,            price:90,  desc:"Crafted by Red Oak rangers." },
  ash_staff:       { name:"Ashwood Staff",     icon:"🪄", rar:"uncommon",  type:"weapon",   slot:"weapon",   dmg:12, int:8, maxMana:20, price:150, desc:"Channels arcane energy." },
  bandit_blade:    { name:"Bandit's Cutlass",  icon:"🔪", rar:"uncommon",  type:"weapon",   slot:"weapon",   dmg:20, dex:2,            price:140, desc:"A scoundrel's blade, still sharp." },
  leather_helm:    { name:"Leather Helm",      icon:"⛑️", rar:"common",    type:"armor",    slot:"helmet",   col:0x7a5a32, def:4,                    price:45,  desc:"Basic head protection." },
  iron_helm:       { name:"Iron Helm",         icon:"🪖", rar:"uncommon",  type:"armor",    slot:"helmet",   col:0x9aa0aa, def:8,  str:2,            price:120, desc:"Heavy and sturdy." },
  ancient_circlet: { name:"Ancient Circlet",   icon:"👑", rar:"rare",      type:"armor",    slot:"helmet",   col:0xc9a23a, crest:0x66ccff, def:5,  int:6, maxMana:15, price:280, desc:"Carved with runes of the old Wardens." },
  leather_vest:    { name:"Leather Vest",      icon:"🥋", rar:"common",    type:"armor",    slot:"chest",    col:0x7a5a32, def:8,                    price:80,  desc:"Light and flexible." },
  chainmail:       { name:"Chainmail Hauberk", icon:"🛡️", rar:"uncommon",  type:"armor",    slot:"chest",    col:0x8a909a, def:15, str:2,            price:220, desc:"Interlocked iron rings." },
  warden_robes:    { name:"Warden Robes",      icon:"🧥", rar:"epic",      type:"armor",    slot:"chest",    col:0x3a6e9a, def:10, int:6, maxMana:30, price:450, desc:"The robes of a Warden of old." },
  leather_gloves:  { name:"Leather Gloves",    icon:"🧤", rar:"common",    type:"armor",    slot:"gloves",   def:3,  dex:2,            price:40,  desc:"Supple traveling gloves." },
  iron_gauntlets:  { name:"Iron Gauntlets",    icon:"🥊", rar:"uncommon",  type:"armor",    slot:"gloves",   def:6,  str:4,            price:110, desc:"Heavy iron fist-covers." },
  trail_boots:     { name:"Trail Boots",       icon:"👢", rar:"common",    type:"armor",    slot:"boots",    def:3,  dex:2,            price:45,  desc:"Well-worn travel boots." },
  iron_boots:      { name:"Iron Boots",        icon:"🥿", rar:"uncommon",  type:"armor",    slot:"boots",    def:6,  str:2,            price:130, desc:"Iron-shod footwear." },
  silver_ring:     { name:"Silver Ring",       icon:"💍", rar:"uncommon",  type:"armor",    slot:"ring",     def:1,  int:4,            price:120, desc:"Inscribed with minor wards." },
  ruby_ring:       { name:"Ruby Ring",         icon:"🔴", rar:"rare",      type:"armor",    slot:"ring",     str:4,  maxHp:10,         price:280, desc:"Set with Ironpeak rubies." },
  jade_ring:       { name:"Jade Ring",         icon:"🟢", rar:"uncommon",  type:"armor",    slot:"ring",     dex:4,                    price:150, desc:"Cool jade, swifter steps." },
  jade_pendant:    { name:"Jade Pendant",      icon:"📿", rar:"uncommon",  type:"armor",    slot:"necklace", maxHp:20,                 price:150, desc:"A traveler's lucky charm." },
  scholars_chain:  { name:"Scholar's Chain",   icon:"🧿", rar:"rare",      type:"armor",    slot:"necklace", int:6,  maxMana:25,       price:320, desc:"Heavy with arcane knowledge." },
  wardens_seal:    { name:"Warden's Seal",     icon:"⚜️", rar:"epic",      type:"armor",    slot:"necklace", str:4,  int:4, maxHp:30,  price:600, desc:"The seal of the ancient Wardens." },
  potion_minor:    { name:"Minor Draught",     icon:"🧪", rar:"common",    type:"potion",   heal:40,                                  price:25,  desc:"Restores 40 HP." },
  potion_greater:  { name:"Greater Draught",   icon:"⚗️", rar:"uncommon",  type:"potion",   heal:90,                                  price:70,  desc:"Restores 90 HP." },
  mana_potion:     { name:"Mana Phial",        icon:"🔵", rar:"uncommon",  type:"potion",   mana:50,                                  price:35,  desc:"Restores 50 mana." },
  bread:           { name:"Hearth Bread",      icon:"🍞", rar:"common",    type:"potion",   heal:18,                                  price:8,   desc:"Restores 18 HP." },
  corrupt_shard:   { name:"Corruption Shard",  icon:"🟪", rar:"rare",      type:"material",                                          price:40,  desc:"A splinter of the Hollow King's spread." },
  herb:            { name:"Glowmoss Herb",     icon:"🌿", rar:"common",    type:"material",                                          price:6,   desc:"Used by alchemists." },
  wolf_pelt:       { name:"Wolf Pelt",         icon:"🐺", rar:"common",    type:"material",                                          price:12,  desc:"Thick grey fur." },
  bandit_badge:    { name:"Bandit Badge",      icon:"⚠️", rar:"uncommon",  type:"material",                                          price:18,  desc:"Proof of a rogue dispatched." },
  bone_fragment:   { name:"Bone Fragment",     icon:"🦴", rar:"common",    type:"material",                                          price:8,   desc:"Crumbled skeleton remains." },
  treant_heart:    { name:"Treant Heartwood",  icon:"🪵", rar:"epic",      type:"material",                                          price:200, desc:"The core of a Thornheart Treant." },
  relic_frag:      { name:"Heartstone Fragment", icon:"💎", rar:"legendary", type:"quest",                                           price:0,   desc:"A shard of the cracking Heartstone." },
  earth_relic:     { name:"Earth Relic",       icon:"🌍", rar:"legendary", type:"quest",                                            price:0,   desc:"One of the Four Relics. The land itself thrums through it." },
  ember_blade:     { name:"Emberbrand Sword",   icon:"🔥", rar:"epic",      type:"weapon",  slot:"weapon",  atk:38, str:5,            price:560, desc:"Forged in volcanic stone. Burns on contact." },
  obsidian_plate:  { name:"Obsidian Plate",      icon:"🛡️", rar:"epic",      type:"armor",   slot:"chest",   col:0x2a2230, def:28, maxHp:25,          price:620, desc:"Volcanic glass armour, near-impervious." },
  bronze_helm:     { name:"Bronze Helm",        icon:"🪖", rar:"common",    type:"armor",    slot:"helmet",   col:0xb87a3a, def:5,  str:1,            price:60,  desc:"Burnished bronze, dented but proud." },
  verdant_plate:   { name:"Verdant Plate",      icon:"🛡️", rar:"rare",      type:"armor",    slot:"chest",    col:0x3a8a52, def:20, dex:3, maxHp:15,  price:430, desc:"Living bark hardened to steel." },
  crimson_helm:    { name:"Crimson Warhelm",    icon:"🪖", rar:"epic",      type:"armor",    slot:"helmet",   col:0x9a2a22, crest:0xffaa33, def:14, str:4, maxHp:12, price:520, desc:"A red-plumed helm of the old guard." },
  gilded_plate:    { name:"Gilded Cuirass",     icon:"🛡️", rar:"legendary", type:"armor",    slot:"chest",    col:0xd4af37, def:34, str:5, maxHp:30,  price:1500, desc:"Gold-chased warden plate that turns blades." },
  lava_ring:       { name:"Lava Band",            icon:"🔴", rar:"rare",      type:"armor",   slot:"ring1",   str:6,  def:4,             price:320, desc:"Still warm from the forge-pits of Emberveil." },
  flame_relic:     { name:"Flame Relic",          icon:"🔥", rar:"legendary", type:"quest",                                             price:0,   desc:"One of the Four Relics. Burns with ancient purpose." },
  storm_relic:     { name:"Storm Relic",          icon:"⚡", rar:"legendary", type:"quest",                                             price:0,   desc:"The last of the Four Relics. Crackling with caged thunder." },
  tempest_glaive:  { name:"Tempest Glaive",       icon:"⚡", rar:"legendary", type:"weapon", slot:"weapon", dmg:60, dex:6, str:6, maxMana:20, price:1800, desc:"A storm-forged blade that hums with lightning." },
  stormcaller_staff:{name:"Stormcaller Staff",    icon:"🌩️", rar:"legendary", type:"weapon", slot:"weapon", dmg:48, int:12, maxMana:50, price:1800, desc:"Calls the sky's wrath down upon foes." },
  storm_plate:     { name:"Tempest Plate",        icon:"🛡️", rar:"legendary", type:"armor",  slot:"chest",  col:0x4a6a9a, def:32, dex:4, maxHp:30, price:1500, desc:"Warden plate humming with static." },
  storm_helm:      { name:"Galecrown Helm",       icon:"🪖", rar:"epic",      type:"armor",  slot:"helmet", col:0x5a7ab0, crest:0x66ddff, def:16, dex:3, maxMana:15, price:560, desc:"Crowned with a crackling blue plume." },
  storm_ring:      { name:"Thunder Signet",       icon:"💠", rar:"epic",      type:"armor",  slot:"ring",   dex:6, int:4, maxMana:20, price:680, desc:"A ring that tingles before the storm." },
    frost_relic:     { name:"Frost Relic",       icon:"❄️", rar:"legendary", type:"quest",                                            price:0,   desc:"One of the Four Relics. Cold and patient as a glacier." },
  frost_blade:     { name:"Frostbite Edge",    icon:"🗡️", rar:"rare",      type:"weapon",   slot:"weapon",   dmg:34, str:4, int:4, price:520, desc:"Its edge never warms; wounds it makes go numb." },
  rime_plate:      { name:"Rimeguard Plate",   icon:"🛡️", rar:"rare",      type:"armor",    slot:"chest",    col:0xaad0e6, def:22, str:3, maxHp:20, price:480, desc:"Hoarfrost-tempered steel from Ironpeak." },
  frost_helm:      { name:"Glacier Helm",      icon:"🪖", rar:"rare",      type:"armor",    slot:"helmet",   col:0xaad0e6, crest:0x66e0ff, def:12, str:2, maxHp:10, price:300, desc:"Carved to shed snow and blows alike." },
  titan_ring:      { name:"Titan's Signet",    icon:"💠", rar:"epic",      type:"armor",    slot:"ring",     str:5, def:3, maxHp:25, price:640, desc:"Pried from a Frost Titan's frozen hand." },
  frost_shard:     { name:"Frost Shard",       icon:"🔹", rar:"uncommon",  type:"material",                                          price:30,  desc:"A sliver of everlasting ice." },
  titan_core:      { name:"Titan Frost-Core",  icon:"🧊", rar:"epic",      type:"material",                                          price:240, desc:"The frozen heart of a Frost Titan." },
};
const SLOTS = ["weapon","helmet","chest","gloves","boots","ring1","ring2","necklace"];
const SLOT_ICON = { weapon:"⚔️", helmet:"⛑️", chest:"🥋", gloves:"🧤", boots:"👢", ring1:"💍", ring2:"💍", necklace:"📿" };
const RAR_COL = { common:"#888", uncommon:"#2f7d3f", rare:"#2f5fd0", epic:"#8a3fd0", legendary:"#c9962e" };

/* ── Default state ── */
const BASE = {
  Warrior: { hp:140, st:100, mana:40,  atk:18, weapon:"iron_sword", baseStr:14, baseDex:8,  baseInt:6,  speed:6.8 },
  Ranger:  { hp:110, st:130, mana:50,  atk:16, weapon:"hunter_bow", baseStr:8,  baseDex:14, baseInt:8,  speed:7.5 },
  Mage:    { hp:90,  st:80,  mana:100, atk:14, weapon:"ash_staff",  baseStr:6,  baseDex:8,  baseInt:16, speed:7.0 },
};
function defaultState(cls, charName="Warden", hairCol=0, skinTone=0) {
  const b = BASE[cls] || BASE.Warrior;
  return {
    cls, charName, hairCol, skinTone,
    level:1, xp:0, xpNext:60,
    maxHp:b.hp, hp:b.hp, maxSt:b.st, st:b.st, maxMana:b.mana, mana:b.mana,
    atk:b.atk, speed:b.speed, baseStr:b.baseStr, baseDex:b.baseDex, baseInt:b.baseInt,
    gold:35,
    equip: { weapon:b.weapon, helmet:null, chest:null, gloves:null, boots:null, ring1:null, ring2:null, necklace:null },
    inv: { potion_minor:2, bread:1 },
    pos: { x:0, z:8 },
    quest: { greeted:false, kills:0, need:5, completed:false, hasEarthRelic:false, hasFrostRelic:false, hasFlameRelic:false, hasStormRelic:false },
    story: { stage:0 },
    sq: { shepherd:{s:0,p:0}, lumber:{s:0,p:0}, wolves:{s:0,p:0}, herbs:{s:0,p:0}, child:{s:0,p:0} },
    dungeonMapUnlocked:false, stonewatch:false,
  };
}
function calcStats(state) {
  const e = state.equip || {};
  let def=0, str=state.baseStr||10, dex=state.baseDex||10, int_=state.baseInt||10;
  let maxHp=state.maxHp, maxMana=state.maxMana||60, maxSt=state.maxSt, weaponDmg=0;
  Object.entries(e).forEach(([slot, k]) => {
    if (!k) return; const it = ITEMS[k]; if (!it) return;
    if (it.def)     def     += it.def;
    if (it.str)     str     += it.str;
    if (it.dex)     dex     += it.dex;
    if (it.int)     int_    += it.int;
    if (it.maxHp)   maxHp   += it.maxHp;
    if (it.maxMana) maxMana += it.maxMana;
    if (slot === "weapon" && it.dmg) weaponDmg = it.dmg;
  });
  return { def, str, dex, int:int_, maxHp, maxMana, maxSt,
           atkTotal: state.atk + weaponDmg + Math.floor(str/5),
           speedMult: 1 + (dex - 10) * .008 };
}

/* ── Helpers ── */
function tH(x, z) { const d=Math.hypot(x,z); return Math.sin(x*.05)*Math.cos(z*.05)*1.5+Math.sin(d*.04)*1.1+(d>110?(d-110)*.22:0); }
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp  = (a,b,t) => a + (b-a)*t;
function lerpAngle(a,b,t) { let d=((b-a+Math.PI)%(Math.PI*2))-Math.PI; if(d<-Math.PI) d+=Math.PI*2; return a+d*t; }
function rarGlow(r) { return {common:0x88ff88,uncommon:0x4488ff,rare:0x8844ff,epic:0xff88ff,legendary:0xffcc44}[r]||0x88ff88; }
function floorAt(g,x,z){ return g.zone==="overworld"?tH(x,z):g.zone==="ironpeak"?tHIron(x,z):g.zone==="ember"?tHEmber(x,z):g.zone==="storm"?tHStorm(x,z):0; }
function tHIron(x,z){ const d=Math.hypot(x,z); return Math.sin(x*.09)*Math.cos(z*.08)*1.8 + Math.sin(d*.05)*1.2 + (d>58?(d-58)*0.6:0); }
function tHStorm(x,z){ const d=Math.hypot(x,z); return Math.sin(x*.07)*Math.cos(z*.075)*2.4 + Math.cos(d*.045)*1.4 + (d>66?(d-66)*0.7:0); }
function zoneGroup(g,z){ return g[z+"Group"] || g.overworldGroup; }
function floorFor(z,x,zz){ return z==="overworld"?tH(x,zz):z==="ironpeak"?tHIron(x,zz):z==="ember"?tHEmber(x,zz):z==="storm"?tHStorm(x,zz):0; }
const F  = { position:"absolute", inset:0 };
const TS = { fontFamily:"Georgia,serif", fontWeight:900, fontSize:22, color:"#5b4326", textAlign:"center", letterSpacing:2, marginBottom:4 };

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function KingdomOfVerandah() {
  const mountRef = useRef(null);
  const G = useRef({});

  const [screen,     setScreen]     = useState("title");
  const [cls,        setCls]        = useState("Warrior");
  const [charName,   setCharName]   = useState("Warden");
  const [hairCol,    setHairCol]    = useState(0);
  const [skinTone,   setSkinTone]   = useState(0);
  const [hasSave,    setHasSave]    = useState(() => Store.has(SAVE));
  const [ui,         setUi]         = useState({ hp:100,maxHp:100,st:100,maxSt:100,mana:40,maxMana:40,xp:0,xpNext:60,level:1,gold:35 });
  const [dlg,        setDlg]        = useState(null);
  const [overlay,    setOverlay]    = useState(null);
  const [toasts,     setToasts]     = useState([]);
  const [questTrack, setQuestTrack] = useState(null);
  const [prompt,     setPrompt]     = useState(null);
  const [zone,       setZone]       = useState("overworld");
  const [shop,       setShop]       = useState(null);
  const [boss,       setBoss]       = useState(null);

  const toast = useCallback(msg => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);

  const dlgAdvance = useCallback(() => {
    const d = G.current.dlgState; if (!d) return;
    if (!d.done) { G.current.dlgForceFinish = true; return; }
    if (d.choices) { const c = d.choices[d.sel||0]; if(c?.action) c.action(); if(c?.next) G.current.dlgGo(c.next); else G.current.dlgClose(); }
    else if (d.next) G.current.dlgGo(d.next);
    else G.current.dlgClose();
  }, []);

  const closeOverlay = useCallback(() => { setOverlay(null); G.current.paused = false; }, []);
  const openOverlay  = useCallback(id => { setOverlay(id); G.current.paused = true; }, []);

  /* ── Three.js engine ── */
  useEffect(() => {
    if (screen !== "game") return;
    const mount = mountRef.current; if (!mount) return;
    const g = G.current, state = g.saveState;

    const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:"high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fc7e8);
    scene.fog = new THREE.FogExp2(0x9fc7e8, .012);
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth/mount.clientHeight, .1, 800);

    const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x4a6b3f, .9); scene.add(hemi);
    const sun  = new THREE.DirectionalLight(0xfff2d6, 1.1);
    sun.position.set(40,70,30); sun.castShadow = true;
    sun.shadow.mapSize.set(1024,1024);
    Object.assign(sun.shadow.camera, {left:-70,right:70,top:70,bottom:-70,near:1,far:220});
    sun.shadow.bias = -.0006; scene.add(sun);

    Object.assign(g, { renderer, scene, camera, sun, hemi,
      enemies:[], pickups:[], npcs:[], props:[], trees:[], sparks:[], chests:[], projectiles:[],
      dmgNums:[], paused:false, zone:"overworld",
      input:{ f:0,b:0,l:0,r:0, yaw:Math.PI, pitch:.35 },
      touchMove:{ x:0, y:0 }, camDist:7, time:.3,
      attacking:false, attackTimer:0, attackHit:false, attackHeavy:false,
      blocking:false, rollTimer:0, invuln:0, grounded:true, pVel:new THREE.Vector3(),
      dlgState:null, dlgForceFinish:false,
      setUi, toast, setZone, setQuestTrack, setBoss,
    });
    g.openShop = (npc) => { g.paused=true; setShop(npc); };

    g.overworldGroup = new THREE.Group(); scene.add(g.overworldGroup);
    g.dungeonGroup   = new THREE.Group(); scene.add(g.dungeonGroup);   g.dungeonGroup.visible = false;
    g.redoakGroup    = new THREE.Group(); scene.add(g.redoakGroup);    g.redoakGroup.visible = false;
    g.verandahGroup  = new THREE.Group(); scene.add(g.verandahGroup);  g.verandahGroup.visible = false;
    g.ironpeakGroup  = new THREE.Group(); scene.add(g.ironpeakGroup);  g.ironpeakGroup.visible = false;
    g.frostGroup     = new THREE.Group(); scene.add(g.frostGroup);     g.frostGroup.visible    = false;
    g.emberGroup     = new THREE.Group(); scene.add(g.emberGroup);     g.emberGroup.visible    = false;
    g.scorchGroup    = new THREE.Group(); scene.add(g.scorchGroup);    g.scorchGroup.visible   = false;
    g.stormGroup     = new THREE.Group(); scene.add(g.stormGroup);     g.stormGroup.visible    = false;
    g.stormspireGroup= new THREE.Group(); scene.add(g.stormspireGroup);g.stormspireGroup.visible= false;

    buildTerrain(g); buildVillage(g); scatterWorld(g); buildNPCs(g); buildDungeonEntrance(g); buildDungeon(g); buildOverworldExtras(g);
    buildRedOak(g); buildVerandah(g); buildIronpeak(g); buildFrostCavern(g); buildEmber(g); buildScorchdeep(g); buildStorm(g); buildStormspire(g);
    spawnEnemyWave(g); spawnStormEnemies(g); makePlayer(g);

    if (state.pos) g.player.position.set(state.pos.x, tH(state.pos.x, state.pos.z), state.pos.z);
    if (state.quest?.greeted) updateQuestTrack(state, setQuestTrack);
    if (state.stonewatch && g.stonewatch) g.stonewatch.visible = true;

    g.dlgOpen = (tree,id) => { g.dlgTree=tree; g.paused=true; g.dlgGo(id); };
    g.dlgGo   = id => {
      const n = g.dlgTree[id]; if (!n) { g.dlgClose(); return; }
      if (n.onEnter) n.onEnter();
      const full = typeof n.text==="function" ? n.text() : n.text;
      g.dlgState = { speaker:n.speaker, portrait:n.portrait||"✦", full, text:"", done:false, choices:n.choices||null, sel:0, next:n.next||null };
      g.dlgTimer=0; g.dlgForceFinish=false; setDlg({...g.dlgState});
    };
    g.dlgClose = () => { g.dlgState=null; g.paused=false; setDlg(null); const f=g.dlgOnClose; if(f){g.dlgOnClose=null;f();} };
    g.interact = () => { try { doInteract(g, toast, setQuestTrack, setZone); } catch(err){ console.error("interact error",err); } };

    const mmC = document.getElementById("mmcanvas");
    g.mmCtx = mmC ? mmC.getContext("2d") : null;

    let raf, lastT=performance.now(), uiT=0, mmT=0, saveT=0;
    const loop = now => {
      raf = requestAnimationFrame(loop);
      let dt = (now-lastT)/1000; lastT=now; if(dt>.05) dt=.05;

      g.time = (g.time+dt*.004)%1;
      updateSky(g);

      if (!g.paused) { updatePlayer(g,dt,state); updateEnemies(g,dt,state,toast,setQuestTrack); updateProjectiles(g,dt,state,toast); }
      if (!g.paused && g.zone==="dungeon") updateDungeon(g,dt,state,toast);
      updatePickups(g,dt,state,toast,setUi);
      updateSparks(g,dt); updateNPCs(g,dt); updateTrees(g);

      if (g.dlgState && !g.dlgState.done) {
        if (g.dlgForceFinish) { g.dlgForceFinish=false; g.dlgState.text=g.dlgState.full; g.dlgState.done=true; setDlg({...g.dlgState}); }
        else {
          g.dlgTimer=(g.dlgTimer||0)+dt;
          const tgt=Math.floor(g.dlgTimer*44), prev=g.dlgState.text.length;
          if (tgt>prev) {
            if(prev%2===0) SFX.talk();
            g.dlgState.text = g.dlgState.full.slice(0, Math.min(tgt,g.dlgState.full.length));
            if (g.dlgState.text.length >= g.dlgState.full.length) g.dlgState.done=true;
            setDlg({...g.dlgState});
          }
        }
      }

      const cs = calcStats(state);
      if (state.st < state.maxSt && g.rollTimer<=0) state.st = Math.min(state.maxSt, state.st+dt*16);
      if (state.mana < cs.maxMana)                  state.mana = Math.min(cs.maxMana, state.mana+dt*(4+cs.int*.25));
      if (g.invuln>0)    g.invuln    -= dt;
      if (g.rollTimer>0) g.rollTimer -= dt;
      if (g.altarGlow && !state.quest?.hasEarthRelic) g.altarGlow.material.opacity = .5+Math.sin(g.time*300)*.2;

      uiT+=dt; if(uiT>.13){uiT=0; updateHUD(g,setUi); updatePromptUI(g,setPrompt);}
      mmT+=dt; if(mmT>.1){mmT=0;  drawMinimap(g);}
      saveT+=dt; if(saveT>30){saveT=0; saveGame(state,g);}

      updateDmgNums(g, dt, mount);
      updateCamera(g, dt);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    if (!state.quest?.greeted) setTimeout(() => g.dlgOpen?.(spiritTree(state,g,toast,setQuestTrack),"start"), 800);

    const onResize = () => { if(!mount) return; camera.aspect=mount.clientWidth/mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth,mount.clientHeight); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",onResize); renderer.dispose(); if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement); };
  }, [screen]); // eslint-disable-line

  /* ── Input ── */
  useEffect(() => {
    if (screen !== "game") return;
    const g = G.current;
    const kd = e => {
      SFX.resume(); const k=e.code;
      if(k==="KeyW"||k==="ArrowUp")   g.input.f=1;
      if(k==="KeyS"||k==="ArrowDown") g.input.b=1;
      if(k==="KeyA"||k==="ArrowLeft") g.input.l=1;
      if(k==="KeyD"||k==="ArrowRight")g.input.r=1;
      if(k==="Space") { e.preventDefault(); if(g.dlgState) dlgAdvance(); else tryJump(g); }
      if(k==="Enter") { if(g.dlgState) dlgAdvance(); }
      if(k==="KeyE"||k==="KeyF") g.interact?.();
      if(k==="ShiftLeft"||k==="ShiftRight") g.blocking=true;
      if(k==="KeyI") { overlay ? closeOverlay() : openOverlay("inv"); }
      if(k==="KeyJ") { overlay ? closeOverlay() : openOverlay("quest"); }
      if(k==="KeyC") { overlay ? closeOverlay() : openOverlay("char"); }
      if(k==="Escape"){ if(g.dlgState) g.dlgClose(); else if(overlay) closeOverlay(); else openOverlay("pause"); }
    };
    const ku = e => {
      const k=e.code;
      if(k==="KeyW"||k==="ArrowUp")   g.input.f=0;
      if(k==="KeyS"||k==="ArrowDown") g.input.b=0;
      if(k==="KeyA"||k==="ArrowLeft") g.input.l=0;
      if(k==="KeyD"||k==="ArrowRight")g.input.r=0;
      if(k==="ShiftLeft"||k==="ShiftRight") g.blocking=false;
    };
    window.addEventListener("keydown",kd); window.addEventListener("keyup",ku);

    const dom = mountRef.current; if(!dom) return;
    let dragging=false, lx=0, ly=0;
    const md = e => { SFX.resume(); if(e.button===0){dragging=true;lx=e.clientX;ly=e.clientY;} if(e.button===2){e.preventDefault();startHeavyAtk(g,g.saveState,toast);} };
    const mu = e => { if(e.button===0){ if(Math.hypot(e.clientX-lx,e.clientY-ly)<6 && !g.paused && !g.dlgState) startLightAtk(g,g.saveState); dragging=false; } };
    const mm = e => { if(dragging){g.input.yaw-=(e.clientX-lx)*.005;g.input.pitch=clamp(g.input.pitch+(e.clientY-ly)*.005,-.2,1.0);lx=e.clientX;ly=e.clientY;} };
    const wh = e => { g.camDist=clamp(g.camDist+e.deltaY*.01,4,14); };
    dom.addEventListener("mousedown",md); window.addEventListener("mouseup",mu); window.addEventListener("mousemove",mm); window.addEventListener("wheel",wh,{passive:true}); dom.addEventListener("contextmenu",e=>e.preventDefault());
    return () => {
      window.removeEventListener("keydown",kd); window.removeEventListener("keyup",ku);
      window.removeEventListener("mouseup",mu); window.removeEventListener("mousemove",mm);
      dom.removeEventListener("mousedown",md); dom.removeEventListener("wheel",wh);
    };
  }, [screen, overlay, dlgAdvance, toast, closeOverlay, openOverlay]); // eslint-disable-line

  const beginGame = useCallback(fromSave => {
    SFX.resume();
    let st;
    if (fromSave) { try { st=JSON.parse(Store.get(SAVE)); } catch(e) { st=defaultState("Warrior"); } }
    else st = defaultState(cls, charName, hairCol, skinTone);
    if (!st.equip)   st.equip = { weapon:st.weapon||"iron_sword",helmet:null,chest:null,gloves:null,boots:null,ring1:null,ring2:null,necklace:null };
    if (st.baseStr==null) st.baseStr=10; if (st.baseDex==null) st.baseDex=10; if (st.baseInt==null) st.baseInt=10;
    if (st.maxMana==null) st.maxMana=60; if (st.mana==null) st.mana=60;
    if (!st.story) st.story={stage:0};
    if (!st.sq) st.sq={}; ["shepherd","lumber","wolves","herbs","child"].forEach(k=>{ if(!st.sq[k]) st.sq[k]={s:0,p:0}; });
    if (st.dungeonMapUnlocked===undefined) st.dungeonMapUnlocked=false;
    if (st.stonewatch===undefined) st.stonewatch=false;
    if (st.quest?.hasFrostRelic===undefined || st.quest?.hasFlameRelic===undefined) { st.quest=st.quest||{}; st.quest.hasFrostRelic=st.quest.hasFrostRelic||false; st.quest.hasFlameRelic=false; }
    if (st.quest && st.quest.hasFrostRelic==null) st.quest.hasFrostRelic=false;
    if (st.quest && st.quest.hasStormRelic==null) st.quest.hasStormRelic=false;
    G.current.saveState = st;
    setScreen("game");
  }, [cls, charName, hairCol, skinTone]);

  /* ── Title ── */
  if (screen==="title") return (
    <div style={{...F,background:"radial-gradient(ellipse at 50% 18%,rgba(201,150,46,.22),transparent 60%),linear-gradient(180deg,#0d1422,#1a2438 40%,#243a2e)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"serif"}}>
      <div style={{fontSize:68,marginBottom:6,filter:"drop-shadow(0 6px 14px #0008)"}}>⚜️</div>
      <h1 style={{fontFamily:"Georgia,serif",fontWeight:900,fontSize:48,color:"#f0c659",textShadow:"0 3px 0 #6b4a13,0 8px 28px #0009",letterSpacing:3,textAlign:"center",lineHeight:1.1}}>Kingdom of<br/>Verandah</h1>
      <p style={{color:"#cdb98a",letterSpacing:6,fontSize:12,marginTop:10,marginBottom:28,textTransform:"uppercase"}}>Keeper of the Four Relics</p>
      <div style={{display:"flex",flexDirection:"column",gap:10,width:280}}>
        <Btn gold onClick={()=>setScreen("create")}>New Game</Btn>
        <Btn onClick={()=>beginGame(true)} style={{opacity:hasSave?1:.4}}>Continue</Btn>
      </div>
      <p style={{position:"absolute",bottom:14,fontSize:11,color:"#555",letterSpacing:2}}>MILESTONE 2 · CORE RPG FOUNDATION</p>
    </div>
  );

  if (screen==="create") {
    const HAIR_COLS=[
      {label:"Dark",    hex:"#2c1e14", val:0x2c1e14},
      {label:"Brown",   hex:"#6b3c18", val:0x6b3c18},
      {label:"Blonde",  hex:"#c8a23a", val:0xc8a23a},
      {label:"Auburn",  hex:"#7a2e12", val:0x7a2e12},
      {label:"Grey",    hex:"#8a8a8a", val:0x8a8a8a},
      {label:"White",   hex:"#e8e8e0", val:0xe8e8e0},
    ];
    const SKIN_TONES=[
      {label:"Fair",   hex:"#f4d4b0", val:0xf4d4b0},
      {label:"Warm",   hex:"#e8b896", val:0xe8b896},
      {label:"Tan",    hex:"#c8945a", val:0xc8945a},
      {label:"Brown",  hex:"#8b5e3c", val:0x8b5e3c},
      {label:"Deep",   hex:"#4a2f1e", val:0x4a2f1e},
    ];
    const CLASS_INFO={
      Warrior:{icon:"⚔️",desc:"STR 14 · High HP · Melee tank",color:"#e07a3a"},
      Ranger: {icon:"🏹",desc:"DEX 14 · High Stamina · Swift",color:"#5a9a3a"},
      Mage:   {icon:"🔮",desc:"INT 16 · High Mana · Arcane power",color:"#8844cc"},
    };
    const BG="radial-gradient(ellipse at 50% 10%,rgba(201,150,46,.18),transparent 55%),linear-gradient(180deg,#0d1422,#1a2438 45%,#1e2e20)";
    const SL=(label,options,sel,onSel)=>(
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:"#8a7040",letterSpacing:3,textTransform:"uppercase",marginBottom:7}}>{label}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {options.map((o,i)=>(
            <div key={i} onPointerDown={()=>onSel(i)}
              style={{cursor:"pointer",borderRadius:6,padding:"5px 11px",border:`2px solid ${sel===i?"#f0c659":"#3a2c18"}`,
                background:sel===i?"rgba(201,150,46,.18)":"rgba(10,8,4,.5)",
                color:sel===i?"#f0c659":"#9a7a4a",fontSize:12,transition:"all .15s",
                ...(o.hex?{display:"flex",alignItems:"center",gap:5}:{})}}>
              {o.hex && <span style={{width:12,height:12,borderRadius:"50%",background:o.hex,border:"1px solid #0004",flexShrink:0,display:"inline-block"}}/>}
              {o.label}
            </div>
          ))}
        </div>
      </div>
    );
    return (
      <div style={{background:BG,width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
        <div style={{width:"min(96vw,460px)",maxHeight:"92vh",overflowY:"auto",background:"rgba(12,9,4,.88)",border:"2px solid #5b4326",borderRadius:14,padding:"20px 18px",boxShadow:"0 8px 40px #0009"}}>
          <h2 style={{...TS,marginBottom:2,fontSize:26}}>Create Your Warden</h2>
          <p style={{textAlign:"center",color:"#6b5030",fontSize:11,letterSpacing:3,textTransform:"uppercase",marginBottom:18}}>Kingdom of Verandah</p>

          {/* Name */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:"#8a7040",letterSpacing:3,textTransform:"uppercase",marginBottom:7}}>Name</div>
            <input value={charName} onChange={e=>setCharName(e.target.value.slice(0,18))}
              placeholder="Enter name…"
              style={{width:"100%",background:"rgba(20,14,4,.7)",border:"2px solid #5b4326",borderRadius:7,padding:"9px 13px",
                color:"#f0c659",fontFamily:"Georgia,serif",fontSize:16,outline:"none",boxSizing:"border-box",
                caretColor:"#f0c659"}}/>
          </div>

          {/* Class */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#8a7040",letterSpacing:3,textTransform:"uppercase",marginBottom:7}}>Class</div>
            {Object.entries(CLASS_INFO).map(([c,info])=>(
              <div key={c} onPointerDown={()=>setCls(c)}
                style={{cursor:"pointer",border:`2px solid ${cls===c?info.color:"#3a2c18"}`,borderRadius:8,padding:"10px 13px",marginBottom:7,
                  background:cls===c?"rgba(201,150,46,.12)":"rgba(12,9,4,.5)",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>{info.icon}</span>
                <div>
                  <div style={{fontWeight:700,color:cls===c?info.color:"#c8a070",fontSize:15}}>{c}</div>
                  <div style={{fontSize:11,color:"#8a6a40",marginTop:1}}>{info.desc}</div>
                </div>
                {cls===c && <span style={{marginLeft:"auto",color:info.color,fontSize:18}}>✓</span>}
              </div>
            ))}
          </div>

          {SL("Skin Tone", SKIN_TONES, skinTone, setSkinTone)}
          {SL("Hair Colour", HAIR_COLS, hairCol, setHairCol)}

          <div style={{display:"flex",gap:10,marginTop:8}}>
            <Btn gold onClick={()=>beginGame(false)} style={{flex:2}}>Begin Journey</Btn>
            <Btn onClick={()=>setScreen("title")} style={{flex:1}}>Back</Btn>
          </div>
        </div>
      </div>
    );
  }

  if (screen==="classpick") return (
    <div style={{background:"radial-gradient(ellipse at 50% 18%,rgba(201,150,46,.22),transparent 60%),linear-gradient(180deg,#0d1422,#1a2438 40%,#243a2e)",width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Panel style={{width:"min(94vw,440px)",padding:"22px 20px"}}>
        <h2 style={TS}>Choose Your Path</h2>
        {Object.keys(BASE).map(c=>(
          <div key={c} onPointerDown={()=>setCls(c)} style={{cursor:"pointer",border:`2px solid ${cls===c?"#f0c659":"#5b4326"}`,borderRadius:8,padding:"10px 14px",marginBottom:8,background:cls===c?"rgba(201,150,46,.15)":"rgba(20,16,8,.4)"}}>
            <div style={{fontFamily:"Georgia",fontWeight:700,color:"#f0c659",fontSize:16,marginBottom:2}}>{c==="Warrior"?"⚔️":c==="Ranger"?"🏹":"🔥"} {c}</div>
            <div style={{fontSize:12,color:"#cdb98a"}}>{c==="Warrior"?"STR 14 · High HP · Melee tank":c==="Ranger"?"DEX 14 · High Stamina · Swift":"INT 16 · High Mana · Arcane power"}</div>
          </div>
        ))}
        <div style={{display:"flex",gap:10,marginTop:6}}>
          <Btn gold onClick={()=>beginGame(false)} style={{flex:1}}>Begin Journey</Btn>
          <Btn onClick={()=>setScreen("title")} style={{flex:1}}>Back</Btn>
        </div>
      </Panel>
    </div>
  );

  /* ── Game ── */
  const W = typeof window!=="undefined" ? window.innerWidth : 800;
  const H = typeof window!=="undefined" ? window.innerHeight : 600;
  return (
    <div style={{...F,overflow:"hidden"}}>
      <div ref={mountRef} style={{...F,cursor:"crosshair"}}/>
      <canvas id="dmgcanvas" width={W} height={H} style={{...F,pointerEvents:"none",zIndex:22}}/>

      <div style={{...F,pointerEvents:"none",zIndex:20}}>
        <div style={{position:"absolute",top:12,left:12,width:"min(46vw,248px)"}}>
          <Bar color="linear-gradient(90deg,#7d1f17,#d6452f)" pct={ui.hp/ui.maxHp}     label={`${Math.ceil(ui.hp)}/${ui.maxHp} HP`}/>
          <Bar color="linear-gradient(90deg,#256b3a,#5fc079)" pct={ui.st/ui.maxSt}/>
          <Bar color="linear-gradient(90deg,#1a3d7a,#4a7fdb)" pct={ui.mana/ui.maxMana} label={`${Math.ceil(ui.mana)}/${ui.maxMana} MP`}/>
          <Bar color="linear-gradient(90deg,#8a6312,#f0c659)" pct={ui.xp/ui.xpNext} h={8}/>
          <div style={{color:"#f0c659",fontFamily:"Georgia",fontWeight:700,fontSize:13,marginTop:2,textShadow:"0 1px 3px #000"}}>Lv {ui.level} &nbsp;◈ {ui.gold} &nbsp;<span style={{color:"#c8a870",fontWeight:400,fontSize:11}}>{G.current.saveState?.charName||""}</span></div>
        </div>
        <div style={{position:"absolute",top:12,right:12,width:112,height:112,borderRadius:"50%",border:"3px solid #5b4326",boxShadow:"0 0 0 2px #c9962e inset,0 6px 18px #0008",overflow:"hidden",background:"#12331f"}}>
          <canvas id="mmcanvas" width={160} height={160} style={{width:"100%",height:"100%"}}/>
        </div>
        {questTrack && (
          <div style={{position:"absolute",top:136,right:12,width:"min(52vw,210px)",background:"rgba(26,18,8,.78)",border:"2px solid #c9962e",borderRadius:8,padding:"7px 10px",fontSize:12,lineHeight:1.4}}>
            <b style={{fontFamily:"Georgia",color:"#f0c659",display:"block",fontSize:10,letterSpacing:2,marginBottom:2}}>QUEST</b>
            <span style={{color:"#efe2c2"}}>{questTrack}</span>
          </div>
        )}
        {zone==="dungeon" && <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",background:"rgba(10,6,2,.85)",border:"2px solid #c9962e",borderRadius:20,padding:"5px 16px",color:"#f0c659",fontFamily:"Georgia",fontSize:12,letterSpacing:2}}>⛩ ANCIENT ROOT TEMPLE</div>}
        {boss && (
          <div style={{position:"absolute",top:46,left:"50%",transform:"translateX(-50%)",width:"min(86vw,520px)",zIndex:41,textAlign:"center"}}>
            <div style={{color:"#e8d8b0",fontFamily:"Georgia",fontSize:14,letterSpacing:2,textShadow:"0 1px 3px #000",marginBottom:3}}>🌳 {boss.name}</div>
            <div style={{height:14,background:"rgba(10,6,2,.8)",border:"2px solid #6a3a2a",borderRadius:8,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.max(0,Math.min(100,boss.hp/boss.max*100))}%`,background:"linear-gradient(90deg,#8a2a1a,#cc4422)",transition:"width .15s"}}/>
            </div>
          </div>
        )}
        {zone==="frost" && <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",background:"rgba(4,10,18,.85)",border:"2px solid #44aaee",borderRadius:20,padding:"5px 16px",color:"#88ddff",fontFamily:"Georgia",fontSize:12,letterSpacing:2}}>❄ FROSTFANG CAVERN</div>}
        {zone==="scorch" && <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",background:"rgba(18,4,2,.85)",border:"2px solid #ff6600",borderRadius:20,padding:"5px 16px",color:"#ffaa44",fontFamily:"Georgia",fontSize:12,letterSpacing:2}}>🔥 SCORCHDEEP CAVERN</div>}
        {prompt && !dlg && (
          <div onPointerDown={e=>{e.preventDefault();G.current.interact?.();}} style={{position:"absolute",left:"50%",bottom:"32%",transform:"translateX(-50%)",background:"rgba(26,18,8,.92)",border:"2px solid #c9962e",borderRadius:30,padding:"10px 22px",fontFamily:"Georgia",fontSize:14,color:"#f0c659",whiteSpace:"nowrap",boxShadow:"0 4px 14px #0008",pointerEvents:"auto",cursor:"pointer",touchAction:"none"}}>
            <span style={{background:"#c9962e",color:"#1a1206",borderRadius:4,padding:"1px 7px",marginRight:6,fontWeight:700}}>✦</span>{prompt}
          </div>
        )}
        <div style={{position:"absolute",left:"50%",top:"16%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
          {toasts.map(t=><div key={t.id} style={{background:"rgba(26,18,8,.92)",border:"1px solid #c9962e",borderLeft:"4px solid #f0c659",borderRadius:6,padding:"7px 16px",fontSize:13,color:"#efe2c2",fontFamily:"Georgia",animation:"tIn .3s",whiteSpace:"nowrap"}}>{t.msg}</div>)}
        </div>
      </div>

      <div style={{position:"absolute",top:140,left:12,zIndex:23,display:"flex",gap:8}}>
        {[["🎒","inv"],["📜","quest"],["☰","pause"]].map(([ic,id])=>(
          <div key={id} onClick={()=>{ overlay ? closeOverlay() : openOverlay(id); }} style={{width:40,height:40,borderRadius:8,background:"rgba(26,18,8,.76)",border:"2px solid #c9962e",color:"#f0c659",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:17}}>{ic}</div>
        ))}
      </div>

      <TouchCtrl G={G} toast={toast} setQuestTrack={setQuestTrack} setZone={setZone} dlgAdvance={dlgAdvance}/>

      {dlg && (
        <div style={{position:"absolute",left:"50%",bottom:16,transform:"translateX(-50%)",width:"min(94vw,700px)",zIndex:40,pointerEvents:"auto",touchAction:"none"}} onPointerDown={e=>{e.preventDefault();dlgAdvance();}}>
          <Panel style={{display:"flex",gap:14,padding:"14px 16px 12px"}}>
            <div style={{flexShrink:0,width:80,height:80,borderRadius:8,border:"2px solid #5b4326",boxShadow:"0 0 0 2px #c9962e inset",background:"radial-gradient(circle at 50% 35%,#bfe3ff,#5d8fd6 60%,#2a4f8a)",display:"flex",alignItems:"flex-end",justifyContent:"center",fontSize:48,lineHeight:1}}>{dlg.portrait}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"Georgia",fontWeight:700,color:"#a23b2c",fontSize:15,marginBottom:3}}>{dlg.speaker}</div>
              <div style={{fontSize:15,lineHeight:1.45,color:"#241a10",minHeight:"3em"}}>{dlg.text}{!dlg.done&&<span style={{color:"#c9962e",animation:"bl .6s steps(1) infinite"}}>▌</span>}</div>
              {dlg.done && dlg.choices && (
                <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:8}}>
                  {dlg.choices.map((c,i)=><div key={i} onPointerDown={e=>{e.preventDefault();e.stopPropagation();if(G.current.dlgState)G.current.dlgState.sel=i;dlgAdvance();}} style={{cursor:"pointer",border:`2px solid ${i===dlg.sel?"#f0c659":"#5b4326"}`,borderRadius:6,padding:"6px 12px",fontSize:13,color:"#241a10",background:i===dlg.sel?"#f0c659":"rgba(91,67,38,.08)"}}>{c.label}</div>)}
                </div>
              )}
              {dlg.done && !dlg.choices && <div style={{textAlign:"right",fontSize:11,color:"#7a5e2e",marginTop:6}}>▼ tap / space</div>}
            </div>
          </Panel>
        </div>
      )}

      {overlay && (
        <div style={{...F,zIndex:60,background:"rgba(6,5,3,.65)",backdropFilter:"blur(2px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)closeOverlay();}}>
          <Panel style={{width:"min(94vw,600px)",maxHeight:"88vh",overflowY:"auto",padding:"20px 20px 16px"}}>
            {overlay==="inv"   && <InvOverlay state={G.current.saveState} G={G} toast={toast} setUi={setUi}/>}
            {overlay==="quest" && <QuestOvl   state={G.current.saveState}/>}
            {overlay==="char"  && <CharOvl    state={G.current.saveState}/>}
            {overlay==="pause" && <PauseOvl   G={G} toast={toast} setHasSave={setHasSave} close={closeOverlay} goTitle={()=>{saveGame(G.current.saveState,G.current);setScreen("title");}} openChar={()=>setOverlay("char")}/>}
            <Btn onClick={closeOverlay} style={{marginTop:10,width:"100%"}}>Close</Btn>
          </Panel>
        </div>
      )}

      {shop && (
        <div style={{...F,zIndex:62,background:"rgba(6,5,3,.65)",backdropFilter:"blur(2px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget){setShop(null);G.current.paused=false;}}}>
          <Panel style={{width:"min(94vw,620px)",maxHeight:"88vh",overflowY:"auto",padding:"20px 20px 16px"}}>
            <ShopOverlay shop={shop} state={G.current.saveState} G={G} toast={toast} setUi={setUi}/>
            <Btn onClick={()=>{setShop(null);G.current.paused=false;}} style={{marginTop:10,width:"100%"}}>Leave</Btn>
          </Panel>
        </div>
      )}

      <style>{`@keyframes tIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1}} @keyframes bl{50%{opacity:0}}`}</style>
    </div>
  );
}

/* ── UI primitives ── */
function Panel({children,style}) {
  return <div style={{background:"linear-gradient(180deg,#efe2c2,#e6d4a8)",border:"3px solid #5b4326",borderRadius:10,boxShadow:"0 0 0 2px #c9962e inset,0 14px 40px rgba(0,0,0,.55)",...style}}>{children}</div>;
}
function Btn({children,gold,onClick,style}) {
  return <button onClick={onClick} style={{display:"block",width:"100%",textAlign:"center",cursor:"pointer",background:gold?"linear-gradient(180deg,#6e5226,#503a1b)":"linear-gradient(180deg,#9a8a6c,#7d6e52)",color:"#efe2c2",border:`2px solid ${gold?"#c9962e":"#5b4326"}`,borderRadius:8,padding:"11px",fontFamily:"Georgia,serif",fontSize:15,letterSpacing:1,marginBottom:6,boxShadow:"0 3px 0 #2c1f0e",...style}}>{children}</button>;
}
function Bar({color,pct,label,h=14}) {
  return <div style={{height:h,border:"2px solid #2a1d0e",borderRadius:9,background:"rgba(20,12,4,.55)",overflow:"hidden",marginBottom:5,position:"relative",boxShadow:"0 2px 6px #0006"}}>
    <div style={{height:"100%",width:`${clamp(pct||0,0,1)*100}%`,background:color,transition:"width .18s ease"}}/>
    {label&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",textShadow:"0 1px 2px #000",fontFamily:"Georgia"}}>{label}</span>}
  </div>;
}

/* ── Touch controls ── */
function TouchButton({label,onFire,r,b,sz=80,bg="rgba(162,59,44,.72)"}){
  const ref=useRef(null);
  const fnRef=useRef(onFire); fnRef.current=onFire;
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const h=e=>{ e.preventDefault(); e.stopPropagation(); SFX.resume(); fnRef.current(); };
    el.addEventListener("pointerdown",h,{passive:false});
    return ()=>el.removeEventListener("pointerdown",h);
  },[]);
  return <div ref={ref} style={{position:"absolute",right:r,bottom:b,width:sz,height:sz,borderRadius:"50%",background:bg,border:"2px solid rgba(255,255,255,.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*.32,color:"#fff",userSelect:"none",WebkitUserSelect:"none",touchAction:"none",cursor:"pointer",pointerEvents:"auto",WebkitTapHighlightColor:"transparent",zIndex:45}}>{label}</div>;
}
function TouchCtrl({G, toast, setQuestTrack, setZone, dlgAdvance}) {
  const jR=useRef(null), nR=useRef(null);
  useEffect(()=>{
    const g=G.current, joy=jR.current, nub=nR.current; if(!joy||!nub) return;
    let jId=null,jCx=0,jCy=0;
    const ts=e=>{e.preventDefault();SFX.resume();const t=e.changedTouches[0];jId=t.identifier;const r=joy.getBoundingClientRect();jCx=r.left+r.width/2;jCy=r.top+r.height/2;};
    const tm=e=>{e.preventDefault();for(const t of e.changedTouches){if(t.identifier===jId){let dx=t.clientX-jCx,dy=t.clientY-jCy;const mx=46,l=Math.hypot(dx,dy);if(l>mx){dx=dx/l*mx;dy=dy/l*mx;}nub.style.transform=`translate(${dx}px,${dy}px)`;g.touchMove.x=dx/mx;g.touchMove.y=dy/mx;}}};
    const te=e=>{for(const t of e.changedTouches){if(t.identifier===jId){jId=null;nub.style.transform="";g.touchMove.x=0;g.touchMove.y=0;}} if(e.touches.length===0){jId=null;nub.style.transform="";g.touchMove.x=0;g.touchMove.y=0;}};
    joy.addEventListener("touchstart",ts,{passive:false});joy.addEventListener("touchmove",tm,{passive:false});joy.addEventListener("touchend",te);joy.addEventListener("touchcancel",te);
    let cId=null,cX=0,cY=0;
    const cs=e=>{for(const t of e.changedTouches){if(t.clientX>window.innerWidth*.45&&cId===null){cId=t.identifier;cX=t.clientX;cY=t.clientY;}}};
    const cm=e=>{for(const t of e.changedTouches){if(t.identifier===cId){g.input.yaw-=(t.clientX-cX)*.006;g.input.pitch=clamp(g.input.pitch+(t.clientY-cY)*.006,-.2,1.0);cX=t.clientX;cY=t.clientY;}}};
    const ce=e=>{for(const t of e.changedTouches){if(t.identifier===cId)cId=null;} if(e.touches.length===0)cId=null;};
    window.addEventListener("touchstart",cs,{passive:true});window.addEventListener("touchmove",cm,{passive:true});window.addEventListener("touchend",ce);window.addEventListener("touchcancel",ce);
    return()=>{joy.removeEventListener("touchstart",ts);joy.removeEventListener("touchmove",tm);joy.removeEventListener("touchend",te);joy.removeEventListener("touchcancel",te);window.removeEventListener("touchstart",cs);window.removeEventListener("touchmove",cm);window.removeEventListener("touchend",ce);window.removeEventListener("touchcancel",ce);};
  },[G]);
  const tb=(label,fn,r,b,sz=80,bg="rgba(162,59,44,.72)")=>(
    <TouchButton label={label} onFire={fn} r={r} b={b} sz={sz} bg={bg}/>
  );
  const g=G.current;
  return (
    <div style={{...F,pointerEvents:"none",zIndex:30}}>
      <div ref={jR} style={{position:"absolute",left:22,bottom:32,width:120,height:120,borderRadius:"50%",background:"rgba(20,14,6,.3)",border:"2px solid rgba(201,150,46,.5)",pointerEvents:"auto",touchAction:"none"}}>
        <div ref={nR} style={{position:"absolute",left:"50%",top:"50%",width:52,height:52,margin:"-26px 0 0 -26px",borderRadius:"50%",background:"rgba(201,150,46,.65)",border:"2px solid rgba(255,255,255,.4)"}}/>
      </div>
      {tb("⚔",()=>startLightAtk(g,g.saveState), 24,40,88)}
      {tb("💥",()=>startHeavyAtk(g,g.saveState,toast),122,34,64,"rgba(110,28,10,.8)")}
      {tb("✦",()=>g.interact?.(),118,112,62,"rgba(63,125,84,.72)")}
      {tb("⤒",()=>{ if(g.dlgState) dlgAdvance(); else tryJump(g); },36,138,58,"rgba(60,80,120,.72)")}
    </div>
  );
}

/* ── Inventory overlay ── */
function InvOverlay({state, G, toast, setUi}) {
  const [sel, setSel] = useState(null);
  const [, force] = useState(0);
  const redraw = () => force(n => n+1);

  const equipItem = k => {
    const it = ITEMS[k]; if (!it || (it.type!=="weapon" && it.type!=="armor")) return;
    let slot = it.slot;
    if (slot==="ring") slot = state.equip.ring1 ? (state.equip.ring2 ? "ring1" : "ring2") : "ring1";
    const prev = state.equip[slot];
    if (prev) state.inv[prev] = (state.inv[prev]||0)+1;
    state.equip[slot] = k;
    state.inv[k]--; if (!state.inv[k]) delete state.inv[k];
    SFX.pickup(); toast(`Equipped ${it.name}`); setSel(null); redraw(); updateHUD(G.current, setUi); updatePlayerArmor(G.current, state);
  };
  const unequip = slot => {
    const k = state.equip[slot]; if (!k) return;
    state.inv[k] = (state.inv[k]||0)+1; state.equip[slot] = null;
    SFX.pickup(); toast(`Unequipped ${ITEMS[k]?.name}`); redraw(); updateHUD(G.current, setUi); updatePlayerArmor(G.current, state);
  };
  const useItem = k => {
    const it = ITEMS[k]; if (!it || it.type!=="potion") return;
    if (it.heal) { if (state.hp>=state.maxHp){toast("Already at full HP");return;} state.hp=Math.min(state.maxHp,state.hp+it.heal); toast(`+${it.heal} HP`); }
    if (it.mana) { const cs=calcStats(state); if(state.mana>=cs.maxMana){toast("Mana already full");return;} state.mana=Math.min(cs.maxMana,state.mana+it.mana); toast(`+${it.mana} Mana`); }
    state.inv[k]--; if (!state.inv[k]) delete state.inv[k];
    SFX.pickup(); redraw(); updateHUD(G.current, setUi);
  };

  const si = sel ? ITEMS[sel] : null;
  return <>
    <h2 style={TS}>Equipment & Satchel</h2>
    <p style={{textAlign:"center",color:"#7a5e2e",fontSize:11,letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>Lv {state.level} {state.cls} · ◈ {state.gold}</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:12}}>
      {SLOTS.map(slot=>{
        const k=state.equip[slot], it=k?ITEMS[k]:null;
        return <div key={slot} onClick={()=>k&&unequip(slot)} style={{display:"flex",gap:6,alignItems:"center",border:`1px solid ${k?"#c9962e":"#5b4326"}`,borderRadius:6,padding:"5px 8px",background:k?"rgba(201,150,46,.1)":"rgba(0,0,0,.08)",cursor:k?"pointer":"default",fontSize:12}}>
          <span style={{fontSize:16}}>{it?.icon||SLOT_ICON[slot]}</span>
          <span style={{flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
            <span style={{color:"#7a5e2e",fontSize:9,display:"block",textTransform:"uppercase",letterSpacing:1}}>{slot}</span>
            <span style={{color:it?RAR_COL[it.rar]:"#8a7a55",fontWeight:it?700:400}}>{it?it.name:"—"}</span>
          </span>
        </div>;
      })}
    </div>
    <div style={{borderTop:"1px solid rgba(91,67,38,.3)",paddingTop:10,marginBottom:8}}>
      <p style={{fontSize:11,color:"#7a5e2e",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Inventory</p>
      {Object.keys(state.inv).length===0 && <p style={{color:"#8a7350",fontStyle:"italic",textAlign:"center",padding:14}}>Empty.</p>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(56px,1fr))",gap:6}}>
        {Object.keys(state.inv).map(k=>{
          const it=ITEMS[k]; if(!it) return null;
          return <div key={k} onClick={()=>setSel(sel===k?null:k)} style={{border:`2px solid ${sel===k?"#f0c659":RAR_COL[it.rar]}`,borderRadius:8,padding:"6px 3px",textAlign:"center",cursor:"pointer",background:sel===k?"rgba(201,150,46,.18)":"rgba(0,0,0,.08)"}}>
            <div style={{fontSize:22}}>{it.icon}</div>
            <div style={{fontSize:8,color:RAR_COL[it.rar],fontFamily:"Georgia",lineHeight:1.1,marginTop:2}}>{it.name.length>11?it.name.slice(0,10)+"…":it.name}</div>
            {state.inv[k]>1 && <div style={{fontSize:10,color:"#5b4326",fontWeight:700}}>×{state.inv[k]}</div>}
          </div>;
        })}
      </div>
    </div>
    {si && (
      <div style={{border:`2px solid ${RAR_COL[si.rar]}`,borderRadius:8,padding:"10px 12px",background:"rgba(0,0,0,.06)",marginTop:4}}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
          <span style={{fontSize:28}}>{si.icon}</span>
          <div><div style={{fontFamily:"Georgia",fontWeight:700,color:RAR_COL[si.rar],fontSize:15}}>{si.name}</div><div style={{fontSize:10,color:"#7a5e2e",textTransform:"uppercase",letterSpacing:1}}>{si.rar} {si.type}{si.slot?" · "+si.slot:""}</div></div>
        </div>
        <p style={{fontSize:12,color:"#5b4326",marginBottom:8}}>{si.desc}</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:11,color:"#5b4326",marginBottom:8}}>
          {si.dmg&&<span>⚔ +{si.dmg} dmg</span>}{si.def&&<span>🛡 +{si.def} def</span>}{si.str&&<span>💪 +{si.str} STR</span>}{si.dex&&<span>👟 +{si.dex} DEX</span>}{si.int&&<span>🧠 +{si.int} INT</span>}{si.maxHp&&<span>❤️ +{si.maxHp} HP</span>}{si.maxMana&&<span>💧 +{si.maxMana} MP</span>}{si.heal&&<span>💚 +{si.heal} heal</span>}{si.mana&&<span>🔵 +{si.mana} mana</span>}
        </div>
        <div style={{display:"flex",gap:6}}>
          {(si.type==="weapon"||si.type==="armor")&&<button onClick={()=>equipItem(sel)} style={{flex:1,padding:"7px",background:"#3f5f9a",color:"#fff",border:"none",borderRadius:6,fontFamily:"Georgia",fontSize:13,cursor:"pointer"}}>Equip</button>}
          {si.type==="potion"&&<button onClick={()=>useItem(sel)} style={{flex:1,padding:"7px",background:"#3f7d54",color:"#fff",border:"none",borderRadius:6,fontFamily:"Georgia",fontSize:13,cursor:"pointer"}}>Use</button>}
          <button onClick={()=>setSel(null)} style={{flex:1,padding:"7px",background:"#7d6e52",color:"#fff",border:"none",borderRadius:6,fontFamily:"Georgia",fontSize:13,cursor:"pointer"}}>Cancel</button>
        </div>
      </div>
    )}
  </>;
}

function QuestOvl({state}) {
  const q=state?.quest||{}; const s=state?.story||{stage:0};
  const MAIN=["Speak with the Town Elder of Red Oak.","Travel to Verandah Capital and find Captain Aldric.","Prove yourself: recover the Earth Relic.","Return to Captain Aldric in Verandah.","Warden of the Realm — speak to Aldric about the Frost Relic.","Travel to Ironpeak; take the Frost Relic from the Frostfang Cavern.","Return the Frost Relic to Captain Aldric.","Two relics reclaimed. ✓"];
  const mainIdx = s.stage===0?0 : s.stage<=4?Math.min(s.stage-1,3) : s.stage===5?4 : s.stage===6?(q.hasFrostRelic?6:5) : 7;
  return <>
    <h2 style={TS}>Quest Journal</h2>
    <div style={{padding:"8px 0",borderBottom:"1px dashed rgba(91,67,38,.3)",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:14,color:"#241a10",marginBottom:3}}><b>★ The King's Summons</b><span style={{color:s.stage>=8?"#3f7d54":s.stage>0?"#a23b2c":"#7a5e2e"}}>{s.stage>=8?"DONE":s.stage>0?"MAIN":"NEW"}</span></div>
      <div style={{fontSize:12,color:"#7a5e2e"}}>{s.stage>0?MAIN[mainIdx]:"Visit Red Oak Town (travel signpost in the village) and speak with the Town Elder."}</div>
    </div>
    {s.stage>=9 && (
      <div style={{padding:"8px 0",borderBottom:"1px dashed rgba(91,67,38,.3)",marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:14,color:"#241a10",marginBottom:3}}><b>The Flame Relic</b><span style={{color:q.hasFlameRelic?"#3f7d54":"#7a5e2e"}}>{q.hasFlameRelic?"DONE":"ACTIVE"}</span></div>
        <div style={{fontSize:12,color:"#7a5e2e"}}>{q.hasFlameRelic?"Flame Relic recovered ✓":"Travel to the Emberveil Wastes, enter Scorchdeep Cavern, and defeat the Flame Colossus."}</div>
      </div>
    )}
    {s.stage>=6 && (
      <div style={{padding:"8px 0",borderBottom:"1px dashed rgba(91,67,38,.3)",marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:14,color:"#241a10",marginBottom:3}}><b>The Frost Relic</b><span style={{color:q.hasFrostRelic?"#3f7d54":"#7a5e2e"}}>{q.hasFrostRelic?"DONE":"ACTIVE"}</span></div>
        <div style={{fontSize:12,color:"#7a5e2e"}}>{q.hasFrostRelic?"Frost Relic recovered ✓":"Travel to Ironpeak, enter the Frostfang Cavern, and defeat the Frost Titan."}</div>
      </div>
    )}
    <div style={{padding:"8px 0",borderBottom:"1px dashed rgba(91,67,38,.3)",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:14,color:"#241a10",marginBottom:3}}><b>Cleanse the Grove</b><span style={{color:q.completed?"#3f7d54":"#7a5e2e"}}>{q.completed?"DONE":"ACTIVE"}</span></div>
      <div style={{fontSize:12,color:"#7a5e2e"}}>{q.completed?"Spoke with the Spirit ✓":q.kills>=q.need?"Return to the Guardian Spirit":`Defeat corrupted creatures (${q.kills||0}/${q.need||5})`}</div>
    </div>
    <div style={{padding:"8px 0",borderBottom:"1px dashed rgba(91,67,38,.3)",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:14,color:"#241a10",marginBottom:3}}><b>The Earth Relic</b><span style={{color:q.hasEarthRelic?"#3f7d54":"#7a5e2e"}}>{q.hasEarthRelic?"DONE":q.completed?"ACTIVE":"LOCKED"}</span></div>
      <div style={{fontSize:12,color:"#7a5e2e"}}>{q.hasEarthRelic?"Earth Relic recovered ✓":q.completed?"Enter the Ancient Root Temple (east archway) and defeat the Thornheart Treant.":"Complete Cleanse the Grove first."}</div>
    </div>
    {(() => { const sq=state?.sq||{}; const active=Object.keys(SIDEQUESTS).filter(k=>sq[k]&&sq[k].s>0&&sq[k].s<3); if(!active.length) return null; return (
      <div style={{marginTop:4,marginBottom:8}}>
        <div style={{fontFamily:"Georgia",color:"#7a5e2e",fontSize:11,letterSpacing:2,marginBottom:4}}>SIDE QUESTS</div>
        {active.map(k=>{ const Q=SIDEQUESTS[k],s=sq[k]; const txt=s.s===2?"Ready to turn in ✓":(Q.count?`${s.p}/${Q.count}`:"In progress"); return (
          <div key={k} style={{padding:"5px 0",borderBottom:"1px dashed rgba(91,67,38,.25)"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#241a10"}}><span>{Q.name}</span><span style={{color:s.s===2?"#3f7d54":"#a07a2e",fontSize:11}}>{txt}</span></div>
          </div>
        ); })}
      </div>
    ); })()}
    <p style={{fontSize:13,color:"#6b5630",lineHeight:1.6}}>Recover the Four Relics — Earth, Frost, Flame, Storm — to restore the Heartstone and seal the Hollow King once more.</p>
  </>;
}

function CharOvl({state}) {
  const cs=calcStats(state);
  const rows=[["Class",state.cls],["Level",state.level],["XP",`${state.xp} / ${state.xpNext}`],
    ["Health",`${Math.ceil(state.hp)} / ${cs.maxHp}`],["Stamina",`${Math.ceil(state.st)} / ${cs.maxSt}`],["Mana",`${Math.ceil(state.mana)} / ${cs.maxMana}`],
    ["Strength",cs.str],["Dexterity",cs.dex],["Intelligence",cs.int],["Defense",cs.def],["Total ATK",cs.atkTotal],["Gold",`${state.gold} ◈`]];
  return <>
    <h2 style={TS}>{state.cls} Warden</h2>
    <p style={{textAlign:"center",color:"#7a5e2e",fontSize:11,letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>Descendant of the Wardens</p>
    {rows.map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 2px",borderBottom:"1px dashed rgba(91,67,38,.25)",fontSize:13,color:"#241a10"}}><span>{k}</span><b>{v}</b></div>)}
  </>;
}

function PauseOvl({G, toast, setHasSave, close, goTitle, openChar}) {
  const state=G.current.saveState;
  return <>
    <h2 style={TS}>Paused</h2>
    <p style={{textAlign:"center",color:"#7a5e2e",fontSize:11,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>Kingdom of Verandah — M2</p>
    <Btn gold onClick={close}>Resume</Btn>
    <Btn onClick={openChar}>Character Sheet</Btn>
    <Btn onClick={()=>{ saveGame(state,G.current); setHasSave(true); toast("Game saved."); }}>Save Game</Btn>
    <Btn onClick={goTitle}>Abandon to Title</Btn>
    <div style={{marginTop:10,fontSize:11,color:"#6b5630",lineHeight:1.8}}>
      WASD / joystick: Move &nbsp;•&nbsp; Drag: Look &nbsp;•&nbsp; L-Click / ⚔: Light Attack<br/>
      R-Click / 💥: Heavy Attack &nbsp;•&nbsp; Shift: Block &nbsp;•&nbsp; E / ✦: Interact<br/>
      Space: Jump &nbsp;•&nbsp; I: Inventory &nbsp;•&nbsp; J: Quests &nbsp;•&nbsp; C: Character &nbsp;•&nbsp; Esc: Menu
    </div>
  </>;
}

/* ═══════════════════════════════════════════════════════════
   HUD / QUEST UI HELPERS
═══════════════════════════════════════════════════════════ */
function updateHUD(g, setUi) {
  const s=g.saveState; if(!s) return;
  const cs=calcStats(s);
  setUi({ hp:s.hp, maxHp:cs.maxHp, st:s.st, maxSt:cs.maxSt, mana:s.mana, maxMana:cs.maxMana, xp:s.xp, xpNext:s.xpNext, level:s.level, gold:s.gold });
}
function updateQuestTrack(state, setQuestTrack) {
  const q=state.quest, s=state.story||{stage:0};
  if(s.stage===6 && !q.hasFrostRelic){ setQuestTrack("Frostfang Cavern: slay the Frost Titan ❄"); return; }
  if(s.stage===6 && q.hasFrostRelic){ setQuestTrack("Return to Captain Aldric →"); return; }
  if(s.stage===9 && !q.hasFlameRelic){ setQuestTrack("Scorchdeep Cavern: slay the Flame Colossus 🔥"); return; }
  if(s.stage===9 && q.hasFlameRelic){ setQuestTrack("Return to Captain Aldric →"); return; }
  if(s.stage>=2 && s.stage<5 && !q.hasEarthRelic && q.completed){ setQuestTrack("Recover the Earth Relic →"); return; }
  if(!q?.greeted){ setQuestTrack(null); return; }
  if(q.hasEarthRelic) setQuestTrack("Earth Relic recovered ✓");
  else if(q.completed) setQuestTrack("Find the Ancient Root Temple →");
  else if(q.kills>=q.need) setQuestTrack("Return to the Guardian Spirit");
  else setQuestTrack(`Cleanse the Grove: ${q.kills}/${q.need}`);
}
function updatePromptUI(g, setPrompt) {
  if(!g.player||g.paused){ setPrompt(null); return; }
  const p=g.player.position; let best=null, bd=4.5;
  g.npcs.forEach(n=>{ if(n.zone!==g.zone) return; const d=Math.hypot(p.x-n.mesh.position.x,p.z-n.mesh.position.z); if(d<bd){bd=d;best={type:"npc",ref:n};} });
  if(!best){
    if(g.zone==="overworld" && g.signpost && p.distanceTo(g.signpost)<3.5) best={label:"Read Travel Signpost"};
    else if(g.zone==="overworld" && g.dungeonEntrance && p.distanceTo(g.dungeonEntrance)<5) best={label:"Enter Ancient Root Temple"};
    else if(g.zone==="dungeon" && g.dungeonExit && p.distanceTo(g.dungeonExit)<4) best={label:"Exit Temple"};
    else if(g.zone==="ironpeak" && g.ironSign && p.distanceTo(g.ironSign)<3.5) best={label:"Read Travel Signpost"};
    else if(g.zone==="ironpeak" && g.frostEntrance && p.distanceTo(g.frostEntrance)<5) best={label:"Enter Frostfang Cavern"};
    else if(g.zone==="frost" && g.frostExit && p.distanceTo(g.frostExit)<4) best={label:"Leave the Cavern"};
    else if(g.zone==="ember" && g.emberEntrance && p.distanceTo(g.emberEntrance)<5) best={label:"Enter Scorchdeep"};
    else if(g.zone==="scorch" && g.scorchExit && p.distanceTo(g.scorchExit)<4) best={label:"Leave Scorchdeep"};
    else if(g.zone==="storm" && g.stormEntrance && p.distanceTo(g.stormEntrance)<5) best={label:"Ascend the Stormspire"};
    else if(g.zone==="stormspire" && g.stormspireExit && p.distanceTo(g.stormspireExit)<4) best={label:"Descend the Spire"};
    if(!best && g.zone==="dungeon"){
      for(const l of (g.levers||[])){ if(Math.hypot(p.x-l.pos.x,p.z-l.pos.z)<2.2){ best={label:l.on?"Reset Lever":"Pull Lever"}; break; } }
      if(!best) for(const t of (g.tablets||[])){ if(Math.hypot(p.x-t.pos.x,p.z-t.pos.z)<2.6){ best={label:"Read: "+t.title}; break; } }
    }
  }
  if(!best) g.chests?.forEach(c=>{ if(best||c.opened||c.zone!==g.zone) return; if(p.distanceTo(c.pos)<3) best={type:"chest"}; });
  if(best) setPrompt(best.type==="npc" ? (best.ref.kind==="merchant"?`Trade with ${best.ref.name}`:best.ref.kind==="signpost"?"Travel":best.ref.kind==="questtarget"?`Talk to ${best.ref.name}`:best.ref.kind==="dspirit"?"Speak with the Spirit":`Speak with ${best.ref.name}`) : best.type==="chest" ? "Open Chest" : best.label);
  else setPrompt(null);
}

/* ═══════════════════════════════════════════════════════════
   WORLD BUILDING
═══════════════════════════════════════════════════════════ */
function buildTerrain(g) {
  const geo=new THREE.PlaneGeometry(300,300,64,64); geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){ const x=pos.getX(i),z=pos.getZ(i); pos.setY(i,tH(x,z)); }
  geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:0x4f8b48,flatShading:true}));
  m.receiveShadow=true; g.overworldGroup.add(m);
}
function buildVillage(g) {
  const addH=(x,z,ruined)=>{
    const body=new THREE.Mesh(new THREE.BoxGeometry(5,3,4),new THREE.MeshLambertMaterial({color:ruined?0x6e5a44:0xcdb592,flatShading:true}));
    body.position.set(x,tH(x,z)+(ruined?.9:1.5),z); body.castShadow=true; body.receiveShadow=true; g.overworldGroup.add(body);
    if(!ruined){ const r=new THREE.Mesh(new THREE.ConeGeometry(4,2.2,4),new THREE.MeshLambertMaterial({color:0x8c3f2e,flatShading:true})); r.position.set(x,tH(x,z)+4.1,z); r.rotation.y=Math.PI/4; r.castShadow=true; g.overworldGroup.add(r); }
    g.props.push({pos:new THREE.Vector3(x,0,z),radius:3.2});
  };
  [[-12,-2,true],[12,-4,true],[-9,8,false],[14,6,false],[0,-14,true]].forEach(a=>addH(...a));
  const well=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,1.2,10),new THREE.MeshLambertMaterial({color:0x7d7d80,flatShading:true}));
  well.position.set(2,tH(2,0)+.6,0); well.castShadow=true; g.overworldGroup.add(well);
  g.props.push({pos:new THREE.Vector3(2,0,0),radius:1.3});
}
function buildTree(g,x,z){
  const gr=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.25,.38,2.2,6),new THREE.MeshLambertMaterial({color:0x6b4a2b,flatShading:true}));
  trunk.position.y=1.1; gr.add(trunk);
  for(let j=0;j<3;j++){ const c=new THREE.Mesh(new THREE.ConeGeometry(1.6-j*.4,1.5,7),new THREE.MeshLambertMaterial({color:[0x3f8a3a,0x357a32,0x4c9a44][j%3],flatShading:true})); c.position.y=2.3+j*.95; c.castShadow=true; gr.add(c); }
  gr.position.set(x,tH(x,z),z); gr.userData.sway=Math.random()*Math.PI*2;
  g.overworldGroup.add(gr); g.trees.push(gr);
}
function scatterWorld(g) {
  g.trees=[];
  for(let i=0;i<120;i++){
    const a=Math.random()*Math.PI*2,d=18+Math.random()*80, x=Math.cos(a)*d,z=Math.sin(a)*d;
    if(Math.abs(x)<10&&z>-6&&z<14) continue;
    if(x>30&&Math.abs(z)<6) continue; // keep dungeon path clear
    buildTree(g,x,z);
  }
  for(let i=0;i<8;i++){ const a=Math.random()*Math.PI*2,d=20+Math.random()*50; spawnPickup(g,"herb",Math.cos(a)*d,Math.sin(a)*d,1,0); }
  spawnChest(g,18,22,"uncommon","overworld");
  spawnChest(g,-20,-10,"common","overworld");
  spawnChest(g,32,-20,"rare","overworld");
}
function makeMarker(symbol, color){
  const cv=document.createElement("canvas"); cv.width=72; cv.height=72;
  const c=cv.getContext("2d");
  // soft dark disc behind the symbol for contrast
  c.beginPath(); c.arc(36,36,30,0,Math.PI*2); c.fillStyle="rgba(18,12,5,.78)"; c.fill();
  c.lineWidth=4; c.strokeStyle=color; c.stroke();
  c.font="bold 42px Georgia, 'Apple Color Emoji', sans-serif";
  c.textAlign="center"; c.textBaseline="middle";
  c.lineWidth=5; c.strokeStyle="rgba(0,0,0,.55)"; c.strokeText(symbol,36,39);
  c.fillStyle=color; c.fillText(symbol,36,39);
  const tex=new THREE.CanvasTexture(cv); tex.needsUpdate=true;
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
  spr.scale.set(.85,.85,1);
  return spr;
}
function addNPC(g, zoneKey, opts) {
  const { name, kind, x, z, col=0x8a6b3a, spirit=false, height=0, stock=null, shopName=null,
          dialogue=null, sq=null, found=null, idle=null, wanderC=null, wanderR=7, home=null, speed=1.6 } = opts;
  const gr=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.32,.42,1.4,8),new THREE.MeshLambertMaterial({color:col,flatShading:true,transparent:spirit,opacity:spirit?.8:1,emissive:spirit?0x335588:0,emissiveIntensity:spirit?.6:0}));
  body.position.y=.85; body.castShadow=true; gr.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.3,10,10),new THREE.MeshLambertMaterial({color:spirit?0xbfe3ff:0xe6b890,transparent:spirit,opacity:spirit?.85:1,emissive:spirit?0x335588:0,emissiveIntensity:spirit?.6:0}));
  head.position.y=1.74; gr.add(head);
  if(!spirit && kind!=="guard"){ const hair=new THREE.Mesh(new THREE.BoxGeometry(.42,.16,.42),new THREE.MeshLambertMaterial({color:[0x3a2a18,0x5a3a1a,0x2a2218,0x6a5030][Math.floor(Math.random()*4)],flatShading:true})); hair.position.y=1.92; gr.add(hair); }
  if(kind==="guard"){
    const helm=new THREE.Mesh(new THREE.SphereGeometry(.33,8,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshLambertMaterial({color:0x9aa0aa,flatShading:true})); helm.position.y=1.86; gr.add(helm);
    const plume=new THREE.Mesh(new THREE.ConeGeometry(.08,.4,5),new THREE.MeshLambertMaterial({color:0xcc3322,flatShading:true})); plume.position.y=2.18; gr.add(plume);
    const spear=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,2.7,6),new THREE.MeshLambertMaterial({color:0x6b4a2b,flatShading:true})); spear.position.set(.44,1.15,0); gr.add(spear);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.1,.34,6),new THREE.MeshLambertMaterial({color:0xccd2da,flatShading:true})); tip.position.set(.44,2.62,0); gr.add(tip);
  }
  let mark=null;
  {
    let sym=null,scol="#ffffff";
    if(kind==="spirit"||kind==="dspirit"){ sym="✦"; scol="#7fd8ff"; }       // guardian / main quest
    else if(kind==="merchant"){ sym="$"; scol="#79e06a"; }                   // shop
    else if(kind==="questgiver"){ sym=sq?"?":"!"; scol="#ffd23f"; }          // side quest (?) vs main quest (!)
    else if(kind==="questtarget"){ sym="!"; scol="#ff8fd0"; }                // someone to find
    else if(kind==="signpost"){ sym="⇄"; scol="#e6eef6"; }                   // travel
    if(sym){ mark=makeMarker(sym,scol); mark.position.y=2.5; gr.add(mark); }
  }
  const y=floorFor(zoneKey,x,z)+(spirit?.3:0)+height;
  gr.position.set(x,y,z); zoneGroup(g,zoneKey).add(gr);
  const npc={mesh:gr,name,kind,spirit,mark,bob:Math.random()*6,baseY:y,zone:zoneKey,stock,shopName:shopName||name,
    dialogue,sq,found,idle,wanderC:wanderC||[x,z],wanderR,home:home||[x,z],speed,tgt:null,wait:Math.random()*3,col};
  g.npcs.push(npc);
  return npc;
}
function buildNPCs(g) {
  g.npcs=[];
  addNPC(g,"overworld",{name:"Guardian Spirit",kind:"spirit",spirit:true,x:0,z:3,col:0x88bbee});
  addNPC(g,"overworld",{name:"Maela the Trader",kind:"merchant",x:-9,z:7,col:0x8a6b3a,shopName:"Maela's Wares",stock:["potion_minor","potion_greater","mana_potion","bread","leather_helm","leather_gloves","trail_boots","herb"]});
  // travel signpost in the village square
  const post=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,2.4,6),new THREE.MeshLambertMaterial({color:0x6b4a2b,flatShading:true})); pole.position.y=1.2; post.add(pole);
  const sign=new THREE.Mesh(new THREE.BoxGeometry(1.6,.7,.12),new THREE.MeshLambertMaterial({color:0x8c6a3a,flatShading:true})); sign.position.set(.4,2,0); sign.rotation.y=.2; post.add(sign);
  post.position.set(5,tH(5,2),2); post.traverse(o=>{if(o.isMesh)o.castShadow=true;}); g.overworldGroup.add(post);
  g.signpost=new THREE.Vector3(5,tH(5,2),2);
  g.props.push({pos:new THREE.Vector3(5,0,2),radius:.6,zone:"overworld"});
}
function buildDungeonEntrance(g) {
  const ex=40,ez=0,ey=tH(ex,ez);
  const rockMat=new THREE.MeshLambertMaterial({color:0x6a6058,flatShading:true});
  const darkMat=new THREE.MeshLambertMaterial({color:0x4a443e,flatShading:true});
  // Rocky mound sits BEHIND/east; opening faces west (toward the approaching player)
  const mound=new THREE.Group();
  const big=new THREE.Mesh(new THREE.DodecahedronGeometry(4.6,0),rockMat); big.position.set(ex+3.4,ey+2.6,ez); big.scale.set(1.1,1.1,1.3); big.castShadow=true; mound.add(big);
  [[ex+4,ey+1.6,ez+3.6,2.2],[ex+4,ey+1.7,ez-3.6,2.4],[ex+5.5,ey+3.6,ez,2.2],[ex+1.8,ey+3.4,ez+2.6,1.6],[ex+1.8,ey+3.4,ez-2.6,1.6]].forEach(([x,y,z,r])=>{
    const b=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),rockMat); b.position.set(x,y,z); b.rotation.set(Math.random(),Math.random(),Math.random()); b.castShadow=true; mound.add(b);
  });
  // dark cave opening on the WEST face (faces -x, toward the player)
  const mouth=new THREE.Mesh(new THREE.CircleGeometry(2.0,18),new THREE.MeshBasicMaterial({color:0x07090a,side:THREE.DoubleSide})); mouth.position.set(ex+1.4,ey+2.0,ez); mouth.rotation.y=Math.PI/2; mound.add(mouth);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(2.8,3.2),new THREE.MeshBasicMaterial({color:0x2f7a3a,transparent:true,opacity:.3,side:THREE.DoubleSide})); glow.position.set(ex+1.3,ey+2.0,ez); glow.rotation.y=Math.PI/2; mound.add(glow);
  // mossy timber frame around the mouth
  [[0,2.4],[0,-2.4]].forEach(([dx,dz])=>{ const post=new THREE.Mesh(new THREE.BoxGeometry(.4,3.6,.4),darkMat); post.position.set(ex+1.5,ey+2.0,ez+dz); mound.add(post); });
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,5),darkMat); lintel.position.set(ex+1.5,ey+3.8,ez); mound.add(lintel);
  g.overworldGroup.add(mound);
  // Forest path of dirt patches leading in from the grove (west of the cave)
  const pathMat=new THREE.MeshLambertMaterial({color:0x7a5f3e,flatShading:true,transparent:true,opacity:.7});
  for(let i=0;i<8;i++){ const t=i/7; const px=ex-3-t*24+Math.sin(i*1.7)*1.5, pz=ez+Math.cos(i*1.3)*3; const patch=new THREE.Mesh(new THREE.CircleGeometry(1.6+Math.random()*.5,8),pathMat); patch.rotation.x=-Math.PI/2; patch.position.set(px,tH(px,pz)+.05,pz); g.overworldGroup.add(patch); }
  // guardian pines flanking the approach
  [[ -3,-5],[-4,5]].forEach(([dx,dz])=>{ const tr=new THREE.Group(); const tk=new THREE.Mesh(new THREE.CylinderGeometry(.3,.45,2.6,6),new THREE.MeshLambertMaterial({color:0x5a3f24,flatShading:true})); tk.position.y=1.3; tr.add(tk); const cn=new THREE.Mesh(new THREE.ConeGeometry(2,3.4,7),new THREE.MeshLambertMaterial({color:0x2f5f2c,flatShading:true})); cn.position.y=3.8; cn.castShadow=true; tr.add(cn); tr.position.set(ex+dx,tH(ex+dx,ez+dz),ez+dz); g.overworldGroup.add(tr); });
  // Entrance trigger sits in OPEN ground well west of the mouth (reachable, not in rock)
  g.dungeonEntrance=new THREE.Vector3(ex-3.5,ey,ez);
  // collision only on the solid rock body (east), leaving the mouth approach clear
  g.props.push({pos:new THREE.Vector3(ex+3.6,0,ez),radius:3.0});
}

/* ── Chests ── */
function chestMesh(rarity){
  const gr=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.2,.8,.9),new THREE.MeshLambertMaterial({color:0x8b6914,flatShading:true})); body.position.y=.4; body.castShadow=true; gr.add(body);
  const lid=new THREE.Mesh(new THREE.BoxGeometry(1.2,.4,.9),new THREE.MeshLambertMaterial({color:0xaa8020,flatShading:true})); lid.position.set(0,.82,0); gr.add(lid);
  const glow=new THREE.Mesh(new THREE.BoxGeometry(1.35,.95,1.05),new THREE.MeshBasicMaterial({color:rarGlow(rarity),transparent:true,opacity:.28})); gr.add(glow);
  return {gr,lid,glow};
}
function spawnChest(g,x,z,rarity,zoneKey){
  const {gr,lid,glow}=chestMesh(rarity);
  const y=(zoneKey==="overworld"?tH(x,z):0)+(zoneKey==="dungeon"?.5:0);
  gr.position.set(x,y,z);
  zoneGroup(g,zoneKey).add(gr);
  g.chests.push({mesh:gr,lid,glow,pos:new THREE.Vector3(x,y,z),rarity,opened:false,zone:zoneKey});
}
function generateChestLoot(rarity){
  const T={
    common:   [["potion_minor","bread","herb","leather_helm","leather_gloves","trail_boots","leather_vest"],[4,3,3,1,1,1,1]],
    uncommon: [["potion_greater","mana_potion","iron_helm","chainmail","iron_gauntlets","iron_boots","silver_ring","jade_ring","jade_pendant"],[3,3,2,1,2,2,2,2,2]],
    rare:     [["ancient_circlet","scholars_chain","ruby_ring","bandit_blade","ash_staff","steel_sword"],[2,2,2,2,2,2]],
    epic:     [["warden_blade","warden_robes","wardens_seal"],[1,1,1]],
    legendary:[["warden_blade","wardens_seal"],[1,1]],
  };
  const [keys,wts]=T[rarity]||T.common; const tot=wts.reduce((a,b)=>a+b,0);
  let r=Math.random()*tot;
  for(let i=0;i<keys.length;i++){ r-=wts[i]; if(r<=0) return keys[i]; }
  return keys[0];
}
function openChest(g,chest,toast){
  chest.opened=true;
  if(chest.lid) chest.lid.rotation.x=-Math.PI*.7;
  if(chest.glow) chest.glow.material.opacity=0;
  SFX.chest();
  const item=generateChestLoot(chest.rarity);
  const gold={common:10,uncommon:35,rare:90,epic:200,legendary:400}[chest.rarity]||10;
  const g2=gold+Math.floor(Math.random()*gold);
  g.saveState.gold+=g2;
  g.saveState.inv[item]=(g.saveState.inv[item]||0)+1;
  toast(`${chest.rarity} chest: ${ITEMS[item]?.icon||"📦"} ${ITEMS[item]?.name||item} +${g2}◈`);
  updateHUD(g,g.setUi);
}

/* ═══════════════════════════════════════════════════════════
   ENEMIES
═══════════════════════════════════════════════════════════ */
const ESPEC={
  corrupted:{hp:[40,70],dmg:[10,16],speed:[3,3.6],xp:[22,40],aggro:12},
  wolf:     {hp:[30,30],dmg:[8,8],  speed:[5.5,5.5],xp:[20,20],aggro:11},
  bandit:   {hp:[60,60],dmg:[14,14],speed:[3.2,3.2],xp:[35,35],aggro:13},
  skeleton: {hp:[50,50],dmg:[12,12],speed:[2.4,2.4],xp:[28,28],aggro:12},
  treant:   {hp:[260,260],dmg:[34,34],speed:[1.6,1.6],xp:[340,340],aggro:18},
  rootling: {hp:[28,28],dmg:[10,10],speed:[3.6,3.6],xp:[18,18],aggro:16},
  frostwolf:{hp:[42,42],dmg:[13,13],speed:[6,6],xp:[34,34],aggro:12},
  wraith:   {hp:[60,90],dmg:[18,24],speed:[3.4,3.8],xp:[48,70],aggro:14},
  titan:    {hp:[340,340],dmg:[44,44],speed:[1.7,1.7],xp:[420,420],aggro:20},
  emberwolf:{hp:[48,48],dmg:[16,16],speed:[6,6],xp:[40,40],aggro:12},
  magmawisp:{hp:[70,100],dmg:[20,26],speed:[3.2,3.6],xp:[55,80],aggro:14},
  colossus: {hp:[420,420],dmg:[50,50],speed:[1.6,1.6],xp:[500,500],aggro:20},
  galehound:{hp:[60,60],dmg:[18,18],speed:[6.4,6.4],xp:[48,48],aggro:13},
  stormwisp:{hp:[80,110],dmg:[24,30],speed:[3.6,4],xp:[64,90],aggro:15},
  stormcaller:{hp:[520,520],dmg:[56,56],speed:[1.8,1.8],xp:[640,640],aggro:24},
};
function spawnEnemyWave(g){
  g.enemies=[];
  [[-22,18,2],[22,20,1],[-26,-14,1],[26,-10,2],[0,30,1],[-30,2,1],[8,28,2]].forEach(([x,z,t])=>spawnEnemy(g,x,z,"corrupted",t,"overworld"));
  [[-15,30],[15,30],[-25,14],[24,16]].forEach(([x,z])=>spawnEnemy(g,x,z,"wolf",1,"overworld"));
  [[10,-20],[18,-24],[-8,-22]].forEach(([x,z])=>spawnEnemy(g,x,z,"bandit",1,"overworld"));
  [[-35,-6],[-38,-2],[-34,-12]].forEach(([x,z])=>spawnEnemy(g,x,z,"skeleton",1,"overworld"));
  // Bandit camp (south, beyond the river)
  [[-4,-54,2],[5,-56,1],[-10,-58,1],[10,-58,2]].forEach(([x,z,t])=>spawnEnemy(g,x,z,"bandit",t,"overworld"));
}
function spawnEnemy(g,x,z,type="corrupted",tier=1,zoneKey="overworld"){
  const sp=ESPEC[type]||ESPEC.corrupted;
  const ti=(tier>=2)?1:0;
  const hp=sp.hp[ti], dmg=sp.dmg[ti], speed=sp.speed[ti], xp=sp.xp[ti];
  const scale=type==="rootling"?.7:type==="treant"?2.2:type==="titan"?2.4:type==="colossus"?2.6:type==="stormcaller"?2.5:(type==="wolf"||type==="frostwolf"||type==="emberwolf"||type==="galehound")?.7:type==="corrupted"?(tier>=2?1.2:1):1;
  const gr=new THREE.Group(); let body;
  const lm=(col,opts={})=>new THREE.MeshLambertMaterial({color:col,flatShading:true,...opts});
  const bx=(geo,col,opts)=>{ const m=new THREE.Mesh(geo,lm(col,opts)); m.castShadow=true; return m; };

  if(type==="wolf"||type==="frostwolf"||type==="galehound"){
    const fw=type==="frostwolf"; const gh=type==="galehound";
    const c1=gh?0x5a6678:fw?0xb4cfe0:0x6a6258, c2=gh?0x49556a:fw?0x9cc0d6:0x564f44, c3=gh?0x3a4658:fw?0x82a8c4:0x423c33, belly=gh?0x7a8aa0:fw?0xd8ecf6:0x8a8276, eyeC=gh?0x9fe8ff:fw?0x77e6ff:0xffc24a;
    // low, elongated torso (slightly tilted, head-down predator stance)
    body=bx(new THREE.BoxGeometry(.66,.62,1.5),c1,{emissive:fw?0x113344:0x110e08,emissiveIntensity:fw?.3:.18}); body.position.set(0,.66,-.05); body.rotation.x=-.06; gr.add(body);
    const belJ=bx(new THREE.BoxGeometry(.5,.3,1.3),belly); belJ.position.set(0,.46,-.05); gr.add(belJ);
    // haunches (rear) and chest (front) for a tapered silhouette
    const haunch=bx(new THREE.BoxGeometry(.74,.7,.6),c1); haunch.position.set(0,.66,-.66); gr.add(haunch);
    const chest=bx(new THREE.BoxGeometry(.58,.6,.5),c2); chest.position.set(0,.62,.62); gr.add(chest);
    // neck angled down to the head
    const neck=bx(new THREE.BoxGeometry(.4,.42,.5),c2); neck.position.set(0,.74,.86); neck.rotation.x=.5; gr.add(neck);
    const head=bx(new THREE.BoxGeometry(.46,.42,.5),c1); head.position.set(0,.62,1.18); gr.add(head);
    // tapered muzzle
    const muzzle=bx(new THREE.BoxGeometry(.26,.24,.4),c2); muzzle.position.set(0,.54,1.46); gr.add(muzzle);
    const snoutTip=bx(new THREE.BoxGeometry(.18,.16,.18),c3); snoutTip.position.set(0,.52,1.66); gr.add(snoutTip);
    const ns=bx(new THREE.BoxGeometry(.12,.1,.1),0x141414); ns.position.set(0,.55,1.74); gr.add(ns);
    // pointed ears
    [-1,1].forEach(sx=>{ const ear=bx(new THREE.ConeGeometry(.13,.32,4),c2); ear.position.set(sx*.16,.92,1.04); ear.rotation.set(-.2,Math.PI/4,sx*.15); gr.add(ear); const inr=bx(new THREE.ConeGeometry(.07,.2,4),c3); inr.position.set(sx*.16,.9,1.07); inr.rotation.set(-.2,Math.PI/4,sx*.15); gr.add(inr); });
    // legs (front pair forward, rear pair back) with paws
    [[-.26,.62],[.26,.62],[-.3,-.62],[.3,-.62]].forEach(([lx,lz])=>{ const leg=bx(new THREE.BoxGeometry(.2,.62,.24),c2); leg.position.set(lx,.31,lz); gr.add(leg); const paw=bx(new THREE.BoxGeometry(.24,.16,.34),c3); paw.position.set(lx,.08,lz+.05); gr.add(paw); });
    // bushy tail, raised
    const tail=bx(new THREE.CylinderGeometry(.16,.07,.8,7),c1); tail.position.set(0,.86,-1.0); tail.rotation.x=-.9; gr.add(tail);
    const tailTip=bx(new THREE.SphereGeometry(.12,6,6),c3); tailTip.position.set(0,1.18,-1.28); gr.add(tailTip);
    if(fw){ for(let i=0;i<4;i++){ const sp=bx(new THREE.ConeGeometry(.07,.34,4),0xe8f6ff); sp.position.set(0,1.0,.5-i*.42); sp.rotation.x=-.2; gr.add(sp); } }
    [-1,1].forEach(sx=>{ const eye=new THREE.Mesh(new THREE.SphereGeometry(.06,6,6),new THREE.MeshBasicMaterial({color:eyeC})); eye.position.set(sx*.15,.66,1.36); gr.add(eye); });
  } else if(type==="wraith"){
    const wcol=tier>=2?0x9a66dd:0x5fc8e0;
    body=new THREE.Mesh(new THREE.IcosahedronGeometry(.62,1),new THREE.MeshLambertMaterial({color:wcol,flatShading:true,transparent:true,opacity:.72,emissive:wcol,emissiveIntensity:.55}));
    body.position.y=1.4; gr.add(body);
    // tattered shroud cones hanging below
    for(let i=0;i<5;i++){ const ang=i/5*Math.PI*2; const sh=new THREE.Mesh(new THREE.ConeGeometry(.16,.9,5),new THREE.MeshLambertMaterial({color:wcol,flatShading:true,transparent:true,opacity:.5,emissive:wcol,emissiveIntensity:.3})); sh.position.set(Math.cos(ang)*.34,.78,Math.sin(ang)*.34); sh.rotation.x=Math.PI; gr.add(sh); }
    // hollow eyes
    [-1,1].forEach(sx=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(.1,8,8),new THREE.MeshBasicMaterial({color:0xffffff})); e.position.set(sx*.2,1.46,.45); gr.add(e); });
    // wispy claws
    [-1,1].forEach(sx=>{ const cl=new THREE.Mesh(new THREE.ConeGeometry(.08,.5,5),new THREE.MeshLambertMaterial({color:wcol,flatShading:true,transparent:true,opacity:.6,emissive:wcol,emissiveIntensity:.4})); cl.position.set(sx*.6,1.2,.2); cl.rotation.z=sx*.6; gr.add(cl); });
  } else if(type==="titan"){
    // Frost Titan boss — towering ice humanoid
    const sc=scale, iceM=lm(0x9fd0e8,{emissive:0x224a66,emissiveIntensity:.4}), iceD=lm(0x7ab0d4,{emissive:0x183a55,emissiveIntensity:.3});
    const legM=lm(0x6fa0c8);
    [-1,1].forEach(sx=>{ const leg=bx(new THREE.BoxGeometry(.5*sc,1.5*sc,.55*sc),0x6fa0c8); leg.position.set(sx*.42*sc,.75*sc,0); gr.add(leg); });
    body=bx(new THREE.BoxGeometry(1.7*sc,1.7*sc,1.0*sc),0x9fd0e8,{emissive:0x224a66,emissiveIntensity:.4}); body.position.y=2.5*sc; gr.add(body);
    // ice shards on shoulders/back
    for(let i=0;i<6;i++){ const sh=new THREE.Mesh(new THREE.ConeGeometry(.18*sc,.9*sc,5),iceM); sh.position.set((-1+i*.4)*sc,3.4*sc,-.3*sc); sh.rotation.z=(-.4+i*.16); gr.add(sh); }
    // head
    const head=bx(new THREE.BoxGeometry(.9*sc,.9*sc,.85*sc),0xb8e0f4); head.position.y=3.8*sc; gr.add(head);
    const crown=new THREE.Mesh(new THREE.ConeGeometry(.5*sc,.7*sc,6),iceM); crown.position.y=4.5*sc; gr.add(crown);
    [-1,1].forEach(sx=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(.13*sc,8,8),new THREE.MeshBasicMaterial({color:0x66e0ff})); e.position.set(sx*.24*sc,3.86*sc,.45*sc); gr.add(e); });
    // arms with fists
    [-1,1].forEach(sx=>{ const arm=bx(new THREE.BoxGeometry(.45*sc,1.6*sc,.5*sc),0x7ab0d4); arm.position.set(sx*1.2*sc,2.5*sc,0); arm.rotation.z=sx*.18; gr.add(arm); const fist=bx(new THREE.DodecahedronGeometry(.4*sc,0),0x6fa0c8); fist.position.set(sx*1.38*sc,1.6*sc,0); gr.add(fist); });
  } else if(type==="bandit"){
    const lL=bx(new THREE.BoxGeometry(.28,.82,.3),0x3a2e20); lL.position.set(-.18,.42,0); gr.add(lL);
    const lR=bx(new THREE.BoxGeometry(.28,.82,.3),0x3a2e20); lR.position.set(.18,.42,0); gr.add(lR);
    body=bx(new THREE.BoxGeometry(.72,1.04,.48),0x5a4530,{emissive:0x110800,emissiveIntensity:.15}); body.position.set(0,1.35,0); gr.add(body);
    [-1,1].forEach(sx=>{ const sh=bx(new THREE.BoxGeometry(.24,.28,.54),0x786040); sh.position.set(sx*.5,1.68,0); gr.add(sh); });
    const bh=bx(new THREE.BoxGeometry(.52,.52,.5),0xcc9966); bh.position.set(0,2.07,0); gr.add(bh);
    const hd=bx(new THREE.BoxGeometry(.54,.28,.52),0x3a2e22); hd.position.set(0,2.3,0); gr.add(hd);
    [-1,1].forEach(sx=>{ const eye=new THREE.Mesh(new THREE.SphereGeometry(.05,6,6),new THREE.MeshBasicMaterial({color:0xcc3322})); eye.position.set(sx*.12,2.08,.24); gr.add(eye); });
    const ra=bx(new THREE.BoxGeometry(.24,.76,.26),0x5a4530); ra.position.set(.52,1.5,0); gr.add(ra);
    const bsw=new THREE.Group(); bsw.position.set(.52,.88,0);
    const bbl=new THREE.Mesh(new THREE.BoxGeometry(.08,1.0,.04),lm(0xb8c4cc)); bbl.position.set(0,.08,0); bbl.castShadow=true; bsw.add(bbl);
    const bg=new THREE.Mesh(new THREE.BoxGeometry(.38,.08,.08),lm(0x887755)); bg.position.set(0,-.48,0); bsw.add(bg);
    gr.add(bsw);
  } else if(type==="skeleton"){
    const boneM={emissive:0x223300,emissiveIntensity:.18};
    const boneL=0xe2d8bc, boneD=0xc9bd9a;
    // legs planted on the ground (feet at y~0)
    [-1,1].forEach(sx=>{
      const thigh=bx(new THREE.CylinderGeometry(.08,.07,.62,6),boneL,boneM); thigh.position.set(sx*.16,.66,0); gr.add(thigh);
      const shin=bx(new THREE.CylinderGeometry(.07,.06,.6,6),boneD,boneM); shin.position.set(sx*.16,.18,.02); gr.add(shin);
      const foot=bx(new THREE.BoxGeometry(.18,.1,.3),boneD,boneM); foot.position.set(sx*.16,.0,.12); gr.add(foot);
    });
    // pelvis + spine
    const pelv=bx(new THREE.BoxGeometry(.42,.2,.28),boneD,boneM); pelv.position.set(0,1.0,0); gr.add(pelv);
    const spine=bx(new THREE.CylinderGeometry(.07,.07,.6,6),boneL,boneM); spine.position.set(0,1.36,0); gr.add(spine);
    // ribcage (tapered) + a few rib bars
    body=bx(new THREE.BoxGeometry(.5,.62,.32),boneL,boneM); body.position.set(0,1.5,0); gr.add(body);
    for(let i=0;i<3;i++){ const rib=bx(new THREE.BoxGeometry(.54,.06,.36),boneD,boneM); rib.position.set(0,1.66-i*.2,0); gr.add(rib); }
    // shoulders + skull
    const collar=bx(new THREE.BoxGeometry(.56,.1,.2),boneD,boneM); collar.position.set(0,1.86,0); gr.add(collar);
    const skull=bx(new THREE.BoxGeometry(.42,.44,.42),0xeae0c6); skull.position.set(0,2.16,0); gr.add(skull);
    const jaw=bx(new THREE.BoxGeometry(.34,.14,.34),0xe0d6bc); jaw.position.set(0,1.9,.04); gr.add(jaw);
    const eyeM=new THREE.MeshBasicMaterial({color:0x55ff33});
    [-1,1].forEach(sx=>{ const skt=bx(new THREE.BoxGeometry(.13,.14,.06),0x0a0a0a); skt.position.set(sx*.11,2.2,.21); gr.add(skt); const eye=new THREE.Mesh(new THREE.SphereGeometry(.055,7,7),eyeM); eye.position.set(sx*.11,2.2,.24); gr.add(eye); });
    // arms — left hangs, right holds a rusty sword forward
    const armL1=bx(new THREE.CylinderGeometry(.06,.055,.5,6),boneL,boneM); armL1.position.set(-.32,1.62,0); armL1.rotation.z=.18; gr.add(armL1);
    const armL2=bx(new THREE.CylinderGeometry(.05,.05,.46,6),boneD,boneM); armL2.position.set(-.38,1.2,0); gr.add(armL2);
    const armR1=bx(new THREE.CylinderGeometry(.06,.055,.5,6),boneL,boneM); armR1.position.set(.32,1.62,0); armR1.rotation.z=-.2; gr.add(armR1);
    const armR2=bx(new THREE.CylinderGeometry(.05,.05,.46,6),boneD,boneM); armR2.position.set(.42,1.3,.18); armR2.rotation.x=-.7; gr.add(armR2);
    // rusty sword in right hand
    const sgrp=new THREE.Group(); sgrp.position.set(.46,1.16,.42); sgrp.rotation.x=-.5;
    const blade=bx(new THREE.BoxGeometry(.07,.85,.03),0x8a8478); blade.position.set(0,.42,0); sgrp.add(blade);
    const guard=bx(new THREE.BoxGeometry(.28,.06,.07),0x6a5a3a); guard.position.set(0,0,0); sgrp.add(guard);
    gr.add(sgrp);
  } else if(type==="corrupted"){
    // corrupted
    const col=tier>=2?0x5a2d6e:0x6e2d3a;
    body=bx(new THREE.IcosahedronGeometry(.7*scale,1),col,{emissive:0x220011,emissiveIntensity:.5}); body.position.y=.8*scale; gr.add(body);
    const spikeM=lm(tier>=2?0x3a1a5a:0x4a1a28);
    for(let i=0;i<8;i++){ const ang=i/8*Math.PI*2; const sp=new THREE.Mesh(new THREE.ConeGeometry(.085*scale,.5*scale,5),spikeM); sp.position.set(Math.cos(ang)*.62*scale,.78*scale+Math.sin(i*.7)*.2*scale,Math.sin(ang)*.62*scale); sp.rotation.x=Math.sin(ang)*.4; sp.rotation.z=-Math.cos(ang)*.4; gr.add(sp); }
    const eyeCol=tier>=2?0xcc44ff:0xff4422; const em2=new THREE.MeshBasicMaterial({color:eyeCol});
    [-1,1].forEach(sx=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(.14*scale,8,8),em2); e.position.set(sx*.28*scale,.86*scale,.52*scale); gr.add(e); });
    if(tier>=2){ for(let i=0;i<4;i++){ const td=bx(new THREE.CylinderGeometry(.04,.08,.72,5),0x3a1a5a); td.position.set(Math.cos(i/4*Math.PI*2)*.5,.22,Math.sin(i/4*Math.PI*2)*.5); td.rotation.x=Math.cos(i/4*Math.PI*2)*.8; td.rotation.z=-Math.sin(i/4*Math.PI*2)*.8; gr.add(td); } }
  } else if(type==="rootling"){
    body=bx(new THREE.IcosahedronGeometry(.42,0),0x4a6b3a,{emissive:0x002200,emissiveIntensity:.4}); body.position.y=.5; gr.add(body);
    for(let i=0;i<5;i++){ const sp=new THREE.Mesh(new THREE.ConeGeometry(.07,.4,4),lm(0x3a5228)); const a=i/5*Math.PI*2; sp.position.set(Math.cos(a)*.36,.5,Math.sin(a)*.36); sp.rotation.z=-Math.cos(a)*.6; sp.rotation.x=Math.sin(a)*.6; gr.add(sp); }
    [-1,1].forEach(s=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.06,6,6),new THREE.MeshBasicMaterial({color:0x99ff66}));eye.position.set(s*.16,.56,.34);gr.add(eye);});
    const legM=lm(0x3a2a18); [[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]].forEach(([lx,lz])=>{const lg=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,.3,5),legM);lg.position.set(lx,.15,lz);gr.add(lg);});
  } else if(type==="emberwolf"){
    const fw=false;
    const c1=0xc44820,c2=0xa03010,c3=0x882208,eyeC=0xff4400;
    body=bx(new THREE.BoxGeometry(1.4,.58,2.0),c1,{emissive:0x441100,emissiveIntensity:.6}); body.position.set(0,.5,0); gr.add(body);
    const wh=bx(new THREE.BoxGeometry(.68,.54,.62),c2); wh.position.set(0,.8,.7); gr.add(wh);
    const sn=bx(new THREE.BoxGeometry(.4,.28,.44),c3); sn.position.set(0,.64,1.02); gr.add(sn);
    const ns=bx(new THREE.BoxGeometry(.16,.1,.12),0x1a0808); ns.position.set(0,.68,1.22); gr.add(ns);
    [-1,1].forEach(sx=>{const ear=bx(new THREE.BoxGeometry(.14,.22,.1),c2);ear.position.set(sx*.24,.92,.62);gr.add(ear);});
    [[-0.48,.2,.6],[.48,.2,.6],[-0.48,.2,-.6],[.48,.2,-.6]].forEach(([lx,ly,lz])=>{const leg=bx(new THREE.BoxGeometry(.24,.56,.24),c2);leg.position.set(lx,ly,lz);gr.add(leg);});
    const tail=bx(new THREE.CylinderGeometry(.07,.12,.65,6),c3); tail.rotation.x=.85; tail.position.set(0,.6,-.92); gr.add(tail);
    [-1,1].forEach(sx=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.07,6,6),new THREE.MeshBasicMaterial({color:eyeC}));eye.position.set(sx*.18,.84,.94);gr.add(eye);});
    // ember glow particles
    for(let i=0;i<5;i++){const ep=new THREE.Mesh(new THREE.SphereGeometry(.06,4,4),new THREE.MeshBasicMaterial({color:0xff6600}));ep.position.set(Math.cos(i/5*Math.PI*2)*.5,.55+Math.random()*.3,Math.sin(i/5*Math.PI*2)*.5);gr.add(ep);}
  } else if(type==="magmawisp"){
    // Floating magma spirit — glowing orb with cracks
    body=bx(new THREE.SphereGeometry(.55,10,10),0xcc3300,{emissive:0xaa2200,emissiveIntensity:.7}); body.position.y=.8; gr.add(body);
    // Crack lines (dark wedges)
    for(let i=0;i<6;i++){const cr=bx(new THREE.BoxGeometry(.08,.52,.06),0x440800);cr.position.set(Math.cos(i/6*Math.PI*2)*.38,.78,Math.sin(i/6*Math.PI*2)*.38);cr.rotation.y=i/6*Math.PI*2;gr.add(cr);}
    // Lava core glow
    const core=new THREE.Mesh(new THREE.SphereGeometry(.28,8,8),new THREE.MeshBasicMaterial({color:0xff8800})); core.position.y=.8; gr.add(core);
    // Fire wisps
    for(let i=0;i<4;i++){const w=new THREE.Mesh(new THREE.ConeGeometry(.1,.35,5),new THREE.MeshBasicMaterial({color:0xff5500}));w.position.set(Math.cos(i/4*Math.PI*2)*.3,.8+.38,Math.sin(i/4*Math.PI*2)*.3);w.rotation.x=Math.PI;gr.add(w);}
    [-1,1].forEach(sx=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.1,8,8),new THREE.MeshBasicMaterial({color:0xffee00}));eye.position.set(sx*.18,.9,.48);gr.add(eye);});
  } else if(type==="colossus"){
    // Flame Colossus boss — massive fire-veined rock giant
    const sc=scale,rM=lm(0x4a2010,{emissive:0x330800,emissiveIntensity:.4}),lavM=lm(0xff4400,{emissive:0xcc2200,emissiveIntensity:.9});
    body=bx(new THREE.CylinderGeometry(.8*sc,.9*sc,2.4*sc,10),0x4a2010,{emissive:0x330800,emissiveIntensity:.4}); body.position.y=1.4*sc; gr.add(body);
    const shldr=bx(new THREE.BoxGeometry(2.4*sc,.9*sc,1.2*sc),0x4a2010,{emissive:0x330800,emissiveIntensity:.4}); shldr.position.set(0,2.6*sc,0); gr.add(shldr);
    const hd=bx(new THREE.DodecahedronGeometry(.72*sc,0),0x3a1808,{emissive:0x220800,emissiveIntensity:.4}); hd.position.set(0,3.4*sc,0); gr.add(hd);
    // Lava crack seams
    for(let i=0;i<6;i++){const lv=new THREE.Mesh(new THREE.BoxGeometry(.12*sc,2.4*sc,.08*sc),lavM);lv.position.set(Math.cos(i/6*Math.PI*2)*.78*sc,1.4*sc,Math.sin(i/6*Math.PI*2)*.78*sc);lv.rotation.y=i/6*Math.PI*2;gr.add(lv);}
    [-1,1].forEach(sx=>{const arm=bx(new THREE.CylinderGeometry(.2*sc,.32*sc,2.0*sc,8),0x4a2010,{emissive:0x330800,emissiveIntensity:.35});arm.position.set(sx*1.5*sc,2.5*sc,0);arm.rotation.z=sx*.6;gr.add(arm); for(let ci=0;ci<3;ci++){const claw=bx(new THREE.CylinderGeometry(.09*sc,.16*sc,.75*sc,6),0x3a1808,{emissive:0x220800,emissiveIntensity:.35});claw.position.set(sx*(2.02+ci*.1)*sc,(2.54-ci*.18)*sc,(-.2+ci*.2)*sc);claw.rotation.z=sx*.9;gr.add(claw);}});
    [-1,0,1].forEach(rx=>{const root=bx(new THREE.CylinderGeometry(.16*sc,.26*sc,.9*sc,6),0x3a1808,{emissive:0x220800,emissiveIntensity:.3});root.position.set(rx*.55*sc,.42*sc,rx===0?.55*sc:0);root.rotation.x=rx===0?-.3:0;root.rotation.z=rx*.28;gr.add(root);});
    [-1,1].forEach(sx=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.2*sc,8,8),new THREE.MeshBasicMaterial({color:0xffaa00}));eye.position.set(sx*.3*sc,3.45*sc,.6*sc);gr.add(eye);});
    // crown of fire
    for(let i=0;i<5;i++){const flame=new THREE.Mesh(new THREE.ConeGeometry(.14*sc,.5*sc,5),lavM);flame.position.set(Math.cos(i/5*Math.PI*2)*.54*sc,3.88*sc,Math.sin(i/5*Math.PI*2)*.54*sc);gr.add(flame);}
  } else if(type==="stormwisp"){
    // Storm spirit — crackling blue orb
    body=bx(new THREE.SphereGeometry(.55,10,10),0x3a6ad0,{emissive:0x2244cc,emissiveIntensity:.7}); body.position.y=.9; gr.add(body);
    const core=new THREE.Mesh(new THREE.SphereGeometry(.3,8,8),new THREE.MeshBasicMaterial({color:0xbfe0ff})); core.position.y=.9; gr.add(core);
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; const arc=new THREE.Mesh(new THREE.BoxGeometry(.05,.5,.05),new THREE.MeshBasicMaterial({color:0x9fd8ff})); arc.position.set(Math.cos(a)*.42,.9+Math.sin(i)*.1,Math.sin(a)*.42); arc.rotation.z=a; gr.add(arc); }
    for(let i=0;i<4;i++){ const w=new THREE.Mesh(new THREE.ConeGeometry(.1,.4,5),new THREE.MeshBasicMaterial({color:0x66ccff})); w.position.set(Math.cos(i/4*Math.PI*2)*.32,.9+.4,Math.sin(i/4*Math.PI*2)*.32); w.rotation.x=Math.PI; gr.add(w); }
    [-1,1].forEach(sx=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.1,8,8),new THREE.MeshBasicMaterial({color:0xffffff}));eye.position.set(sx*.18,1,.48);gr.add(eye);});
  } else if(type==="stormcaller"){
    // Stormcaller — towering storm elemental, floating core wreathed in cloud
    const sc=scale, cloudM=lm(0x44506a,{emissive:0x223a66,emissiveIntensity:.4}), arcM=new THREE.MeshBasicMaterial({color:0x9fd8ff});
    // legs / lower vortex
    const vortex=bx(new THREE.CylinderGeometry(.5*sc,1.4*sc,2.0*sc,8),0x3a4660,{emissive:0x182844,emissiveIntensity:.4}); vortex.position.y=1.0*sc; gr.add(vortex);
    body=bx(new THREE.BoxGeometry(1.7*sc,1.8*sc,1.0*sc),0x44506a,{emissive:0x223a66,emissiveIntensity:.45}); body.position.y=2.7*sc; gr.add(body);
    const shldr=bx(new THREE.BoxGeometry(2.5*sc,.85*sc,1.2*sc),0x3a4660,{emissive:0x182844,emissiveIntensity:.4}); shldr.position.set(0,3.7*sc,0); gr.add(shldr);
    const head=bx(new THREE.DodecahedronGeometry(.75*sc,0),0x55648a,{emissive:0x2a4a7a,emissiveIntensity:.5}); head.position.y=4.5*sc; gr.add(head);
    // glowing storm core in the chest
    const core=new THREE.Mesh(new THREE.SphereGeometry(.5*sc,12,12),new THREE.MeshBasicMaterial({color:0xbfe6ff})); core.position.set(0,2.8*sc,.45*sc); gr.add(core);
    // lightning arcs around the body
    for(let i=0;i<7;i++){ const a=i/7*Math.PI*2; const arc=new THREE.Mesh(new THREE.BoxGeometry(.08*sc,1.6*sc,.08*sc),arcM); arc.position.set(Math.cos(a)*1.0*sc,2.7*sc,Math.sin(a)*1.0*sc); arc.rotation.z=Math.sin(a)*.5; arc.rotation.x=Math.cos(a)*.5; gr.add(arc); }
    // arms with crackling fists
    [-1,1].forEach(sx=>{ const arm=bx(new THREE.CylinderGeometry(.22*sc,.34*sc,2.0*sc,8),0x3a4660,{emissive:0x182844,emissiveIntensity:.35}); arm.position.set(sx*1.6*sc,3.5*sc,0); arm.rotation.z=sx*.55; gr.add(arm); const fist=new THREE.Mesh(new THREE.IcosahedronGeometry(.42*sc,0),new THREE.MeshBasicMaterial({color:0x9fd8ff})); fist.position.set(sx*2.1*sc,2.7*sc,0); gr.add(fist); });
    [-1,1].forEach(sx=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.18*sc,8,8),new THREE.MeshBasicMaterial({color:0xffffff}));eye.position.set(sx*.3*sc,4.55*sc,.6*sc);gr.add(eye);});
    // storm crown
    for(let i=0;i<5;i++){ const fl=new THREE.Mesh(new THREE.ConeGeometry(.16*sc,.6*sc,5),arcM); fl.position.set(Math.cos(i/5*Math.PI*2)*.6*sc,5.0*sc,Math.sin(i/5*Math.PI*2)*.6*sc); gr.add(fl); }
  } else {
    // treant boss
    const sc=scale, tM=lm(0x4a6b3a,{emissive:0x002200,emissiveIntensity:.35}), bkM=lm(0x3a5228);
    body=bx(new THREE.CylinderGeometry(.7*sc,.95*sc,2.4*sc,10),0x4a6b3a,{emissive:0x002200,emissiveIntensity:.35}); body.position.y=1.4*sc; gr.add(body);
    const shldr=bx(new THREE.BoxGeometry(2.2*sc,.82*sc,1.1*sc),0x4a6b3a,{emissive:0x002200,emissiveIntensity:.35}); shldr.position.set(0,2.6*sc,0); gr.add(shldr);
    const top=bx(new THREE.DodecahedronGeometry(.72*sc,0),0x4a6b3a,{emissive:0x002200,emissiveIntensity:.35}); top.position.set(0,3.4*sc,0); gr.add(top);
    [-1,1].forEach(sx=>{ const arm=bx(new THREE.CylinderGeometry(.18*sc,.3*sc,1.9*sc,8),0x3a5228); arm.position.set(sx*1.42*sc,2.5*sc,0); arm.rotation.z=sx*.6; gr.add(arm); for(let ci=0;ci<3;ci++){ const claw=bx(new THREE.CylinderGeometry(.07*sc,.14*sc,.72*sc,6),0x3a5228); claw.position.set(sx*(1.96+ci*.08)*sc,(2.52-ci*.18)*sc,(-.18+ci*.18)*sc); claw.rotation.z=sx*.88; gr.add(claw); } });
    [-1,0,1].forEach(rx=>{ const root=bx(new THREE.CylinderGeometry(.14*sc,.24*sc,.85*sc,6),0x3a5228); root.position.set(rx*.52*sc,.4*sc,rx===0?.52*sc:0); root.rotation.x=rx===0?-.3:0; root.rotation.z=rx*.26; gr.add(root); });
    for(let k=0;k<5;k++){ const knot=bx(new THREE.DodecahedronGeometry(.2*sc,0),0x2e4420); knot.position.set(Math.cos(k/5*Math.PI*2)*.68*sc,1.2*sc+k*.32*sc,Math.sin(k/5*Math.PI*2)*.68*sc); gr.add(knot); }
    [-1,1].forEach(sx=>{ const eye=new THREE.Mesh(new THREE.SphereGeometry(.18*sc,8,8),new THREE.MeshBasicMaterial({color:0x55ff55})); eye.position.set(sx*.3*sc,3.42*sc,.58*sc); gr.add(eye); });
  }

  body.castShadow=true;
  const hbc=document.createElement("canvas"); hbc.width=64; hbc.height=10;
  const hbt=new THREE.CanvasTexture(hbc);
  const hbs=new THREE.Sprite(new THREE.SpriteMaterial({map:hbt,depthTest:false}));
  const hbW=type==="treant"?2.4*scale:type==="titan"||type==="colossus"||type==="stormcaller"?6:type==="bandit"||type==="skeleton"?1.6:type==="wraith"||type==="magmawisp"||type==="stormwisp"?1.5:1.4*scale;
  const hbY=type==="rootling"?1.3:type==="treant"?4.6*scale:type==="titan"||type==="colossus"?5.6*scale:type==="stormcaller"?5.8*scale:(type==="wolf"||type==="frostwolf"||type==="emberwolf"||type==="galehound")?1.8:type==="bandit"?2.9:type==="skeleton"?2.75:type==="wraith"||type==="magmawisp"||type==="stormwisp"?2.3:2.1*scale;
  hbs.scale.set(hbW,.22,1); hbs.position.y=hbY; gr.add(hbs);

  const y=floorFor(zoneKey,x,z);
  gr.position.set(x,y,z);
  zoneGroup(g,zoneKey).add(gr);
  const en={mesh:gr,body,hbCanvas:hbc,hbTex:hbt,hp,maxhp:hp,dmg,speed,xpVal:xp,type,tier,scale,zone:zoneKey,
    state:"wander",wanderT:0,wanderDir:Math.random()*Math.PI*2,attackCD:0,hitFlash:0,home:new THREE.Vector3(x,0,z),bob:Math.random()*6,dead:false,revived:false,aggro:sp.aggro};
  drawEHB(en); g.enemies.push(en);
  return en;
}
function drawEHB(en){
  const c=en.hbCanvas.getContext("2d"); c.clearRect(0,0,64,10);
  c.fillStyle="#1a0a0a"; c.fillRect(0,0,64,10);
  const cl=en.type==="treant"?"#4aaa3a":en.type==="wolf"?"#88bb55":en.type==="bandit"?"#bb8833":en.type==="skeleton"?"#aadd99":"#d6452f";
  c.fillStyle=cl; c.fillRect(1,1,62*Math.max(0,en.hp/en.maxhp),8); en.hbTex.needsUpdate=true;
}

/* ── Player ── */
function buildWeapon(mk, armR, weaponKey){
  const k=weaponKey||"iron_sword";
  const isStaff=k==="ash_staff"||k.includes("staff");
  const isBow=k==="hunter_bow"||k.includes("bow");
  const wGrp=new THREE.Group();

  if(isStaff){
    // Mage staff — held outward, pole pointing forward (+Z), glowing orb at the tip
    wGrp.position.set(.08,-.5,.08); wGrp.rotation.z=.04;
    const pole=mk(new THREE.CylinderGeometry(.044,.05,1.8,8),0x4a3010); pole.rotation.x=Math.PI/2; pole.position.set(0,0,.7); wGrp.add(pole);
    const bind=mk(new THREE.CylinderGeometry(.075,.075,.12,8),0x7a6020); bind.rotation.x=Math.PI/2; bind.position.set(0,0,1.5); wGrp.add(bind);
    const orb=new THREE.Mesh(new THREE.SphereGeometry(.19,12,12),new THREE.MeshLambertMaterial({color:0x8844ff,emissive:0x5522cc,emissiveIntensity:.9,transparent:true,opacity:.9}));
    orb.position.set(0,0,1.72); wGrp.add(orb);
    for(let i=0;i<4;i++){ const cr=mk(new THREE.BoxGeometry(.06,.06,.28),0xcc88ff); cr.position.set(Math.cos(i/4*Math.PI*2)*.22,Math.sin(i/4*Math.PI*2)*.22,1.72); wGrp.add(cr); }
    wGrp.userData.orb=orb;
  } else if(isBow){
    // Ranger shortbow — held in right hand, arrow nocked pointing forward (+Z)
    wGrp.position.set(.12,-.5,.06); wGrp.rotation.z=.05;
    const limbMat=new THREE.MeshLambertMaterial({color:0x6b4a1a,flatShading:true});
    const up=new THREE.Mesh(new THREE.CylinderGeometry(.028,.045,.66,6),limbMat); up.position.set(0,.32,.05); up.rotation.x=-.34; wGrp.add(up);
    const lo=new THREE.Mesh(new THREE.CylinderGeometry(.045,.028,.66,6),limbMat); lo.position.set(0,-.32,.05); lo.rotation.x=.34; wGrp.add(lo);
    const grip=mk(new THREE.CylinderGeometry(.05,.05,.3,8),0x3a2008); wGrp.add(grip);
    // bowstring (vertical, slightly forward) — pulls back during draw
    const str=mk(new THREE.BoxGeometry(.012,1.16,.012),0xe8dcb0); str.position.set(0,0,.16); wGrp.add(str);
    // nocked arrow group, points FORWARD (+Z); slides back during draw
    const arrow=new THREE.Group();
    const shaft=mk(new THREE.CylinderGeometry(.016,.016,.82,6),0x8a6030); shaft.rotation.x=Math.PI/2; shaft.position.set(0,0,.45); arrow.add(shaft);
    const tip=mk(new THREE.ConeGeometry(.05,.15,6),0xccd2da); tip.rotation.x=Math.PI/2; tip.position.set(0,0,.92); arrow.add(tip);
    const fletch=mk(new THREE.BoxGeometry(.012,.15,.15),0xcc4422); fletch.position.set(0,0,.1); arrow.add(fletch);
    wGrp.add(arrow);
    wGrp.userData.arrow=arrow; wGrp.userData.str=str; wGrp.userData.strZ=.16;
  } else {
    // Warrior / default sword — held outward, blade pointing forward (+Z), level
    wGrp.position.set(.1,-.5,.08); wGrp.rotation.z=.04;
    const pom=mk(new THREE.SphereGeometry(.07,8,8),0x9a8a52); pom.position.set(0,0,-.18); wGrp.add(pom);
    const grip=mk(new THREE.CylinderGeometry(.045,.045,.26,8),0x5c3e22); grip.rotation.x=Math.PI/2; grip.position.set(0,0,-.02); wGrp.add(grip);
    const guard=mk(new THREE.BoxGeometry(.42,.1,.08),0x9a8a52); guard.position.set(0,0,.14); wGrp.add(guard);
    const blade=mk(new THREE.BoxGeometry(.09,.045,.92),0xd6dce4); blade.position.set(0,0,.66); wGrp.add(blade);
    const fuller=mk(new THREE.BoxGeometry(.022,.02,.92),0xeaf2ff); fuller.position.set(0,.014,.66); wGrp.add(fuller);
    const tipB=mk(new THREE.ConeGeometry(.06,.18,4),0xeaf2ff); tipB.rotation.x=Math.PI/2; tipB.position.set(0,0,1.16); wGrp.add(tipB);
  }
  armR.add(wGrp);
  return wGrp;
}
function makePlayer(g){
  const cls=g.saveState?.cls||"Warrior";
  const gr=new THREE.Group();
  const mk=(geo,col)=>{ const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:col,flatShading:true})); m.castShadow=true; return m; };

  // Appearance from character creation
  const SKIN_TONES=[0xf4d4b0,0xe8b896,0xc8945a,0x8b5e3c,0x4a2f1e];
  const HAIR_COLS =[0x2c1e14,0x6b3c18,0xc8a23a,0x7a2e12,0x8a8a8a,0xe8e8e0];
  const skinHex=SKIN_TONES[g.saveState?.skinTone||0]||0xe8b896;
  const hairHex=HAIR_COLS[g.saveState?.hairCol||0]||0x2c1e14;

  // Class-based palette
  const pal={
    Warrior:{ torso:0x3a6088, chest:0x2d5070, legs:0x253850, accent:0x4a7aa8 },
    Ranger: { torso:0x5a3e1e, chest:0x4a3018, legs:0x3a2a14, accent:0x7a5a2a },
    Mage:   { torso:0x4a2a7a, chest:0x3a1e60, legs:0x362060, accent:0x7a44cc },
  }[cls]||{ torso:0x3a6088, chest:0x2d5070, legs:0x253850, accent:0x4a7aa8 };

  const torso=mk(new THREE.BoxGeometry(.72,.94,.46),pal.torso); torso.position.set(0,1.14,0); gr.add(torso);
  const chest=mk(new THREE.BoxGeometry(.58,.48,.48),pal.chest); chest.position.set(0,1.18,0); gr.add(chest);
  const neck=mk(new THREE.BoxGeometry(.24,.2,.24),skinHex); neck.position.set(0,1.64,0); gr.add(neck);
  const head=mk(new THREE.BoxGeometry(.46,.46,.46),skinHex); head.position.set(0,1.84,0); gr.add(head);
  const hair=mk(new THREE.BoxGeometry(.5,.2,.5),hairHex); hair.position.set(0,2.05,-.04); gr.add(hair);
  // Face (on the +Z front of the head) — visible from front
  const faceMat=new THREE.MeshBasicMaterial({color:0x1a1410});
  const whiteMat=new THREE.MeshBasicMaterial({color:0xf4f0e8});
  [-1,1].forEach(sx=>{
    const sclera=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.04),whiteMat); sclera.position.set(sx*.115,1.88,.235); gr.add(sclera);
    const pupil=new THREE.Mesh(new THREE.BoxGeometry(.065,.085,.04),faceMat); pupil.position.set(sx*.115,1.87,.246); gr.add(pupil);
    const brow=new THREE.Mesh(new THREE.BoxGeometry(.15,.035,.03),new THREE.MeshBasicMaterial({color:hairHex})); brow.position.set(sx*.115,1.99,.24); gr.add(brow);
  });
  const mouth=new THREE.Mesh(new THREE.BoxGeometry(.18,.035,.03),faceMat); mouth.position.set(0,1.7,.24); gr.add(mouth);

  // Class accent detail on chest
  const detail=mk(new THREE.BoxGeometry(.5,.18,.5),pal.accent); detail.position.set(0,1.32,0); gr.add(detail);

  // Visible equipment overlays (hidden until armor is equipped)
  const armHelmet=mk(new THREE.BoxGeometry(.54,.42,.54),0x9aa0aa); armHelmet.position.set(0,1.88,0); armHelmet.visible=false; gr.add(armHelmet);
  const armCrest=mk(new THREE.BoxGeometry(.1,.22,.4),0xcc4433); armCrest.position.set(0,2.18,0); armCrest.visible=false; gr.add(armCrest);
  const armChest=mk(new THREE.BoxGeometry(.8,.66,.52),0x9aa0aa); armChest.position.set(0,1.2,0); armChest.visible=false; gr.add(armChest);
  const armPaulL=mk(new THREE.BoxGeometry(.32,.3,.36),0x9aa0aa); armPaulL.position.set(-.44,1.52,0); armPaulL.visible=false; gr.add(armPaulL);
  const armPaulR=mk(new THREE.BoxGeometry(.32,.3,.36),0x9aa0aa); armPaulR.position.set(.44,1.52,0); armPaulR.visible=false; gr.add(armPaulR);

  const legL=new THREE.Group(); legL.position.set(-.19,.82,0);
  const lLm=mk(new THREE.BoxGeometry(.28,.82,.3),pal.legs); lLm.position.set(0,-.41,0); legL.add(lLm);
  const bootL=mk(new THREE.BoxGeometry(.3,.22,.38),0x2a1e10); bootL.position.set(0,-.9,.06); legL.add(bootL);
  gr.add(legL);
  const legR=new THREE.Group(); legR.position.set(.19,.82,0);
  const lRm=mk(new THREE.BoxGeometry(.28,.82,.3),pal.legs); lRm.position.set(0,-.41,0); legR.add(lRm);
  const bootR=mk(new THREE.BoxGeometry(.3,.22,.38),0x2a1e10); bootR.position.set(0,-.9,.06); legR.add(bootR);
  gr.add(legR);

  const armL=new THREE.Group(); armL.position.set(-.52,1.54,0);
  const armLmesh=mk(new THREE.BoxGeometry(.24,.74,.26),pal.torso); armLmesh.position.set(0,-.37,0); armL.add(armLmesh);
  armL.rotation.x=.08; gr.add(armL);

  const armR=new THREE.Group(); armR.position.set(.52,1.54,0);
  const armRmesh=mk(new THREE.BoxGeometry(.24,.74,.26),pal.torso); armRmesh.position.set(0,-.37,0); armR.add(armRmesh);
  const weaponKey=g.saveState?.equip?.weapon||g.saveState?.cls&&{Warrior:"iron_sword",Ranger:"hunter_bow",Mage:"ash_staff"}[g.saveState.cls]||"iron_sword";
  const weaponGrp=buildWeapon(mk,armR,weaponKey);
  armR.rotation.x=.12; gr.add(armR);

  const shield=mk(new THREE.BoxGeometry(.09,.84,.64),0x3a4a8a);
  shield.position.set(-.52,1.15,.22); shield.visible=false; gr.add(shield);

  const s=g.saveState;
  gr.position.set(s.pos?.x||0,tH(s.pos?.x||0,s.pos?.z||8),s.pos?.z||8);
  gr.rotation.y=Math.PI;
  g.scene.add(gr);
  g.player=gr; g.playerData={head,legL,legR,armR,armL,weaponGrp,shield,walk:0,armHelmet,armCrest,armChest,armPaulL,armPaulR,weaponKey};
  updatePlayerArmor(g,g.saveState);
}
function updatePlayerArmor(g,state){
  const pd=g.playerData; if(!pd||!state) return;
  const eq=state.equip||{};
  const colOf=k=>{ const it=ITEMS[k]; return (it&&typeof it.col==="number")?it.col:0x9aa0aa; };
  if(pd.armHelmet){ const k=eq.helmet; pd.armHelmet.visible=!!k; if(k){ pd.armHelmet.material.color.setHex(colOf(k)); pd.armCrest.visible=!!ITEMS[k]?.crest; if(ITEMS[k]?.crest) pd.armCrest.material.color.setHex(ITEMS[k].crest); } else pd.armCrest.visible=false; }
  if(pd.armChest){ const k=eq.chest; const v=!!k; pd.armChest.visible=v; pd.armPaulL.visible=v; pd.armPaulR.visible=v; if(k){ const c=colOf(k); pd.armChest.material.color.setHex(c); pd.armPaulL.material.color.setHex(c); pd.armPaulR.material.color.setHex(c); } }
  // Rebuild held weapon mesh if the equipped weapon changed
  const wk=eq.weapon||"iron_sword";
  if(pd.weaponKey!==wk && pd.armR){
    if(pd.weaponGrp){ pd.armR.remove(pd.weaponGrp); }
    const mk=(geo,col)=>{ const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:col,flatShading:true})); m.castShadow=true; return m; };
    pd.weaponGrp=buildWeapon(mk,pd.armR,wk); pd.weaponKey=wk;
  }
}

/* ── Pickups ── */
function spawnPickup(g,itemKey,x,z,amount=1,gold=0){
  const gr=new THREE.Group(); let mesh;
  if(gold>0){ mesh=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.06,10),new THREE.MeshLambertMaterial({color:0xf0c659,emissive:0x6b4a13,emissiveIntensity:.5})); mesh.rotation.x=Math.PI/2; }
  else { const it=ITEMS[itemKey]; const col=it?.type==="weapon"?0xd9dde2:it?.type==="armor"?0x7a88cc:it?.type==="material"?0x6fae5a:0xc14f7d; mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.3,0),new THREE.MeshLambertMaterial({color:col,emissive:0x111111,emissiveIntensity:.3})); }
  mesh.castShadow=true; gr.add(mesh);
  const zoneKey=g.zone||"overworld";
  gr.position.set(x,floorFor(zoneKey,x,z)+.7,z);
  zoneGroup(g,zoneKey).add(gr);
  g.pickups.push({mesh:gr,item:itemKey,amount,gold,spin:Math.random()*6,zone:zoneKey});
}

/* ── Combat ── */
function weaponClass(state){ const wk=(state.equip&&state.equip.weapon)||""; if(wk.includes("staff")) return "staff"; if(wk.includes("bow")) return "bow"; return "melee"; }
function startLightAtk(g,state){
  if(g.attacking||g.paused||g.dlgState) return;
  if(state.st<8) return;
  state.st-=8; g.attacking=true; g.attackTimer=0; g.attackHit=false; g.attackHeavy=false;
  const wc=weaponClass(state); g.attackRanged=(wc!=="melee"); g.pendingShot=null;
  if(wc==="bow"){ g.pendingShot=()=>{ fireProjectile(g,state,"arrow",1); SFX.bow(); }; }
  else if(wc==="staff"){ g.pendingShot=()=>{ fireProjectile(g,state,"magic",1); SFX.magic(); }; }
  else SFX.swing();
}
function startHeavyAtk(g,state,toast){
  if(g.attacking||g.paused||g.dlgState) return;
  if(state.st<25){ toast?.("Not enough stamina"); return; }
  state.st-=25; g.attacking=true; g.attackTimer=0; g.attackHit=false; g.attackHeavy=true;
  const wc=weaponClass(state); g.attackRanged=(wc!=="melee"); g.pendingShot=null;
  if(wc==="bow"){ g.pendingShot=()=>{ fireProjectile(g,state,"arrow",1.7); fireProjectile(g,state,"arrow",1.7,.22); fireProjectile(g,state,"arrow",1.7,-.22); SFX.bow(); }; }
  else if(wc==="staff"){ g.pendingShot=()=>{ fireProjectile(g,state,"magic",2.0); SFX.magic(); }; }
  else SFX.heavy();
}
function fireProjectile(g,state,kind,mult,spread){
  const p=g.player.position,yaw=g.input.yaw+(spread||0);
  const fx=Math.sin(yaw),fz=Math.cos(yaw);
  const cs=calcStats(state);
  const dmg=Math.max(1,Math.round(cs.atkTotal*(mult||1)*(.9+Math.random()*.25)));
  let mesh,speed;
  if(kind==="magic"){
    mesh=new THREE.Mesh(new THREE.SphereGeometry(.22,10,10),new THREE.MeshBasicMaterial({color:0xb066ff}));
    const halo=new THREE.Mesh(new THREE.SphereGeometry(.36,8,8),new THREE.MeshBasicMaterial({color:0x8844ff,transparent:true,opacity:.4})); mesh.add(halo);
    speed=24;
  } else {
    mesh=new THREE.Group();
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1.0,6),new THREE.MeshLambertMaterial({color:0x8a6030,flatShading:true})); shaft.rotation.x=Math.PI/2; mesh.add(shaft);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.07,.2,6),new THREE.MeshLambertMaterial({color:0xccd2da,flatShading:true})); tip.rotation.x=Math.PI/2; tip.position.z=.55; mesh.add(tip);
    const fl=new THREE.Mesh(new THREE.BoxGeometry(.16,.02,.18),new THREE.MeshLambertMaterial({color:0xcc4422,flatShading:true})); fl.position.z=-.45; mesh.add(fl);
    speed=30;
  }
  mesh.position.set(p.x+fx*1.1,(p.y||0)+1.2,p.z+fz*1.1);
  mesh.rotation.y=yaw;
  zoneGroup(g,g.zone).add(mesh);
  g.projectiles.push({mesh,vx:fx*speed,vz:fz*speed,dmg,life:1.6,kind,zone:g.zone,hit:false});
}
function updateProjectiles(g,dt,state,toast){
  const cs=calcStats(state);
  for(let i=g.projectiles.length-1;i>=0;i--){
    const pr=g.projectiles[i];
    if(pr.zone!==g.zone){ pr.mesh.parent?.remove(pr.mesh); g.projectiles.splice(i,1); continue; }
    pr.mesh.position.x+=pr.vx*dt; pr.mesh.position.z+=pr.vz*dt; pr.life-=dt;
    if(pr.kind==="magic") pr.mesh.rotation.y+=dt*6;
    let consumed=false;
    for(const en of g.enemies){
      if(en.dead||en.hp<=0||en.zone!==g.zone) continue;
      const dx=en.mesh.position.x-pr.mesh.position.x, dz=en.mesh.position.z-pr.mesh.position.z;
      const rad=1.0+(en.scale||1)*.5;
      if(dx*dx+dz*dz < rad*rad){
        const crit=Math.random()<(cs.dex*.005+.05);
        const dmg=Math.max(1,Math.round(pr.dmg*(crit?1.8:1)));
        en.hp-=dmg; en.hitFlash=.14; en.state="chase";
        drawEHB(en); SFX.hit();
        addDmgNum(g,en.mesh.position.x,en.mesh.position.y+1.6,en.mesh.position.z,dmg,crit);
        spawnSparks(g,pr.mesh.position.x,pr.mesh.position.y,pr.mesh.position.z,pr.kind==="magic");
        consumed=true; break;
      }
    }
    if(consumed||pr.life<=0){ pr.mesh.parent?.remove(pr.mesh); g.projectiles.splice(i,1); }
  }
}
function resolveHit(g,state){
  const p=g.player.position;
  const cs=calcStats(state);
  const base=cs.atkTotal*(g.attackHeavy?2.4:1)*(.85+Math.random()*.3);
  const reach=g.attackHeavy?3.8:3.0;
  // Snap player to face nearest in-range enemy so you always connect
  let nearest=null, nearD=reach;
  g.enemies.forEach(en=>{
    if(en.hp<=0||en.zone!==g.zone) return;
    const d=Math.hypot(en.mesh.position.x-p.x,en.mesh.position.z-p.z);
    if(d<nearD){ nearD=d; nearest=en; }
  });
  if(nearest) g.player.rotation.y=Math.atan2(nearest.mesh.position.x-p.x, nearest.mesh.position.z-p.z);
  const fy=g.player.rotation.y, fx=Math.sin(fy), fz=Math.cos(fy);
  g.enemies.forEach(en=>{
    if(en.hp<=0||en.zone!==g.zone) return;
    const dx=en.mesh.position.x-p.x,dz=en.mesh.position.z-p.z,dd=Math.hypot(dx,dz);
    // Wide 210° arc so anything roughly in front or to the sides connects
    if(dd<reach && (dd<1.2 || (dx*fx+dz*fz)/(dd)>-.35)){
      const crit=Math.random()<(cs.dex*.005+.05);
      const dmg=Math.max(1,Math.round(base*(crit?1.8:1)));
      en.hp-=dmg; en.hitFlash=.14; en.state="chase";
      en.mesh.position.x+=(dx/dd||0)*.4; en.mesh.position.z+=(dz/dd||0)*.4;
      drawEHB(en); SFX.hit();
      addDmgNum(g,en.mesh.position.x,en.mesh.position.y+1.3,en.mesh.position.z,dmg,crit);
      spawnSparks(g,en.mesh.position.x,en.mesh.position.y+.9,en.mesh.position.z,crit);
    }
  });
}
function addDmgNum(g,x,y,z,val,crit){ g.dmgNums.push({x,y,z,val,crit,life:1.1,vy:.05}); }
function spawnSparks(g,x,y,z,big){
  for(let i=0;i<(big?10:5);i++){
    const m=new THREE.Mesh(new THREE.TetrahedronGeometry(.12,0),new THREE.MeshBasicMaterial({color:big?0xff5522:0xffcc44}));
    m.position.set(x,y,z); g.scene.add(m);
    g.sparks.push({m,life:.4,v:new THREE.Vector3((Math.random()-.5)*4,Math.random()*3+1,(Math.random()-.5)*4)});
  }
}
function tryJump(g){ if(g.grounded&&!g.paused&&!g.dlgState){ g.pVel.y=8.5; g.grounded=false; } }

/* ═══════════════════════════════════════════════════════════
   UPDATE LOOP FUNCTIONS
═══════════════════════════════════════════════════════════ */
function updatePlayer(g,dt,state){
  const p=g.player,pd=g.playerData,inp=g.input;
  // camera-relative: forward = +into screen, strafe = +right
  let fwd    = (inp.f - inp.b) - (g.touchMove.y||0);   // joystick up (negative y) = forward
  let strafe = (inp.r - inp.l) + (g.touchMove.x||0);
  const mag=Math.hypot(strafe,fwd), cs=calcStats(state);
  const spd=state.speed*cs.speedMult*(g.blocking?.5:1)*(g.sprint&&state.st>0?1.5:1)*(g.rollTimer>0?2.2:1);
  let moving=false;
  if(mag>.05){
    moving=true; const nm=mag>1?1/mag:1; strafe*=nm; fwd*=nm;
    const yaw=inp.yaw,s=Math.sin(yaw),c=Math.cos(yaw);
    const wx = fwd*s - strafe*c;
    const wz = fwd*c + strafe*s;
    p.rotation.y=lerpAngle(p.rotation.y,Math.atan2(wx,wz),.2);
    p.position.x+=wx*spd*dt; p.position.z+=wz*spd*dt; pd.walk+=dt*spd*1.4;
    if(g.sprint&&state.st>0) state.st=Math.max(0,state.st-dt*12);
  } else pd.walk*=.8;

  const ow=g.zone==="overworld";
  if(ow){ const dist=Math.hypot(p.position.x,p.position.z); if(dist>112){p.position.x*=112/dist;p.position.z*=112/dist;} }
  else if(g.zone==="dungeon"){
    p.position.x=clamp(p.position.x,g.dunXMin||-36,g.dunXMax||36); p.position.z=clamp(p.position.z,g.dunMinZ,g.dunMaxZ);
    if(g.dunWalls){ const pr=.5;
      for(const w of g.dunWalls){ if(w.open) continue;
        if(p.position.x>w.x1-pr&&p.position.x<w.x2+pr&&p.position.z>w.z1-pr&&p.position.z<w.z2+pr){
          const dl=p.position.x-(w.x1-pr),dr=(w.x2+pr)-p.position.x,db=p.position.z-(w.z1-pr),dtp=(w.z2+pr)-p.position.z;
          const mn=Math.min(dl,dr,db,dtp);
          if(mn===dl)p.position.x=w.x1-pr; else if(mn===dr)p.position.x=w.x2+pr; else if(mn===db)p.position.z=w.z1-pr; else p.position.z=w.z2+pr;
        }
      }
    }
  }
  else if(g.zone==="frost"){ p.position.x=clamp(p.position.x,-18,18); p.position.z=clamp(p.position.z,-28,20); }
  else { const r=g.townRadius||40; const dist=Math.hypot(p.position.x,p.position.z); if(dist>r){p.position.x*=r/dist;p.position.z*=r/dist;} }
  g.props.forEach(pr=>{ if((pr.zone||"overworld")!==g.zone) return; const dx=p.position.x-pr.pos.x,dz=p.position.z-pr.pos.z,dd=Math.hypot(dx,dz),rad=(pr.radius||1)+.5; if(dd<rad&&dd>.001){p.position.x=pr.pos.x+dx/dd*rad;p.position.z=pr.pos.z+dz/dd*rad;} });

  const floorY=floorAt(g,p.position.x,p.position.z);
  g.pVel.y-=24*dt; p.position.y+=g.pVel.y*dt;
  if(p.position.y<=floorY){ p.position.y=floorY; g.pVel.y=0; g.grounded=true; }

  if(!g.attacking){
    if(moving){
      // Legs swing from hip pivot (smaller angle looks same visual arc since proper pivot)
      pd.legL.rotation.x = Math.sin(pd.walk)*.65;
      pd.legR.rotation.x = -Math.sin(pd.walk)*.65;
      // Arms oppose legs (natural cross-lateral gait)
      pd.armL.rotation.x = .08 + Math.sin(pd.walk)*.48;
      pd.armR.rotation.x = .10 - Math.sin(pd.walk)*.42;
    } else {
      // Smooth return to natural resting pose (slight forward hang)
      pd.legL.rotation.x = lerp(pd.legL.rotation.x, 0, .14);
      pd.legR.rotation.x = lerp(pd.legR.rotation.x, 0, .14);
      pd.armL.rotation.x = lerp(pd.armL.rotation.x, .08, .10);
      pd.armR.rotation.x = lerp(pd.armR.rotation.x, .10, .10);
    }
  }
  pd.shield.visible=g.blocking;

  if(g.attacking){
    g.attackTimer+=dt; const dur=g.attackHeavy?.7:.42, t=g.attackTimer/dur;
    if(g.attackRanged){
      const wc=weaponClass(state); const ud=pd.weaponGrp&&pd.weaponGrp.userData;
      if(wc==="bow"){
        pd.armR.rotation.x = -1.25;            // raise bow level
        pd.armL.rotation.x = -1.25;            // drawing hand
        // Minecraft-style nock-and-draw: pull arrow + string back, then loose
        const draw = t<.62 ? (t/.62) : Math.max(0,1-(t-.62)/.25);
        if(ud&&ud.arrow){ ud.arrow.position.z = -draw*.42; if(ud.str) ud.str.position.z = (ud.strZ||.16) - draw*.42; }
        if(t>=.62 && g.pendingShot){ g.pendingShot(); g.pendingShot=null; } // loose on release
      } else { // staff cast — recoil backward, loose the bolt at the apex
        pd.armR.rotation.x = .10 - Math.sin(Math.min(t,1)*Math.PI)*1.9;
        pd.armL.rotation.x = .08;
        if(t>=.45 && g.pendingShot){ g.pendingShot(); g.pendingShot=null; }
      }
    } else {
      pd.armR.rotation.x=-2.0*Math.sin(Math.min(t,1)*Math.PI)*(g.attackHeavy?1.4:1);
    }
    if(!g.attackHit&&t>.35){ g.attackHit=true; if(!g.attackRanged) resolveHit(g,state); }
    if(t>=1){
      g.attacking=false; pd.armR.rotation.x=.10; pd.armL.rotation.x=.08;
      if(g.pendingShot){ g.pendingShot(); g.pendingShot=null; }
      const ud=pd.weaponGrp&&pd.weaponGrp.userData; if(ud&&ud.arrow){ ud.arrow.position.z=0; if(ud.str) ud.str.position.z=(ud.strZ||.16); }
    }
  }
}

function updateEnemies(g,dt,state,toast,setQuestTrack){
  const p=g.player.position;
  g.enemies.forEach(en=>{
    if(en.dead||en.zone!==g.zone) return;
    const m=en.mesh; en.bob+=dt*4;
    const dx=p.x-m.position.x,dz=p.z-m.position.z,dist=Math.hypot(dx,dz);
    if(dist<en.aggro) en.state="chase"; else if(dist>en.aggro*2&&en.state==="chase") en.state="patrol";
    if(en.state==="chase"){
      if(dist>1.5*en.scale){ m.position.x+=dx/dist*en.speed*dt; m.position.z+=dz/dist*en.speed*dt; m.rotation.y=Math.atan2(dx/dist,dz/dist); }
      else { en.attackCD-=dt; if(en.attackCD<=0){ en.attackCD=en.type==="wolf"?.8:en.type==="treant"?2.4:1.2; if(g.invuln<=0) damagePlayer(g,state,en.dmg,toast); } }
    } else {
      en.wanderT-=dt;
      if(en.wanderT<=0){ en.wanderT=2+Math.random()*3; en.wanderDir+=(-1+Math.random()*2)*1.2; }
      m.position.x+=Math.sin(en.wanderDir)*en.speed*.4*dt; m.position.z+=Math.cos(en.wanderDir)*en.speed*.4*dt;
      const hd=Math.hypot(en.home.x-m.position.x,en.home.z-m.position.z);
      if(hd>14){ m.position.x+=(en.home.x-m.position.x)*dt*.4; m.position.z+=(en.home.z-m.position.z)*dt*.4; }
    }
    m.position.y=floorAt(g,m.position.x,m.position.z)+(en.type==="wraith"||en.type==="magmawisp"?.7+Math.sin(en.bob)*.28:Math.sin(en.bob)*(en.type==="corrupted"||en.type==="treant"?.1:0));
    en.body.material.emissiveIntensity=en.hitFlash>0?(en.hitFlash-=dt,Math.min(.9,en.hitFlash*6)):.4;
    if(en.hp<=0&&!en.dead){
      if(en.type==="skeleton"&&!en.revived){ en.revived=true; en.hp=Math.ceil(en.maxhp*.4); en.hitFlash=.3; drawEHB(en); toast("The skeleton rises again!"); return; }
      en.dead=true; m.parent?.remove(m);
      dropEnemyLoot(g,en);
      gainXP(state,en.xpVal,toast); updateHUD(g,g.setUi);
      const q=state.quest;
      if(q?.greeted&&!q?.completed&&q.kills<q.need&&en.zone==="overworld"){ q.kills++; updateQuestTrack(state,setQuestTrack); if(q.kills>=q.need){toast("Grove cleansed — return to the Spirit");SFX.quest();} }
      if(en.type==="wolf"&&state.sq?.wolves?.s===1){ const w=state.sq.wolves; w.p++; if(w.p>=4){w.s=2;toast("Wolf Hunt done — return to Hunter Bryn");SFX.quest();} else toast(`Wolves: ${w.p}/4`); }
      if(en.type==="treant"){
        state.inv.earth_relic=(state.inv.earth_relic||0)+1; state.quest.hasEarthRelic=true;
        state.inv.heartwood_edge=(state.inv.heartwood_edge||0)+1;
        gainXP(state,260,toast);
        if(g.altarGlow)g.altarGlow.visible=false;
        g.bossActive=false; g.setBoss?.(null); if(g.bossRing){g.bossRing.material.opacity=0;}
        // clear summoned rootlings
        g.enemies.forEach(e=>{ if(e.type==="rootling"&&!e.dead){ e.dead=true; e.mesh.parent?.remove(e.mesh); } });
        toast("⚜ You obtained the EARTH RELIC!"); toast("🌳 Legendary: Heartwood Edge!"); SFX.levelup(); updateQuestTrack(state,setQuestTrack);
        // Guardian Spirit materializes by the altar
        if(!g.dunSpiritSpawned){ g.dunSpiritSpawned=true; addNPC(g,"dungeon",{name:"Guardian Spirit",kind:"dspirit",spirit:true,x:0,z:-86,col:0x88bbee}); toast("A Guardian Spirit shimmers into being by the altar…"); }
        // Reveal Stonewatch on the world map
        state.stonewatch=true; if(g.stonewatch) g.stonewatch.visible=true;
      }
      if(en.type==="titan"){ state.inv.frost_relic=(state.inv.frost_relic||0)+1; state.quest.hasFrostRelic=true; if(g.frostAltarGlow)g.frostAltarGlow.visible=false; toast("❄ You obtained the FROST RELIC!"); SFX.levelup(); updateQuestTrack(state,setQuestTrack); }
      if(en.type==="colossus"){ state.inv.flame_relic=(state.inv.flame_relic||0)+1; state.quest.hasFlameRelic=true; if(g.flameAltarGlow)g.flameAltarGlow.visible=false; toast("🔥 You obtained the FLAME RELIC!"); SFX.levelup(); updateQuestTrack(state,setQuestTrack); }
      if(en.type==="stormcaller"){
        state.inv.storm_relic=(state.inv.storm_relic||0)+1; state.quest.hasStormRelic=true;
        state.inv.tempest_glaive=(state.inv.tempest_glaive||0)+1;
        gainXP(state,400,toast);
        if(g.stormAltarGlow)g.stormAltarGlow.visible=false;
        g.bossActive=false; g.setBoss?.(null); if(g.bossRing){g.bossRing.material.opacity=0;}
        g.enemies.forEach(e=>{ if((e.type==="stormwisp"||e.type==="galehound")&&!e.dead){ e.dead=true; e.mesh.parent?.remove(e.mesh); } });
        toast("⚡ You obtained the STORM RELIC!"); toast("⚡ Legendary: Tempest Glaive!"); SFX.levelup(); updateQuestTrack(state,setQuestTrack);
        const q=state.quest;
        if(q.hasEarthRelic&&q.hasFrostRelic&&q.hasFlameRelic&&q.hasStormRelic&&!q.heartstoneRestored){
          q.heartstoneRestored=true; if(state.story) state.story.stage=9;
          setTimeout(()=>toast("✦ All Four Relics are gathered…"),900);
          setTimeout(()=>toast("✦ The Heartstone blazes back to life!"),2200);
          setTimeout(()=>toast("✦ The Hollow King's shadow recoils from Verandiah."),3600);
          setTimeout(()=>toast("🏆 The land is saved, Warden. Your legend endures."),5000);
        }
      }
    }
  });
  g.enemies=g.enemies.filter(e=>!e.dead);
  // Stormcaller — final-boss HP bar while in the Stormspire
  if(g.zone==="stormspire"){
    const sc=g.enemies.find(e=>e.type==="stormcaller"&&!e.dead);
    if(sc){ g.scUiT=(g.scUiT||0)+dt; if(g.scUiT>.12){ g.scUiT=0; g.scBarOn=true; g.setBoss?.({name:"Stormcaller, Herald of the Tempest",hp:Math.max(0,sc.hp),max:sc.maxhp}); } }
    else if(g.scBarOn){ g.scBarOn=false; g.setBoss?.(null); }
  } else if(g.scBarOn){ g.scBarOn=false; g.setBoss?.(null); }
}
function dropEnemyLoot(g,en){
  const x=en.mesh.position.x,z=en.mesh.position.z,tier=en.tier||1;
  spawnPickup(g,null,x,z,0,tier>=2?14+Math.floor(Math.random()*20):5+Math.floor(Math.random()*10));
  const D={
    corrupted:[["potion_minor",.45],["corrupt_shard",.35],["steel_sword",.07]],
    wolf:[["wolf_pelt",.7],["potion_minor",.25]],
    bandit:[["bandit_badge",.6],["bandit_blade",.15],["potion_minor",.3]],
    skeleton:[["bone_fragment",.7],["leather_helm",.12],["mana_potion",.2]],
    treant:[["treant_heart",1],["warden_blade",.5],["warden_robes",.4]],
    frostwolf:[["frost_shard",.6],["potion_greater",.25],["frost_helm",.05]],
    wraith:[["frost_shard",.7],["mana_potion",.4],["frost_blade",.08],["scholars_chain",.06]],
    titan:[["titan_core",1],["frost_blade",.6],["rime_plate",.5],["titan_ring",.4]],
  };
  (D[en.type]||D.corrupted).forEach(([k,pr])=>{ if(Math.random()<pr) spawnPickup(g,k,x+(Math.random()-.5)*2,z+(Math.random()-.5)*2,1,0); });
}
function updatePickups(g,dt,state,toast,setUi){
  const p=g.player.position;
  for(let i=g.pickups.length-1;i>=0;i--){
    const pk=g.pickups[i];
    if(pk.zone!==g.zone) continue;
    pk.spin+=dt*2; pk.mesh.rotation.y=pk.spin;
    const fl=floorAt(g,pk.mesh.position.x,pk.mesh.position.z);
    pk.mesh.position.y=fl+.7+Math.sin(pk.spin*1.5)*.1;
    if(Math.hypot(p.x-pk.mesh.position.x,p.z-pk.mesh.position.z)<1.6){
      if(pk.gold>0){ state.gold+=pk.gold; toast(`+${pk.gold} ◈`); }
      else { state.inv[pk.item]=(state.inv[pk.item]||0)+pk.amount; toast(`${ITEMS[pk.item]?.icon||"📦"} ${ITEMS[pk.item]?.name||pk.item}`); if(pk.item==="herb"&&state.sq?.herbs?.s===1){ const h=state.sq.herbs; h.p++; if(h.p>=5){h.s=2;toast("Herbs gathered — return to Herbalist Wren");SFX.quest();} } }
      SFX.pickup(); pk.mesh.parent?.remove(pk.mesh); g.pickups.splice(i,1); updateHUD(g,setUi);
    }
  }
}
function updateSparks(g,dt){
  for(let i=g.sparks.length-1;i>=0;i--){ const s=g.sparks[i]; s.life-=dt; s.v.y-=14*dt; s.m.position.addScaledVector(s.v,dt); s.m.rotation.x+=dt*8; if(s.life<=0){g.scene.remove(s.m);g.sparks.splice(i,1);} }
}
function updateNPCs(g,dt){
  const da=Math.sin(g.time*Math.PI*2-Math.PI/2)*.5+.5;
  const night = da < 0.34;
  g.npcs.forEach(n=>{
    n.bob+=dt*2;
    if(n.spirit){ n.mesh.position.y=n.baseY+Math.sin(n.bob)*.18; n.mesh.rotation.y+=dt*.4; }
    if(n.mark) n.mark.position.y=2.4+Math.sin(n.bob*1.5)*.13;
    // Living townsfolk — only simulate while in their zone (perf)
    if((n.kind==="citizen"||n.kind==="guard") && n.zone===g.zone){
      let dest;
      if(night && n.kind==="citizen"){ dest=n.home; }
      else {
        if(n.wait>0){ n.wait-=dt; dest=null; n.mesh.position.y=n.baseY; }
        else { if(!n.tgt){ const a=Math.random()*Math.PI*2,r=Math.random()*n.wanderR; n.tgt=[n.wanderC[0]+Math.cos(a)*r, n.wanderC[1]+Math.sin(a)*r]; } dest=n.tgt; }
      }
      if(dest){
        const px=n.mesh.position.x, pz=n.mesh.position.z, dx=dest[0]-px, dz=dest[1]-pz, d=Math.hypot(dx,dz);
        if(d>0.45){
          const sp=n.speed*dt; n.mesh.position.x+=dx/d*sp; n.mesh.position.z+=dz/d*sp;
          n.mesh.rotation.y=Math.atan2(dx,dz); n.mesh.position.y=n.baseY+Math.abs(Math.sin(n.bob*2.4))*.07;
        } else {
          if(night && n.kind==="citizen"){ n.mesh.visible=false; }
          else { n.tgt=null; n.wait=1.5+Math.random()*3.5; n.mesh.position.y=n.baseY; }
        }
      }
      if(!night && n.kind==="citizen" && !n.mesh.visible) n.mesh.visible=true;
    }
  });
}
function updateTrees(g){ const t=performance.now()*.001; g.trees?.forEach(tr=>tr.rotation.z=Math.sin(t+tr.userData.sway)*.02); }
function updateCamera(g,dt){
  const p=g.player.position,dist=g.camDist,yaw=g.input.yaw,pitch=g.input.pitch;
  const ox=Math.sin(yaw)*Math.cos(pitch)*dist,oz=Math.cos(yaw)*Math.cos(pitch)*dist,oy=Math.sin(pitch)*dist+2.2;
  const tgt=new THREE.Vector3(p.x-ox,p.y+oy,p.z-oz);
  tgt.y=Math.max(tgt.y,((g.zone==="overworld"||g.zone==="ironpeak"||g.zone==="ember")?floorAt(g,tgt.x,tgt.z)+1.0:.6));
  if(!g.camPos)g.camPos=tgt.clone();
  g.camPos.lerp(tgt,1-Math.pow(.001,dt));
  g.camera.position.copy(g.camPos); g.camera.lookAt(p.x,p.y+1.4,p.z);
}
function updateSky(g){
  if(g.zone==="dungeon"){ g.scene.background.setHex(0x0a0a12); g.sun.intensity=.12; g.hemi.intensity=.18; if(g.scene.fog)g.scene.fog.color.setHex(0x0a0a12); return; }
  if(g.zone==="frost"){ g.scene.background.setHex(0x0c1822); g.sun.intensity=.22; g.hemi.intensity=.35; if(g.scene.fog)g.scene.fog.color.setHex(0x0c1822); g.sun.position.set(20,60,30); return; }
  if(g.zone==="stormspire"){ g.scene.background.setHex(0x10131c); g.sun.intensity=.2; g.hemi.intensity=.3; if(g.scene.fog)g.scene.fog.color.setHex(0x10131c); g.sun.position.set(10,70,20); return; }
  if(g.zone==="storm"){ const fl=(Math.sin(performance.now()*.013)>.985)?.6:0; const base=new THREE.Color(0x2a3346).lerp(new THREE.Color(0x6a7a98), fl); g.scene.background.copy(base); if(g.scene.fog)g.scene.fog.color.copy(base); g.sun.intensity=.35+fl*1.2; g.hemi.intensity=.4; g.sun.position.set(20,55,25); return; }
  if(g.zone==="ironpeak"){
    const t=g.time,da=Math.max(.25,Math.sin(t*Math.PI*2-Math.PI/2)*.4+.5);
    const col=new THREE.Color(0xbcd0e0).lerp(new THREE.Color(0xe8f2fa),da);
    g.scene.background.copy(col); if(g.scene.fog)g.scene.fog.color.copy(col);
    g.sun.intensity=.45+da*.5; g.hemi.intensity=.5+da*.4;
    const ang=t*Math.PI*2; g.sun.position.set(Math.cos(ang-Math.PI/2)*60,Math.max(20,Math.sin(ang-Math.PI/2)*70+30),30);
    return;
  }
  const t=g.time,da=Math.max(0,Math.sin(t*Math.PI*2-Math.PI/2)*.5+.5);
  const col=new THREE.Color(0x12203a).lerp(new THREE.Color(0x9fc7e8),da);
  g.scene.background.copy(col); if(g.scene.fog)g.scene.fog.color.copy(col);
  g.sun.intensity=.25+da*.95; g.hemi.intensity=.3+da*.7;
  const ang=t*Math.PI*2; g.sun.position.set(Math.cos(ang-Math.PI/2)*60,Math.max(8,Math.sin(ang-Math.PI/2)*80+20),30);
}
function updateDmgNums(g,dt,mount){
  const c=g.dmgCtx||(g.dmgCtx=document.getElementById("dmgcanvas")?.getContext("2d")); if(!c)return;
  const W=mount.clientWidth,H=mount.clientHeight;
  if(g._dw!==W||g._dh!==H){ const cv=document.getElementById("dmgcanvas"); if(cv){cv.width=W;cv.height=H;} g._dw=W;g._dh=H; }
  c.clearRect(0,0,W,H);
  for(let i=g.dmgNums.length-1;i>=0;i--){
    const d=g.dmgNums[i]; d.life-=dt; d.y+=d.vy;
    if(d.life<=0){ g.dmgNums.splice(i,1); continue; }
    const v=new THREE.Vector3(d.x,d.y,d.z).project(g.camera);
    if(v.z>1) continue;
    const sx=(v.x*.5+.5)*W, sy=(-(v.y*.5)+.5)*H;
    c.globalAlpha=Math.min(1,d.life*1.6);
    c.font=`bold ${d.crit?26:19}px Georgia`; c.textAlign="center";
    c.lineWidth=3; c.strokeStyle="#000"; c.strokeText(d.crit?`${d.val}!`:`${d.val}`,sx,sy);
    c.fillStyle=d.crit?"#ffcc00":"#fff"; c.fillText(d.crit?`${d.val}!`:`${d.val}`,sx,sy);
  }
  c.globalAlpha=1;
}

/* ── Player damage / death ── */
function damagePlayer(g,state,amount,toast){
  if(g.invuln>0||state.hp<=0) return;
  const cs=calcStats(state);
  let eff=Math.max(1,amount-cs.def*.5);
  if(g.blocking){ eff*=.25; SFX.block(); } else SFX.hurt();
  state.hp=Math.max(0,state.hp-eff);
  g.invuln=g.blocking?.5:.4;
  // red flash via dmg canvas border feel: quick HUD update
  updateHUD(g,g.setUi);
  addDmgNum(g,g.player.position.x,g.player.position.y+2.2,g.player.position.z,Math.round(eff),false);
  if(state.hp<=0){
    toast?.("You have fallen…");
    setTimeout(()=>{
      state.hp=Math.ceil(state.maxHp*.5); state.gold=Math.max(0,state.gold-Math.floor(state.gold*.1));
      if(g.zone==="dungeon") exitDungeon(g,state,toast,g.setZone);
      else if(g.zone==="frost") exitFrost(g,state,toast,g.setZone);
      else if(g.zone==="ironpeak") { g.player.position.set(0,tHIron(0,40)+1,40); g.pVel.set(0,0,0); g.camPos=null; }
      else if(g.zone==="ember") { g.player.position.set(0,tHEmber(0,22)+1,22); g.pVel.set(0,0,0); g.camPos=null; }
      else if(g.zone==="scorch") exitScorch(g,state,toast,g.setZone);
      else { g.player.position.set(2,tH(2,0),0); g.pVel.set(0,0,0); }
      g.invuln=2; updateHUD(g,g.setUi); toast?.("The Spirit pulls you back from the brink.");
    },1500);
  }
}
function gainXP(state,n,toast){
  state.xp+=n;
  while(state.xp>=state.xpNext){
    state.xp-=state.xpNext; state.level++; state.xpNext=Math.floor(state.xpNext*1.4+20);
    state.maxHp+=state.cls==="Warrior"?22:state.cls==="Mage"?12:16;
    state.maxSt+=state.cls==="Ranger"?16:10;
    state.maxMana+=state.cls==="Mage"?18:state.cls==="Ranger"?10:6;
    state.atk+=state.cls==="Warrior"?4:state.cls==="Mage"?5:3;
    state.baseStr+=state.cls==="Warrior"?2:1;
    state.baseDex+=state.cls==="Ranger"?2:1;
    state.baseInt+=state.cls==="Mage"?2:1;
    state.hp=state.maxHp; state.mana=state.maxMana;
    toast?.(`Level Up! Now Level ${state.level}`); SFX.levelup();
  }
}

/* ═══════════════════════════════════════════════════════════
   DUNGEON
═══════════════════════════════════════════════════════════ */
function buildDungeon(g){
  const dg=g.dungeonGroup;
  const floorMat=new THREE.MeshLambertMaterial({color:0x2a2420,flatShading:true});
  const wallMat=new THREE.MeshLambertMaterial({color:0x4a443e,flatShading:true});
  const mossMat=new THREE.MeshLambertMaterial({color:0x3a5230,flatShading:true});
  const torchMat=new THREE.MeshBasicMaterial({color:0xff7a22});
  g.dunWalls=[]; g.levers=[]; g.plates=[]; g.doors=[]; g.tablets=[]; g.dunRooms=[]; g.bossActive=false;

  const F=(cx,cz,w,d,c)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,.3,d),c||floorMat); m.position.set(cx,.15,cz); m.receiveShadow=true; dg.add(m); };
  const W=(cx,cz,w,d,h)=>{ h=h||4.2; const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMat); m.position.set(cx,h/2,cz); m.castShadow=true; dg.add(m); const wo={x1:cx-w/2,x2:cx+w/2,z1:cz-d/2,z2:cz+d/2,mesh:m,open:false}; g.dunWalls.push(wo); return wo; };
  const torch=(cx,cz)=>{ const t=new THREE.Mesh(new THREE.BoxGeometry(.28,.55,.28),torchMat); t.position.set(cx,2.4,cz); dg.add(t); const br=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.6,5),wallMat); br.position.set(cx,2.0,cz); dg.add(br); };
  const room=(cx,cz,w,d,name)=>g.dunRooms.push({cx,cz,w,d,name});

  // ── ENTRANCE HALL ──
  room(0,1.5,20,15,"Entrance");
  F(0,1.5,20,16);
  W(-10,1.5,1,16); W(10,1.5,1,16); W(0,9,20,1);
  W(-6.5,-6,7,1); W(6.5,-6,7,1); // north wall w/ center gap to corridor A
  torch(-9,7); torch(9,7); torch(-9,-4); torch(9,-4);
  const exitP=new THREE.Mesh(new THREE.PlaneGeometry(3,3.4),new THREE.MeshBasicMaterial({color:0x4a8a4a,transparent:true,opacity:.45,side:THREE.DoubleSide}));
  exitP.position.set(0,1.6,8.4); dg.add(exitP);

  // ── CORRIDOR A ──
  F(0,-10,8,10); W(-3.5,-10,1,10); W(3.5,-10,1,10);

  // ── JUNCTION ──
  room(0,-23,20,18,"Junction");
  F(0,-23,20,18);
  W(-6.5,-14,7,1); W(6.5,-14,7,1);     // north wall gap (from corridor A)
  W(-10,-19.5,1,9); W(-10,-28.5,1,5);  // west wall gap (to treasure room) gap z -24..-15... leave gap ~ -16..-22
  W(10,-19.5,1,9); W(10,-28.5,1,5);    // east wall gap (to lore gallery)
  W(-6.5,-32,7,1); W(6.5,-32,7,1);     // south wall gap to corridor B
  torch(-8.5,-16); torch(8.5,-16); torch(-8.5,-30); torch(8.5,-30);

  // ── WEST TREASURE ROOM (pressure-plate puzzle) ──
  room(-23,-23,22,18,"Treasure Vault");
  F(-23,-23,22,18,mossMat);
  W(-34,-23,1,18); W(-23,-14,22,1); W(-23,-32,22,1);
  W(-12,-19,1,8); W(-12,-27.5,1,7); // east wall gap aligns with junction
  torch(-32,-16); torch(-32,-30);
  // 3 pressure plates
  [[-28,-18],[-22,-27],[-30,-24]].forEach((pp,i)=>{ const pl=new THREE.Mesh(new THREE.BoxGeometry(1.8,.16,1.8),new THREE.MeshLambertMaterial({color:0x6a5a3a,flatShading:true})); pl.position.set(pp[0],.24,pp[1]); dg.add(pl); g.plates.push({pos:new THREE.Vector3(pp[0],0,pp[1]),pressed:false,mesh:pl}); });
  // caged chest (bars removed when all plates pressed)
  const cageBars=[]; for(let i=0;i<4;i++){ const a=i/4*Math.PI*2; const bar=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,3.2,6),new THREE.MeshLambertMaterial({color:0x8a8478,flatShading:true})); bar.position.set(-23+Math.cos(a)*1.8,1.6,-22+Math.sin(a)*1.8); dg.add(bar); cageBars.push(bar); const wo=W(-23+Math.cos(a)*1.8,-22+Math.sin(a)*1.8,.5,.5,3.2); }
  g.cage={bars:cageBars,open:false,walls:g.dunWalls.slice(-4)};

  // ── EAST LORE GALLERY ──
  room(23,-23,22,18,"Hall of Wardens");
  F(23,-23,22,18);
  W(34,-23,1,18); W(23,-14,22,1); W(23,-32,22,1);
  W(12,-19,1,8); W(12,-27.5,1,7);
  torch(32,-16); torch(32,-30);

  // ── CORRIDOR B ──
  F(0,-37,8,10); W(-3.5,-37,1,10); W(3.5,-37,1,10);

  // ── LEVER HALL ──
  room(0,-49,24,18,"Lever Hall");
  F(0,-49,24,18);
  W(-6.5,-40,11,1); W(6.5,-40,11,1);
  W(-12,-49,1,18); W(12,-49,1,18);
  W(-9,-58,6,1); W(9,-58,6,1); // south wall, center gap holds the boss gate
  // pillars
  [[-7,-46],[7,-46],[-7,-53],[7,-53]].forEach(([px,pz])=>{ const pl=new THREE.Mesh(new THREE.CylinderGeometry(.6,.7,4.2,8),wallMat); pl.position.set(px,2.1,pz); dg.add(pl); g.dunWalls.push({x1:px-.7,x2:px+.7,z1:pz-.7,z2:pz+.7,mesh:pl,open:false}); });
  torch(-10,-42); torch(10,-42); torch(-10,-56); torch(10,-56);
  // Two levers to open the boss gate
  const mkLever=(x,z,id)=>{ const base=new THREE.Mesh(new THREE.BoxGeometry(.6,.5,.6),new THREE.MeshLambertMaterial({color:0x5a4a3a,flatShading:true})); base.position.set(x,.45,z); dg.add(base); const handle=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1.0,6),new THREE.MeshLambertMaterial({color:0xc9962e,flatShading:true})); handle.position.set(x,1.1,z); handle.rotation.x=-0.6; dg.add(handle); g.levers.push({pos:new THREE.Vector3(x,0,z),on:false,handle,id}); };
  mkLever(-8,-50,"gateL"); mkLever(8,-50,"gateR");
  // boss gate door (blocks south gap)
  const gateMesh=new THREE.Mesh(new THREE.BoxGeometry(8,4.4,1),new THREE.MeshLambertMaterial({color:0x6a5a3a,flatShading:true})); gateMesh.position.set(0,2.2,-58); dg.add(gateMesh);
  const gateWall=W(0,-58,8,1); gateWall.mesh.visible=false; // we use gateMesh visual
  g.doors.push({mesh:gateMesh,wall:gateWall,open:false,need:()=>g.levers.find(l=>l.id==="gateL")?.on&&g.levers.find(l=>l.id==="gateR")?.on, msg:"With a groan of ancient gears, the gate grinds open."});
  // Hidden lever (behind NE pillar) opens the secret room
  mkLever(10.4,-53,"secret"); g.levers[g.levers.length-1].hidden=true;

  // ── SECRET ROOM ──
  room(-23,-49,20,14,"Secret Vault");
  F(-23,-49,20,14,mossMat);
  W(-33,-49,1,14); W(-23,-42,20,1); W(-23,-56,20,1);
  W(-12,-45,1,6); W(-12,-53,1,6); // wall toward lever hall w/ gap
  const secretMesh=new THREE.Mesh(new THREE.BoxGeometry(1,4.2,4),new THREE.MeshLambertMaterial({color:0x4a443e,flatShading:true})); secretMesh.position.set(-12,2.1,-49); dg.add(secretMesh);
  const secretWall=W(-12,-49,1,4); secretWall.mesh.visible=false;
  g.doors.push({mesh:secretMesh,wall:secretWall,open:false,need:()=>g.levers.find(l=>l.id==="secret")?.on, msg:"A section of wall slides aside, revealing a hidden vault!"});
  torch(-31,-44); torch(-31,-54);

  // ── APPROACH CORRIDOR ──
  F(0,-63,8,10); W(-3.5,-63,1,10); W(3.5,-63,1,10);

  // ── BOSS ARENA ──
  room(0,-80,32,28,"Thornheart's Den");
  F(0,-80,32,28,mossMat);
  W(-16,-80,1,28); W(16,-80,1,28); W(0,-94,32,1);
  W(-9,-66,14,1); W(9,-66,14,1);
  torch(-14,-70); torch(14,-70); torch(-14,-90); torch(14,-90);
  // gnarled root pillars
  [[-11,-74],[11,-74],[-11,-86],[11,-86]].forEach(([px,pz])=>{ const rt=new THREE.Mesh(new THREE.CylinderGeometry(.5,.9,5,7),new THREE.MeshLambertMaterial({color:0x3a2a18,flatShading:true})); rt.position.set(px,2.5,pz); dg.add(rt); g.dunWalls.push({x1:px-.9,x2:px+.9,z1:pz-.9,z2:pz+.9,mesh:rt,open:false}); });
  // altar + relic glow
  const altar=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.6,1,8),new THREE.MeshLambertMaterial({color:0x5a6850,flatShading:true})); altar.position.set(0,.5,-89); dg.add(altar);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.6,10,10),new THREE.MeshBasicMaterial({color:0x55ff55,transparent:true,opacity:.7})); glow.position.set(0,1.6,-89); dg.add(glow); g.altarGlow=glow;
  // AoE telegraph ring (hidden until boss slams)
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.18,6,24),new THREE.MeshBasicMaterial({color:0xff5522,transparent:true,opacity:.0})); ring.rotation.x=-Math.PI/2; ring.position.set(0,.3,-82); dg.add(ring); g.bossRing=ring;

  // Lore tablet helper
  const tablet=(x,z,title,text,rot)=>{ const slab=new THREE.Mesh(new THREE.BoxGeometry(1.5,2,.3),new THREE.MeshLambertMaterial({color:0x6a6258,flatShading:true})); slab.position.set(x,1.1,z); slab.rotation.y=rot||0; dg.add(slab); const gl=new THREE.Mesh(new THREE.BoxGeometry(1.0,1.4,.05),new THREE.MeshBasicMaterial({color:0x66cc88,transparent:true,opacity:.5})); gl.position.set(x+Math.sin(rot||0)*.18,1.2,z+Math.cos(rot||0)*.18); dg.add(gl); g.tablets.push({pos:new THREE.Vector3(x,0,z),title,text,mesh:slab}); };
  tablet(-7,2,"The First Warden","In the age of green, the Heartstone kept Verandiah whole. The First Warden, Eluned, bound her life to its light — and the land knew no Hollow.",0);
  tablet(18,-17,"The Four Relics","When the Hollow King clawed up from the deep, the Heartstone shattered into Four Relics — Earth, Frost, Flame, Storm. The Wardens scattered them, that no single hand might wield such power.",-0.5);
  tablet(28,-26,"The Fall of the Wardens","One by one the Wardens fell, or faded into legend. The grove temples sealed themselves. Only the Guardian Spirits remained, waiting for a blood that could carry the burden again.",-0.5);
  tablet(3,-61,"Thornheart","The Earth Relic was given to the Root Temple's keeper — the treant Thornheart, grown from the Heartstone's own seed. In grief for the fallen Wardens, it turned wild. To take the Relic, you must lay the old guardian to rest.",Math.PI);

  g.dunMinZ=-94; g.dunMaxZ=10;
  g.dunXMin=-36; g.dunXMax=36;
  g.dungeonEntry=new THREE.Vector3(0,.5,5);
  g.dungeonExit=new THREE.Vector3(0,0,8);
  g.dungeonReady=true;
}

function enterDungeon(g,state,toast,setZone){
  g.overworldGroup.visible=false; g.dungeonGroup.visible=true;
  g.zone="dungeon"; setZone("dungeon");
  g.player.position.copy(g.dungeonEntry); g.pVel.set(0,0,0); g.camPos=null;
  g.bossActive=false; g.setBoss?.(null);
  updateSky(g); if(g.scene.fog) g.scene.fog.density=.045;
  toast("You descend into the Ancient Root Temple…");
  if(!state.dungeonMapUnlocked){ state.dungeonMapUnlocked=true; toast("🗺 Temple map revealed"); }
  if(!g.dungeonSpawned){
    g.dungeonSpawned=true;
    // Junction
    spawnEnemy(g,-4,-20,"corrupted",1,"dungeon"); spawnEnemy(g,4,-22,"corrupted",1,"dungeon");
    // Treasure vault guard
    spawnEnemy(g,-29,-20,"corrupted",1,"dungeon");
    // Lore gallery
    spawnEnemy(g,20,-19,"skeleton",1,"dungeon"); spawnEnemy(g,27,-27,"skeleton",1,"dungeon");
    // Lever hall
    spawnEnemy(g,-6,-45,"skeleton",1,"dungeon"); spawnEnemy(g,6,-45,"skeleton",1,"dungeon"); spawnEnemy(g,0,-53,"bandit",2,"dungeon");
    // Boss
    spawnEnemy(g,0,-82,"treant",1,"dungeon");
    // Chests: caged (treasure), secret (legendary), lore gallery (rare)
    spawnChest(g,-23,-22,"epic","dungeon");
    spawnChest(g,-23,-50,"legendary","dungeon");
    spawnChest(g,30,-27,"rare","dungeon");
  }
}
function updateDungeon(g,dt,state,toast){
  const p=g.player.position;
  // Lever handle animation
  g.levers?.forEach(l=>{ const tgt=l.on?0.8:-0.6; l.handle.rotation.x += (tgt-l.handle.rotation.x)*Math.min(1,dt*8); });
  // Pressure plates — latch when stepped on
  let plateChanged=false;
  g.plates?.forEach(pl=>{ if(!pl.pressed && Math.hypot(p.x-pl.pos.x,p.z-pl.pos.z)<1.2){ pl.pressed=true; pl.mesh.position.y=.14; pl.mesh.material.color.setHex(0x66cc66); SFX.chest?.(); plateChanged=true; } });
  if(plateChanged){ const n=g.plates.filter(p2=>p2.pressed).length; if(n<g.plates.length) toast(`Glyph pressed (${n}/${g.plates.length})`); }
  // Cage opens when all plates pressed
  if(g.cage && !g.cage.open && g.plates.length && g.plates.every(pl=>pl.pressed)){ g.cage.open=true; g.cage.bars.forEach(b=>b.visible=false); g.cage.walls.forEach(w=>w.open=true); toast("The cage of roots withers away!"); SFX.levelup?.(); }
  // Doors open when their condition is met
  g.doors?.forEach(d=>{ if(!d.open && d.need && d.need()){ d.open=true; d.wall.open=true; d.mesh.visible=false; toast(d.msg||"A door opens."); SFX.levelup?.(); } });

  // ── Boss: Thornheart Treant phases ──
  const boss=g.enemies.find(e=>e.type==="treant"&&!e.dead);
  if(boss){
    const d=Math.hypot(p.x-boss.mesh.position.x,p.z-boss.mesh.position.z);
    if(!g.bossActive && d<22){ g.bossActive=true; toast("⚔ Thornheart Treant awakens!"); }
    if(g.bossActive){
      // HP bar (throttled)
      g.bossUiT=(g.bossUiT||0)+dt; if(g.bossUiT>.12){ g.bossUiT=0; g.setBoss?.({name:"Thornheart Treant",hp:Math.max(0,boss.hp),max:boss.maxhp}); }
      // Attack timers
      boss.slamCD=(boss.slamCD||5)-dt; boss.summonCD=(boss.summonCD||9)-dt;
      const hpFrac=boss.hp/boss.maxhp;
      // AoE root slam — telegraph then damage
      if(boss.slamCD<=0 && !boss.slamming){ boss.slamming=1.0; boss.slamCD=hpFrac<.5?4.5:6.5; g.bossRing.position.set(p.x,.3,p.z); g.bossRing.userData={tx:p.x,tz:p.z}; }
      if(boss.slamming>0){
        boss.slamming-=dt; const tele=1.0-boss.slamming; // 0→1 telegraph
        g.bossRing.material.opacity=Math.min(.8,tele); g.bossRing.scale.setScalar(1+tele*3.2);
        if(boss.slamming<=0){ // detonate
          const rr=4.2*1; const dd=Math.hypot(p.x-g.bossRing.userData.tx,p.z-g.bossRing.userData.tz);
          if(dd<rr && g.invuln<=0) damagePlayer(g,state,boss.dmg*1.4,toast);
          spawnSparks(g,g.bossRing.userData.tx,.4,g.bossRing.userData.tz,true);
          g.bossRing.material.opacity=0; g.bossRing.scale.setScalar(1);
        }
      }
      // Summon rootlings (phase 2, below 60% hp)
      if(hpFrac<.65 && boss.summonCD<=0){ boss.summonCD=12; const rc=g.enemies.filter(e=>e.type==="rootling"&&!e.dead).length;
        if(rc<3){ toast("Thornheart calls the roots!"); for(let i=0;i<2;i++){ const a=Math.random()*Math.PI*2; spawnEnemy(g,boss.mesh.position.x+Math.cos(a)*4,boss.mesh.position.z+Math.sin(a)*4,"rootling",1,"dungeon"); } }
      }
    }
  } else if(g.bossActive){ g.bossActive=false; g.setBoss?.(null); if(g.bossRing){g.bossRing.material.opacity=0;g.bossRing.scale.setScalar(1);} }
}
function exitDungeon(g,state,toast,setZone){
  g.dungeonGroup.visible=false; g.overworldGroup.visible=true;
  g.zone="overworld"; setZone("overworld");
  g.player.position.set(40,tH(40,0)+1,3); g.pVel.set(0,0,0); g.camPos=null;
  updateSky(g); if(g.scene.fog) g.scene.fog.density=.012;
  g.paused=false; if(g.dlgState) g.dlgClose();
  toast("You emerge into daylight.");
}

/* ── Interact ── */
function doInteract(g,toast,setQuestTrack,setZone){
  if(g.dlgState){
    const d=g.dlgState;
    if(!d.done){ g.dlgForceFinish=true; return; }
    if(d.choices){ const c=d.choices[d.sel||0]; if(c&&c.action)c.action(); if(c&&c.next)g.dlgGo(c.next); else g.dlgClose(); }
    else if(d.next) g.dlgGo(d.next);
    else g.dlgClose();
    return;
  }
  if(g.paused) return;
  const p=g.player.position; SFX.resume();
  let done=false;
  g.npcs.forEach(n=>{
    if(done||n.zone!==g.zone) return;
    if(Math.hypot(p.x-n.mesh.position.x,p.z-n.mesh.position.z)<4.5){
      done=true;
      if(n.kind==="spirit")          g.dlgOpen(spiritTree(g.saveState,g,toast,setQuestTrack),"start");
      else if(n.kind==="merchant")   g.openShop?.(n);
      else if(n.kind==="questgiver")  n.sq ? g.dlgOpen(sideQuestTree(n,g.saveState,g,toast,setQuestTrack),"start") : g.dlgOpen(questTree(n.name,g.saveState,g,toast,setQuestTrack,setZone),"start");
      else if(n.kind==="signpost")   g.dlgOpen(travelTree(g,n,toast,setZone),"start");
      else if(n.kind==="citizen")    g.dlgOpen({start:{speaker:n.name,portrait:"🧑",text:(n.dialogue&&n.dialogue.length)?n.dialogue[Math.floor(Math.random()*n.dialogue.length)]:"Good day to you, Warden."}},"start");
      else if(n.kind==="guard")      g.dlgOpen({start:{speaker:n.name,portrait:"💂",text:(n.dialogue&&n.dialogue[0])||"Keep your blade sheathed in town, Warden. Red Oak's under our watch."}},"start");
      else if(n.kind==="dspirit") g.dlgOpen(dungeonSpiritTree(g.saveState,g,toast,setQuestTrack),"start");
      else if(n.kind==="questtarget"){
        const st=g.saveState.sq?.[n.sq];
        if(st&&st.s===1){ st.s=2; toast(`Found! Return to ${SIDEQUESTS[n.sq].giver}`); SFX.quest(); g.dlgOpen({start:{speaker:n.name,portrait:"🙂",text:n.found||"Oh, thank you for finding me!"}},"start"); }
        else g.dlgOpen({start:{speaker:n.name,portrait:"🙂",text:n.idle||"...Hello there."}},"start");
      }
    }
  });
  if(done) return;
  if(g.zone==="overworld"&&g.signpost&&Math.hypot(p.x-g.signpost.x,p.z-g.signpost.z)<3.5){ g.dlgOpen(travelTree(g,{home:"overworld"},toast,setZone),"start"); return; }
  if(g.zone==="overworld"&&g.dungeonEntrance&&Math.hypot(p.x-g.dungeonEntrance.x,p.z-g.dungeonEntrance.z)<5){ enterDungeon(g,g.saveState,toast,setZone); return; }
  if(g.zone==="dungeon"&&g.dungeonExit&&Math.hypot(p.x-g.dungeonExit.x,p.z-g.dungeonExit.z)<4){ exitDungeon(g,g.saveState,toast,setZone); return; }
  if(g.zone==="ironpeak"&&g.ironSign&&Math.hypot(p.x-g.ironSign.x,p.z-g.ironSign.z)<3.5){ g.dlgOpen(travelTree(g,{home:"ironpeak"},toast,setZone),"start"); return; }
  if(g.zone==="ironpeak"&&g.frostEntrance&&Math.hypot(p.x-g.frostEntrance.x,p.z-g.frostEntrance.z)<5){ enterFrost(g,g.saveState,toast,setZone); return; }
  if(g.zone==="frost"&&g.frostExit&&Math.hypot(p.x-g.frostExit.x,p.z-g.frostExit.z)<4){ exitFrost(g,g.saveState,toast,setZone); return; }
  if(g.zone==="ember"&&g.emberEntrance&&Math.hypot(p.x-g.emberEntrance.x,p.z-g.emberEntrance.z)<5){ enterScorch(g,g.saveState,toast,setZone); return; }
  if(g.zone==="scorch"&&g.scorchExit&&Math.hypot(p.x-g.scorchExit.x,p.z-g.scorchExit.z)<4){ exitScorch(g,g.saveState,toast,setZone); return; }
  if(g.zone==="storm"&&g.stormEntrance&&Math.hypot(p.x-g.stormEntrance.x,p.z-g.stormEntrance.z)<5){ enterStormspire(g,g.saveState,toast,setZone); return; }
  if(g.zone==="stormspire"&&g.stormspireExit&&Math.hypot(p.x-g.stormspireExit.x,p.z-g.stormspireExit.z)<4){ exitStormspire(g,g.saveState,toast,setZone); return; }
  // Dungeon interactables: levers + lore tablets
  if(g.zone==="dungeon"){
    for(const l of (g.levers||[])){ if(l.hidden && !l.revealed && false){} if(Math.hypot(p.x-l.pos.x,p.z-l.pos.z)<2.2){ l.on=!l.on; SFX.chest(); toast(l.on?"You pull the lever — clunk.":"You reset the lever."); return; } }
    for(const t of (g.tablets||[])){ if(Math.hypot(p.x-t.pos.x,p.z-t.pos.z)<2.6){ g.dlgOpen({start:{speaker:"Lore Tablet — "+t.title,portrait:"📜",text:t.text}},"start"); return; } }
  }
  g.chests?.forEach(c=>{ if(done||c.opened||c.zone!==g.zone) return; if(p.distanceTo(c.pos)<3){ done=true; openChest(g,c,toast); } });
}

/* ── Minimap ── */
function drawMinimap(g){
  const c=g.mmCtx; if(!c||!g.player) return;
  const W=160,H=160,cx=80,cy=80,sc=80/55;
  const p=g.player.position,yaw=g.input.yaw;
  const s=Math.sin(yaw),co=Math.cos(yaw);
  // Heading-up: forward = camera direction = TOP of minimap
  const pt=(wx,wz)=>{ const dx=wx-p.x,dz=wz-p.z; return [cx+(dx*co-dz*s)*sc, cy-(dx*s+dz*co)*sc]; };
  const near=(x,y,r=74)=>(x-cx)**2+(y-cy)**2<r*r;

  c.clearRect(0,0,W,H);
  c.save(); c.beginPath(); c.arc(cx,cy,76,0,Math.PI*2); c.clip();

  // Background
  const bg=g.zone==="dungeon"?"#16100a":g.zone==="frost"?"#0c1a22":g.zone==="scorch"?"#120804":g.zone==="ironpeak"?"#7aacca":g.zone==="ember"?"#5a1a04":g.zone==="redoak"?"#3a3020":g.zone==="verandah"?"#3e3830":"#0e2a18";
  c.fillStyle=bg; c.fillRect(0,0,W,H);

  // Overworld: scatter tree dots for terrain texture
  if(g.zone==="overworld"){ c.fillStyle="#285230"; g.trees?.forEach(t=>{ const[x,y]=pt(t.position.x,t.position.z); if(near(x,y,72))c.fillRect(x-1,y-1,2,2); }); }

  // Dungeon / cavern entrance — coloured square with halo ring
  const mkDoor=(wx,wz,col)=>{ const[x,y]=pt(wx,wz); if(!near(x,y))return; c.fillStyle=col;c.strokeStyle="#fff";c.lineWidth=1; c.fillRect(x-4,y-4,8,8);c.strokeRect(x-4,y-4,8,8); c.strokeStyle=col;c.lineWidth=1.2;c.setLineDash([2,2]);c.beginPath();c.arc(x,y,8,0,Math.PI*2);c.stroke();c.setLineDash([]); };
  if(g.zone==="overworld"&&g.dungeonEntrance) mkDoor(g.dungeonEntrance.x,g.dungeonEntrance.z,"#9966ff");
  if(g.zone==="ironpeak"&&g.frostEntrance) mkDoor(g.frostEntrance.x,g.frostEntrance.z,"#33aaee");
  // Stonewatch landmark (once revealed)
  if(g.zone==="overworld"&&g.stonewatch&&g.stonewatch.visible){ const[x,y]=pt(8,-88); if(near(x,y)){ c.fillStyle="#cdbf8a";c.strokeStyle="#5a4a2a";c.lineWidth=1; c.fillRect(x-3,y-5,6,10);c.strokeRect(x-3,y-5,6,10); c.fillStyle="#ffaa33";c.beginPath();c.arc(x,y-6,2,0,Math.PI*2);c.fill(); } }

  // Dungeon map — drawn once the temple map is unlocked
  if(g.zone==="dungeon" && g.saveState?.dungeonMapUnlocked && g.dunRooms){
    g.dunRooms.forEach(r=>{ const c1=pt(r.cx-r.w/2,r.cz-r.d/2),c2=pt(r.cx+r.w/2,r.cz-r.d/2),c3=pt(r.cx+r.w/2,r.cz+r.d/2),c4=pt(r.cx-r.w/2,r.cz+r.d/2);
      c.beginPath();c.moveTo(c1[0],c1[1]);c.lineTo(c2[0],c2[1]);c.lineTo(c3[0],c3[1]);c.lineTo(c4[0],c4[1]);c.closePath();
      c.fillStyle="rgba(120,96,60,.34)";c.fill(); c.strokeStyle="rgba(210,180,120,.85)";c.lineWidth=1.2;c.stroke(); });
    // exit portal
    if(g.dungeonExit){ const[x,y]=pt(g.dungeonExit.x,g.dungeonExit.z); if(near(x,y)){ c.fillStyle="#4a8a4a";c.strokeStyle="#fff";c.lineWidth=1;c.fillRect(x-3,y-3,6,6);c.strokeRect(x-3,y-3,6,6); } }
    // levers (yellow diamonds), plates (squares), tablets (green)
    (g.levers||[]).forEach(l=>{ if(l.hidden&&!l.on)return; const[x,y]=pt(l.pos.x,l.pos.z); if(!near(x,y))return; c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillStyle=l.on?"#7dffa0":"#f0c659";c.fillRect(-2.5,-2.5,5,5);c.restore(); });
    (g.plates||[]).forEach(pl=>{ const[x,y]=pt(pl.pos.x,pl.pos.z); if(!near(x,y))return; c.fillStyle=pl.pressed?"#7dffa0":"rgba(200,170,110,.7)";c.fillRect(x-2,y-2,4,4); });
    (g.tablets||[]).forEach(t=>{ const[x,y]=pt(t.pos.x,t.pos.z); if(!near(x,y))return; c.fillStyle="#66cc88";c.beginPath();c.arc(x,y,2.4,0,Math.PI*2);c.fill(); });
  }

  // Chests — gold rotated square
  g.chests?.forEach(ch=>{ if(ch.opened||ch.zone!==g.zone)return; const[x,y]=pt(ch.pos.x,ch.pos.z); if(!near(x,y))return;
    c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillStyle="#f0c659";c.strokeStyle="#7a5a00";c.lineWidth=1;c.fillRect(-3,-3,6,6);c.strokeRect(-3,-3,6,6);c.restore(); });

  // NPCs — shape-coded
  g.npcs.forEach(n=>{ if(n.zone!==g.zone)return; const[x,y]=pt(n.mesh.position.x,n.mesh.position.z); if(!near(x,y))return;
    if(n.spirit){ c.fillStyle="rgba(102,204,255,.3)";c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fill(); c.fillStyle="#66ccff";c.strokeStyle="#004488";c.lineWidth=1;c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();c.stroke(); }
    else if(n.kind==="merchant"){ c.fillStyle="#22cc66";c.strokeStyle="#005522";c.lineWidth=1;c.fillRect(x-3.5,y-3.5,7,7);c.strokeRect(x-3.5,y-3.5,7,7); }
    else if(n.kind==="questgiver"){ c.fillStyle="#ffcc22";c.strokeStyle="#442200";c.lineWidth=1;c.beginPath();c.arc(x,y,4.5,0,Math.PI*2);c.fill();c.stroke(); c.fillStyle="#442200";c.font="bold 7px sans-serif";c.textAlign="center";c.textBaseline="middle";c.fillText("!",x,y); }
    else if(n.kind==="signpost"){ c.fillStyle="rgba(255,255,255,.65)";c.strokeStyle="#888";c.lineWidth=1;c.beginPath();c.arc(x,y,2.5,0,Math.PI*2);c.fill();c.stroke(); } });

  // Enemies — circles, larger+glow for bosses, skip dead
  g.enemies.forEach(e=>{ if(e.zone!==g.zone||e.dead||e.hp<=0)return; const[x,y]=pt(e.mesh.position.x,e.mesh.position.z); if(!near(x,y))return;
    const boss=e.type==="treant"||e.type==="titan"||e.type==="colossus";
    const col=e.type==="frostwolf"?"#88ddff":e.type==="emberwolf"?"#ff7733":e.type==="magmawisp"?"#ff9900":e.type==="wolf"?"#aaee40":e.type==="wraith"?"#66e0ee":boss?"#ff3322":"#ee3322";
    if(boss){ c.fillStyle="rgba(255,50,30,.28)";c.beginPath();c.arc(x,y,10,0,Math.PI*2);c.fill(); }
    c.fillStyle=col;c.strokeStyle="rgba(0,0,0,.5)";c.lineWidth=.8;c.beginPath();c.arc(x,y,boss?6:3,0,Math.PI*2);c.fill();c.stroke();
    if(boss){ c.fillStyle="rgba(255,255,255,.7)";c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill(); } });

  // Vignette rim
  const vig=c.createRadialGradient(cx,cy,52,cx,cy,76);
  vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,"rgba(0,0,0,.52)");
  c.fillStyle=vig; c.fillRect(0,0,W,H);

  // Player arrow — heading up = forward at top; always drawn at center pointing UP
  c.fillStyle="#fff"; c.strokeStyle="rgba(0,0,0,.65)"; c.lineWidth=1.4;
  c.beginPath(); c.moveTo(cx,cy-11); c.lineTo(cx-5.5,cy+6); c.lineTo(cx,cy+2); c.lineTo(cx+5.5,cy+6); c.closePath(); c.fill(); c.stroke();

  c.restore();
}

/* ── Save ── */
function saveGame(state,g){
  if(g?.player&&g.zone==="overworld") state.pos={x:g.player.position.x,z:g.player.position.z};
  Store.set(SAVE,JSON.stringify(state));
}

/* ── Dialogue trees ── */
function dungeonSpiritTree(state,g,toast,setQuestTrack){
  return {
    start:{speaker:"Guardian Spirit",portrait:"✦",text:"You laid Thornheart to rest. It was the last of the old keepers — grown wild with grief, but a Warden still, deep down. You did it mercy.",next:"a"},
    a:{speaker:"Guardian Spirit",portrait:"✦",text:"The Earth Relic is yours. One of Four. With it, the sealed road to the Ironpeak Mountains opens — the Frost Relic waits in the Frostfang Cavern beyond.",next:"b"},
    b:{speaker:"Guardian Spirit",portrait:"✦",text:"And look — to the north of the grove, Stonewatch tower stands revealed. The old Warden waystation. Rest there, and carry word of this victory to Captain Aldric in Verandah.",choices:[{label:"I will, Spirit.",action:()=>{ toast("Ironpeak Mountains unlocked · Stonewatch revealed"); }}]},
  };
}
function spiritTree(state,g,toast,setQuestTrack){
  const q=state.quest;
  const greet=()=>{ q.greeted=true; updateQuestTrack(state,setQuestTrack); toast("Quest: Cleanse the Grove"); SFX.quest(); };
  if(!q.greeted) return {
    start:{speaker:"Guardian Spirit",portrait:"✦",text:"You live, child of ash. The flames took your home… but not you. That is no accident.",next:"p2"},
    p2:{speaker:"Guardian Spirit",portrait:"✦",text:"You are the last of the Wardens of Verandah. The Heartstone cracks, and the Hollow King stirs beneath the capital.",next:"p3"},
    p3:{speaker:"Guardian Spirit",portrait:"✦",text:"Corruption has crept into this grove. Cleanse it — strike down five Hollow-spawn — and I shall reveal your true path.",choices:[{label:"I will do it.",action:greet},{label:"What are the Four Relics?",next:"lore"}]},
    lore:{speaker:"Guardian Spirit",portrait:"✦",text:"Earth, Frost, Flame, Storm — the Four Relics that power the Heartstone. Scattered when the Hollow King first rose. You must reclaim them all.",choices:[{label:"I accept this burden.",action:greet}]},
  };
  if(q.hasFrostRelic) return {start:{speaker:"Guardian Spirit",portrait:"✦",text:"Earth and Frost — two Relics, reclaimed. The Hollow King writhes at their light. The Flame and Storm Relics remain. The Emberveil Wastes await those bold enough to carry the heat."}};
  if(q.hasEarthRelic) return {start:{speaker:"Guardian Spirit",portrait:"✦",text:"The Earth Relic calls to the land beneath my feet. Now seek the Frost Relic — it sleeps in the Frostfang Cavern within the Ironpeak Mountains. Use the travel signpost to reach them."}};
  if(q.completed) return {start:{speaker:"Guardian Spirit",portrait:"✦",text:()=>"Go east, through the stone archway, into the Ancient Root Temple. The Earth Relic lies guarded by the Thornheart Treant. It will not yield willingly."}};
  if(q.kills<q.need) return {start:{speaker:"Guardian Spirit",portrait:"✦",text:()=>`${q.need-q.kills} corrupted still defile the grove. End them.`}};
  return {
    start:{speaker:"Guardian Spirit",portrait:"✦",text:"It is done. You carry yourself like a Warden of old.",onEnter:()=>completeCleanse(state,g,toast,setQuestTrack),next:"after"},
    after:{speaker:"Guardian Spirit",portrait:"✦",text:"The Ancient Root Temple lies east — beyond the stone archway. Within rests the Earth Relic. Defeat the Thornheart Treant and claim it."},
  };
}
function completeCleanse(state,g,toast,setQuestTrack){
  if(state.quest.completed) return;
  state.quest.completed=true; state.inv.relic_frag=(state.inv.relic_frag||0)+1;
  state.gold+=120; gainXP(state,150,toast);
  toast("Quest Complete: Cleanse the Grove (+120◈, +150 XP)"); SFX.levelup();
  updateQuestTrack(state,setQuestTrack); updateHUD(g,g.setUi);
}

/* ═══════════════════════════════════════════════════════════
   M3 — TOWNS, MERCHANTS, TRAVEL, MAIN STORY
═══════════════════════════════════════════════════════════ */
function addSign(g, zoneKey, x, z){
  const grp=zoneGroup(g,zoneKey);
  const post=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,2.4,6),new THREE.MeshLambertMaterial({color:0x6b4a2b,flatShading:true})); pole.position.y=1.2; post.add(pole);
  const board=new THREE.Mesh(new THREE.BoxGeometry(1.7,.75,.12),new THREE.MeshLambertMaterial({color:0x8c6a3a,flatShading:true})); board.position.set(.3,2,0); board.rotation.y=.2; post.add(board);
  post.position.set(x,floorFor(zoneKey,x,z),z); post.traverse(o=>{if(o.isMesh)o.castShadow=true;}); grp.add(post);
  g.props.push({pos:new THREE.Vector3(x,0,z),radius:.6,zone:zoneKey});
  g.npcs.push({mesh:post,name:"Signpost",kind:"signpost",spirit:false,mark:null,bob:0,baseY:post.position.y,zone:zoneKey});
}

function buildRedOak(g){
  const grp=g.redoakGroup;
  const LM=(c,o)=>new THREE.MeshLambertMaterial(Object.assign({color:c,flatShading:true},o||{}));
  const addProp=(x,z,r)=>g.props.push({pos:new THREE.Vector3(x,0,z),radius:r,zone:"redoak"});

  const ground=new THREE.Mesh(new THREE.CircleGeometry(60,48),LM(0x6f8a48)); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; grp.add(ground);
  const sq=new THREE.Mesh(new THREE.CircleGeometry(13,30),LM(0x9a7b4f)); sq.rotation.x=-Math.PI/2; sq.position.y=.02; grp.add(sq);
  // crossing paths
  [[5,96],[96,5]].forEach(([w,d])=>{ const pth=new THREE.Mesh(new THREE.PlaneGeometry(w,d),LM(0x8a6f48)); pth.rotation.x=-Math.PI/2; pth.position.set(0,.01,0); grp.add(pth); });
  // central well
  const well=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.5,1.2,10),LM(0x8a8478)); well.position.y=.6; grp.add(well);
  const wellRoof=new THREE.Mesh(new THREE.ConeGeometry(1.8,1,6),LM(0x6b3f24)); wellRoof.position.y=2.4; grp.add(wellRoof);
  [-1,1].forEach(s=>{const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1.8,5),LM(0x6b4a2b));post.position.set(s*1.1,1.5,0);grp.add(post);});
  addProp(0,0,1.6);

  // -- building helpers --
  const house=(x,z,c1,c2,rot,w,d,h)=>{
    w=w||5; d=d||4; h=h||3;
    const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),LM(c1)); body.position.set(x,h/2,z); body.rotation.y=rot||0; body.castShadow=true; grp.add(body);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.74,2,4),LM(c2)); roof.position.set(x,h+1,z); roof.rotation.y=Math.PI/4+(rot||0); roof.castShadow=true; grp.add(roof);
    const door=new THREE.Mesh(new THREE.BoxGeometry(1,1.5,.12),LM(0x4a3018)); const fr=rot||0; door.position.set(x+Math.sin(fr)*(d/2+.07),.75,z+Math.cos(fr)*(d/2+.07)); door.rotation.y=fr; grp.add(door);
    addProp(x,z,Math.max(w,d)*.62);
  };
  const sign=(x,z,col,rot)=>{ const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,2.6,5),LM(0x6b4a2b)); pole.position.set(x,1.3,z); grp.add(pole); const board=new THREE.Mesh(new THREE.BoxGeometry(1.3,.6,.08),LM(col)); board.position.set(x,2.1,z); board.rotation.y=rot||0; grp.add(board); };

  // Blacksmith (NW)
  house(-19,5,0x7a5230,0x4a2a14,0,6,5,3.2); sign(-19,9.2,0x8a4a2a);
  const anvil=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,1),LM(0x33363a)); anvil.position.set(-15,.55,7); grp.add(anvil); addProp(-15,7,.8);
  const forge=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.2,1.4),LM(0x3a2a22)); forge.position.set(-15.5,.6,9); grp.add(forge);
  const forgeGlow=new THREE.Mesh(new THREE.BoxGeometry(.7,.5,.7),new THREE.MeshBasicMaterial({color:0xff6622})); forgeGlow.position.set(-15.5,1.05,9); grp.add(forgeGlow);

  // Tavern (NE) - bigger
  house(19,5,0x8a6a3a,0x5b3320,0,7,6,3.6); sign(15.5,9,0xaa3322);
  [[22,9],[23.2,9]].forEach(([bx,bz])=>{const bar=new THREE.Mesh(new THREE.CylinderGeometry(.4,.45,.9,8),LM(0x6b4a2b));bar.position.set(bx,.45,bz);grp.add(bar);});

  // General store (SW)
  house(-19,-11,0x9a7a44,0x6b3f24,0,6,5,3); sign(-19,-7,0x66aa55);
  // Apothecary (SE)
  house(19,-11,0x7a5a8a,0x4a3060,0,6,5,3); sign(19,-7,0x8855bb);
  // Mayor's house (S) - two storey + banner
  const mb=new THREE.Mesh(new THREE.BoxGeometry(8,5,7),LM(0xa88858)); mb.position.set(0,2.5,-26); mb.castShadow=true; grp.add(mb);
  const mb2=new THREE.Mesh(new THREE.BoxGeometry(6,3,5),LM(0xb89868)); mb2.position.set(0,6.5,-26); grp.add(mb2);
  const mroof=new THREE.Mesh(new THREE.ConeGeometry(5,2.5,4),LM(0x5b3320)); mroof.position.set(0,9.2,-26); mroof.rotation.y=Math.PI/4; grp.add(mroof);
  const banner=new THREE.Mesh(new THREE.BoxGeometry(.1,2.4,1.4),LM(0x2a5a8a)); banner.position.set(0,4.5,-22.4); grp.add(banner);
  addProp(0,-26,5.5);

  // Lumber mill (W) + waterwheel + log pile
  house(-40,20,0x6b4a2b,0x4a2a14,0,7,6,3.4);
  const wheel=new THREE.Mesh(new THREE.TorusGeometry(2,.3,6,12),LM(0x5a3a1a)); wheel.position.set(-44,2.4,20); grp.add(wheel);
  for(let i=0;i<8;i++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.16,4,.16),LM(0x5a3a1a));sp.position.set(-44,2.4,20);sp.rotation.x=i/8*Math.PI*2;grp.add(sp);}
  for(let i=0;i<6;i++){const lg=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,3,6),LM(0x7a5230));lg.rotation.z=Math.PI/2;lg.position.set(-34+(i%3)*.7,.3+Math.floor(i/3)*.62,24);grp.add(lg);} addProp(-34,24,1.6);

  // Ring of cottages
  [[-27,-2,0x8a6a3a,0x6b3f24],[27,-2,0x9a7a44,0x5b3320],[-25,13,0x7a5230,0x4a2a14],[25,13,0x8a6a3a,0x6b3f24],
   [-13,19,0x9a7a44,0x5b3320],[13,19,0x8a6a3a,0x6b3f24],[-30,-17,0x7a5230,0x4a2a14],[30,-16,0x9a7a44,0x6b3f24],
   [-15,-21,0x8a6a3a,0x5b3320],[15,-21,0x7a5230,0x4a2a14],[23,21,0x9a7a44,0x6b3f24],[-23,22,0x8a6a3a,0x5b3320]
  ].forEach(([x,z,c1,c2])=>house(x,z,c1,c2,Math.atan2(-x,-z)+Math.PI));

  // Fences around square
  for(let i=0;i<24;i++){ const a=i/24*Math.PI*2; if(Math.abs(Math.cos(a))>.93||Math.abs(Math.sin(a))>.93) continue; const fx=Math.cos(a)*13.5,fz=Math.sin(a)*13.5; const fp=new THREE.Mesh(new THREE.BoxGeometry(.12,.9,.12),LM(0x6b4a2b)); fp.position.set(fx,.45,fz); grp.add(fp); }

  // Farms outside (E + W rim)
  const farm=(cx,cz)=>{
    const barn=new THREE.Mesh(new THREE.BoxGeometry(6,3.5,5),LM(0x9a3a2a)); barn.position.set(cx,1.75,cz); barn.castShadow=true; grp.add(barn);
    const broof=new THREE.Mesh(new THREE.ConeGeometry(4.4,2,4),LM(0x6b2a1a)); broof.position.set(cx,4.5,cz); broof.rotation.y=Math.PI/4; grp.add(broof); addProp(cx,cz,3.4);
    for(let r=0;r<4;r++)for(let cc=0;cc<6;cc++){const crop=new THREE.Mesh(new THREE.BoxGeometry(.5,.5+Math.random()*.4,.5),LM(0x4a7a30));crop.position.set(cx-7+cc*1.1,.3,cz+5+r*1.1);grp.add(crop);}
    // low fence around field
    for(let i=0;i<10;i++){const fp=new THREE.Mesh(new THREE.BoxGeometry(.1,.7,.1),LM(0x6b4a2b));fp.position.set(cx-7.5+i*1.5,.35,cz+4);grp.add(fp);}
  };
  farm(34,32); farm(-36,34);

  // Rim trees
  for(let i=0;i<18;i++){ const a=i/18*Math.PI*2,d=52+Math.random()*6,x=Math.cos(a)*d,z=Math.sin(a)*d; const tr=new THREE.Group(); const tk=new THREE.Mesh(new THREE.CylinderGeometry(.25,.38,2.2,6),LM(0x6b4a2b)); tk.position.y=1.1; tr.add(tk); const cn=new THREE.Mesh(new THREE.ConeGeometry(1.7,2.8,7),LM(0x3f7a36)); cn.position.y=3.2; cn.castShadow=true; tr.add(cn); tr.position.set(x,0,z); grp.add(tr); }

  // Travel signpost (north entrance)
  addSign(g,"redoak",6,16);

  // === NPCs ===
  // Main story giver
  addNPC(g,"redoak",{name:"Town Elder Maro",kind:"questgiver",x:-3,z:-18,col:0x556688});
  // Merchants
  addNPC(g,"redoak",{name:"Borin the Smith",kind:"merchant",x:-15,z:5,col:0x8a4a2a,shopName:"Borin's Forge",stock:["iron_sword","steel_sword","bronze_helm","iron_helm","chainmail","verdant_plate","crimson_helm","iron_gauntlets","iron_boots"]});
  addNPC(g,"redoak",{name:"Tilda the Apothecary",kind:"merchant",x:15,z:-9,col:0x8855bb,shopName:"Tilda's Remedies",stock:["potion_minor","potion_greater","mana_potion","herb","silver_ring"]});
  addNPC(g,"redoak",{name:"Goodwife Edda",kind:"merchant",x:-15,z:-9,col:0x8a5a8a,shopName:"Edda's Sundries",stock:["potion_minor","bread","trail_boots","leather_helm","leather_gloves","jade_ring"]});
  // Side-quest givers
  addNPC(g,"redoak",{name:"Hunter Bryn",kind:"questgiver",sq:"wolves",x:10,z:9,col:0x4a6a2a});
  addNPC(g,"redoak",{name:"Herbalist Wren",kind:"questgiver",sq:"herbs",x:-10,z:9,col:0x3a8a6a});
  addNPC(g,"redoak",{name:"Goodwife Mirna",kind:"questgiver",sq:"child",x:5,z:-13,col:0xaa6688});
  addNPC(g,"redoak",{name:"Farmer Hollis",kind:"questgiver",sq:"shepherd",x:26,z:27,col:0x7a6a3a});
  addNPC(g,"redoak",{name:"Foreman Dague",kind:"questgiver",sq:"lumber",x:-34,z:17,col:0x6a5230});
  // Guards (patrol the entrance + square)
  addNPC(g,"redoak",{name:"Guardsman Otto",kind:"guard",x:4,z:13,col:0x445566,wanderC:[4,12],wanderR:5,speed:1.4});
  addNPC(g,"redoak",{name:"Guardswoman Lyra",kind:"guard",x:-4,z:13,col:0x445566,wanderC:[-4,12],wanderR:5,speed:1.4});
  addNPC(g,"redoak",{name:"Guardsman Cael",kind:"guard",x:0,z:-12,col:0x445566,wanderC:[0,-10],wanderR:4,speed:1.3});
  // Wandering citizens with unique names + dialogue + homes
  const cz=[
    ["Old Anselm",0x9a8a6a,[-9,-3],["These old bones remember when the grove was safe. Mind yourself out there.","A Warden, here? The Four must be stirring."]],
    ["Goodwife Bess",0xaa7766,[8,4],["Fresh bread at Edda's, if you've the coin.","My Tom's off with the wolves again — fool man."]],
    ["Cobb the Potter",0x8a6a4a,[-6,6],["Careful of my pots! ...Sorry. Long day.","Verandah buys my best work. Red Oak gets the cracked ones."]],
    ["Nessa",0xcc8866,[7,-5],["You're the talk of the tavern, you know.","Stay for the festival — if the bandits don't ruin it."]],
    ["Young Hal",0x7a8a5a,[-8,-6],["When I'm grown I'll be a Warden too!","Did you really fight a treant? Wow."]],
    ["Marta the Weaver",0x9a6688,[10,7],["Cold's coming. I can feel it in the wool.","The Elder's been pacing all week. Something's afoot."]],
    ["Wenna",0xaa9966,[-10,5],["The well water's sweet today. Have a draught.","Safe travels, Warden."]],
  ];
  cz.forEach(([nm,c,home],i)=>{ const a=i/cz.length*Math.PI*2; addNPC(g,"redoak",{name:nm,kind:"citizen",x:Math.cos(a)*7,z:Math.sin(a)*7,col:c,dialogue:cz[i][3],wanderC:[0,1],wanderR:9,home:home,speed:1.5+Math.random()*.6}); });
}

function buildVerandah(g){
  const grp=g.verandahGroup;
  const stone=new THREE.MeshLambertMaterial({color:0x9a958a,flatShading:true});
  const ground=new THREE.Mesh(new THREE.CircleGeometry(48,44),new THREE.MeshLambertMaterial({color:0x8a8a76,flatShading:true})); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; grp.add(ground);
  const plaza=new THREE.Mesh(new THREE.CircleGeometry(17,30),new THREE.MeshLambertMaterial({color:0xc0b8a2})); plaza.rotation.x=-Math.PI/2; plaza.position.y=.02; grp.add(plaza);
  const keep=new THREE.Mesh(new THREE.BoxGeometry(20,11,6),stone); keep.position.set(0,5.5,-27); keep.castShadow=true; grp.add(keep);
  [-10,10].forEach(tx=>{ const tower=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.7,15,10),stone); tower.position.set(tx,7.5,-27); tower.castShadow=true; grp.add(tower); const cap=new THREE.Mesh(new THREE.ConeGeometry(3.2,3.6,10),new THREE.MeshLambertMaterial({color:0x6a4f9a,flatShading:true})); cap.position.set(tx,16.8,-27); grp.add(cap); });
  const gate=new THREE.Mesh(new THREE.BoxGeometry(4,5,1.2),new THREE.MeshLambertMaterial({color:0x4a3a24,flatShading:true})); gate.position.set(0,2.5,-23.8); grp.add(gate);
  g.props.push({pos:new THREE.Vector3(0,0,-27),radius:10,zone:"verandah"});
  const stall=(x,z,c)=>{ const top=new THREE.Mesh(new THREE.BoxGeometry(3,.3,2.4),new THREE.MeshLambertMaterial({color:0x7a5230,flatShading:true})); top.position.set(x,1.2,z); top.castShadow=true; grp.add(top); const awn=new THREE.Mesh(new THREE.BoxGeometry(3.4,.25,2.8),new THREE.MeshLambertMaterial({color:c,flatShading:true})); awn.position.set(x,2.5,z); grp.add(awn); g.props.push({pos:new THREE.Vector3(x,0,z),radius:1.8,zone:"verandah"}); };
  stall(-13,5,0xaa3333); stall(13,5,0x3355aa); stall(-13,-7,0x33aa55);
  const fount=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.9,1,16),new THREE.MeshLambertMaterial({color:0x8a96a8,flatShading:true})); fount.position.set(0,.5,9); fount.castShadow=true; grp.add(fount); g.props.push({pos:new THREE.Vector3(0,0,9),radius:2.8,zone:"verandah"});
  for(let i=0;i<10;i++){ const a=i/10*Math.PI*2,d=43,x=Math.cos(a)*d,z=Math.sin(a)*d; const pole=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,5,6),stone); pole.position.set(x,2.5,z); grp.add(pole); const ban=new THREE.Mesh(new THREE.BoxGeometry(.1,2,1.2),new THREE.MeshLambertMaterial({color:0x6a4f9a,flatShading:true})); ban.position.set(x,3.6,z+.6); grp.add(ban); }
  addSign(g,"verandah",0,18);
  addNPC(g,"verandah",{name:"Captain Aldric",kind:"questgiver",x:0,z:-18,col:0x4a5a7a});
  addNPC(g,"verandah",{name:"Master Armorer Bren",kind:"merchant",x:-13,z:5,col:0x666666,shopName:"Royal Armory",stock:["chainmail","iron_helm","iron_gauntlets","iron_boots","ruby_ring","steel_sword"]});
  addNPC(g,"verandah",{name:"Court Mage Sela",kind:"merchant",x:13,z:5,col:0x5a3a8a,shopName:"The Arcanum",stock:["ash_staff","mana_potion","scholars_chain","silver_ring","ancient_circlet","warden_robes"]});
  addNPC(g,"verandah",{name:"Trader Pell",kind:"merchant",x:-13,z:-7,col:0x8a6b3a,shopName:"Pell's Market",stock:["potion_minor","potion_greater","mana_potion","bread","leather_vest","warden_blade"]});
}

function switchZone(g, zone, pos, toast, setZone){
  ["overworld","dungeon","redoak","verandah","ironpeak","frost","ember","scorch","storm","stormspire"].forEach(z=>{ const grp=g[z+"Group"]; if(grp) grp.visible=(z===zone); });
  g.zone=zone; setZone(zone);
  g.player.position.set(pos.x, floorFor(zone,pos.x,pos.z), pos.z); g.pVel.set(0,0,0); g.camPos=null;
  g.townRadius=(zone==="redoak")?58:(zone==="verandah")?46:(zone==="ironpeak")?72:(zone==="ember")?80:40;
  updateSky(g); if(g.scene.fog) g.scene.fog.density = (zone==="dungeon")?.045:(zone==="ironpeak")?.02:(zone==="frost")?.05:.012;
  g.paused=false; if(g.dlgState) g.dlgClose();
  toast(zone==="redoak"?"Red Oak Town":zone==="verandah"?"Verandah, the Capital":zone==="ironpeak"?"The Ironpeak Mountains":zone==="ember"?"The Emberveil Wastes":zone==="overworld"?"Red Oak Grove":"");
}

function travelTree(g, _npc, toast, setZone){
  const here=g.zone;
  const st=g.saveState;
  const dest=(z,pos,label)=>({label,action:()=>switchZone(g,z,pos,toast,setZone)});
  const opts=[];
  if(here!=="overworld") opts.push(dest("overworld",{x:5,z:8},"Red Oak Grove (home)"));
  if(here!=="redoak")    opts.push(dest("redoak",{x:6,z:11},"Red Oak Town"));
  if(here!=="verandah")  opts.push(dest("verandah",{x:0,z:13},"Verandah Capital"));
  if(here!=="ironpeak"){
    if(st.quest?.hasEarthRelic) opts.push(dest("ironpeak",{x:0,z:40},"Ironpeak Mountains ❄"));
    else opts.push({label:"Ironpeak Mountains 🔒 (need Earth Relic)"});
  }
  if(here!=="ember"){
    if(st.quest?.hasFrostRelic) opts.push(dest("ember",{x:0,z:30},"Emberveil Wastes 🔥"));
    else opts.push({label:"Emberveil Wastes 🔒 (need Frost Relic)"});
  }
  if(here!=="storm"){
    if(st.quest?.hasFlameRelic) opts.push(dest("storm",{x:0,z:16},"Tempest Reach ⚡"));
    else opts.push({label:"Tempest Reach 🔒 (need Flame Relic)"});
  }
  opts.push({label:"Stay here"});
  return { start:{ speaker:"Travel", portrait:"🧭", text:"The roads of Verandiah are open to you, Warden. Where shall you go?", choices:opts } };
}

const SIDEQUESTS={
  shepherd:{ name:"The Lost Shepherd", giver:"Farmer Hollis", reward:{gold:80,xp:70}, portrait:"🧑\u200d🌾",
    offer:"My shepherd lad Tam chased a stray ewe past the grove and never came home. Would you find him out in the wildlands?",
    active:()=>"Tam wandered into the grove — out past the travel signpost. Bring him home.",
    ready:"You found my Tam? Bless you, Warden. Here — for your trouble.",
    done:"Tam hasn't strayed since. Mostly." },
  lumber:{ name:"Missing Lumber Shipment", giver:"Foreman Dague", reward:{gold:95,xp:85}, portrait:"🪵",
    offer:"A cart of milled oak never reached the mill — waylaid in the grove, I'd wager. Find the carter and recover it?",
    active:()=>"The stranded carter is somewhere out in the grove with the lost lumber.",
    ready:"You got the oak back? You've the shoulders of an ox. Your pay, as promised.",
    done:"The saw's singing again, thanks to you." },
  wolves:{ name:"Wolf Hunt", giver:"Hunter Bryn", reward:{gold:115,xp:110}, count:4, portrait:"🏹",
    offer:"Wolves have grown bold — at least four harrying the flocks. Thin the pack out in the grove?",
    active:(p)=>`Wolves slain: ${p}/4. Hunt them in the grove.`,
    ready:"The pack's broken. The shepherds will sleep easier. This is yours.",
    done:"Quiet nights now. My thanks, Warden." },
  herbs:{ name:"Gather Herbs", giver:"Herbalist Wren", reward:{gold:75,xp:65}, count:5, portrait:"🌿",
    offer:"My stores are bare and the sick keep coming. Gather five sprigs of moonleaf from the grove?",
    active:(p)=>`Moonleaf gathered: ${p}/5. They grow wild in the grove.`,
    ready:"Five sprigs — perfect. The sick will mend, even if they never learn your name.",
    done:"My shelves are stocked again. Bless you." },
  child:{ name:"The Missing Child", giver:"Goodwife Mirna", reward:{gold:140,xp:130}, portrait:"👩",
    offer:"My little one Pim ran toward the river and hasn't come back. Please — find my child before dark!",
    active:()=>"Pim was last seen by the river, out past the bridge in the grove.",
    ready:"You found Pim! Oh, thank you, thank you. Please, take this — it's all I have.",
    done:"Pim's grounded a month. But safe. Thank you, Warden." },
};
function sideQuestTree(npc,state,g,toast,setQuestTrack){
  const id=npc.sq, Q=SIDEQUESTS[id]; if(!state.sq[id]) state.sq[id]={s:0,p:0};
  const st=state.sq[id], P=Q.portrait||"🧑";
  if(st.s===0) return { start:{speaker:Q.giver,portrait:P,text:Q.offer,choices:[
      {label:"I'll help.",action:()=>{ st.s=1; toast(`Quest: ${Q.name}`); SFX.quest(); }},
      {label:"Not just now."}
    ]}};
  if(st.s===1) return { start:{speaker:Q.giver,portrait:P,text:Q.active(st.p)} };
  if(st.s===2) return { start:{speaker:Q.giver,portrait:P,text:Q.ready,onEnter:()=>{ if(st.s===2){ st.s=3; state.gold+=Q.reward.gold; gainXP(state,Q.reward.xp,toast); toast(`Quest Complete: ${Q.name} (+${Q.reward.gold}◈)`); SFX.levelup(); updateHUD(g,g.setUi); } }} };
  return { start:{speaker:Q.giver,portrait:P,text:Q.done} };
}
function questTree(name, state, g, toast, setQuestTrack, setZone){
  const s=state.story;
  if(name==="Town Elder Maro"){
    if(s.stage===0) return {
      start:{speaker:"Town Elder Maro",portrait:"🧓",text:"So — you're the one the Spirit spoke of. A Warden's blood, here in Red Oak. These are dark days, child.",next:"a"},
      a:{speaker:"Town Elder Maro",portrait:"🧓",text:"The King has summoned every able hand to Verandah. Go to the capital, seek Captain Aldric at the castle, and tell him Maro of Red Oak sent you.",choices:[{label:"I'll go at once.",action:()=>{ s.stage=1; toast("Main Quest: The King's Summons"); SFX.quest(); }}]},
    };
    if(s.stage>=1&&s.stage<5) return {start:{speaker:"Town Elder Maro",portrait:"🧓",text:"Verandah lies down the road — use the signpost and choose the capital. Captain Aldric is expecting a Warden."}};
    return {start:{speaker:"Town Elder Maro",portrait:"🧓",text:"A true Warden walks among us again. Red Oak is honored, and a little safer for it."}};
  }
  if(name==="Windward Sage"){
    return {
      start:{speaker:"Windward Sage",portrait:"🌬️",text:"You feel it too, Warden — the sky's unrest? The last Relic sleeps atop the Stormspire, where the wind never stills.",next:"a"},
      a:{speaker:"Windward Sage",portrait:"🌬️",text:"The Stormcaller guards it, herald of the tempest, old as the first thunder. Ascend the spire to the north. Gather all Four Relics, and the Heartstone may yet wake.",choices:[{label:"I am ready."},{label:"Farewell."}]},
    };
  }
  // Captain Aldric
  if(s.stage<1) return {start:{speaker:"Captain Aldric",portrait:"🛡️",text:"I've no time for wanderers off the road. If Elder Maro of Red Oak vouches for you, come back with his word."}};
  if(s.stage===1) return {
    start:{speaker:"Captain Aldric",portrait:"🛡️",text:"So. A Warden, Maro says. The Heartstone cracks and the Hollow King stirs in his prison. Words are cheap — prove the blood in your veins.",next:"a"},
    a:{speaker:"Captain Aldric",portrait:"🛡️",text:"Recover the Earth Relic from the Ancient Root Temple, east of the grove. Bring it to me and I'll believe you — and Verandah will stand with you.",choices:[{label:"It will be done.",action:()=>{ s.stage=2; toast("Quest: Recover the Earth Relic"); SFX.quest(); }}]},
  };
  if(s.stage>=2&&s.stage<5){
    if(!state.quest.hasEarthRelic) return {start:{speaker:"Captain Aldric",portrait:"🛡️",text:"You return empty-handed. The Earth Relic lies in the Ancient Root Temple, guarded by the Thornheart Treant. Do not return without it."}};
    return {
      start:{speaker:"Captain Aldric",portrait:"🛡️",text:"By the Four… you truly hold it. The Earth Relic. Its light — I had forgotten such a thing could shine.",onEnter:()=>{ if(s.stage<5){ s.stage=5; state.gold+=300; state.inv.warden_robes=(state.inv.warden_robes||0)+1; gainXP(state,300,toast); toast("Main Quest Complete! +300◈ & Warden Robes"); SFX.levelup(); updateHUD(g,g.setUi); } },next:"a"},
      a:{speaker:"Captain Aldric",portrait:"🛡️",text:"I name you Warden of the Realm. The mountain roads are open to you now — the signpost will carry you to Ironpeak. Speak with me again when you are ready for the next relic.",choices:[{label:"What lies in the mountains?",action:()=>{}}]},
    };
  }
  // Frost Relic questline
  if(s.stage===5) return {
    start:{speaker:"Captain Aldric",portrait:"🛡️",text:"The second relic — Frost — sleeps beneath the Ironpeak Mountains, in the Frostfang Cavern. A Frost Titan was set to guard it long ago, and guards it still.",next:"a"},
    a:{speaker:"Captain Aldric",portrait:"🛡️",text:"Take the signpost to Ironpeak. Find the cavern mouth in the snow, and bring back the Frost Relic. Wrap up warm, Warden.",choices:[{label:"I'll bring it back.",action:()=>{ s.stage=6; toast("Main Quest: The Frost Relic"); SFX.quest(); }}]},
  };
  if(s.stage===8 && !q.hasFlameRelic) return {
    start:{speaker:"Captain Aldric",portrait:"🛡️",text:"Two Relics reclaimed, Warden. The Emberveil Wastes burn to the south — use the travel signpost.",next:"a"},
    a:{speaker:"Captain Aldric",portrait:"🛡️",text:"Deep in the Scorchdeep Cavern waits the Flame Colossus. Ancient as the mountain it lives in. The Flame Relic is yours to take.",choices:[{label:"I'll bring it back.",action:()=>{ s.stage=9; toast("Quest: The Flame Relic 🔥"); SFX.quest(); }}]},
  };
  if(s.stage===9 && !q.hasFlameRelic) return {start:{speaker:"Captain Aldric",portrait:"🛡️",text:"The Emberveil Wastes lie to the south. Enter the Scorchdeep Cavern and slay the Flame Colossus."}};
  if(s.stage>=9 && q.hasFlameRelic) return {
    start:{speaker:"Captain Aldric",portrait:"🛡️",text:"Two relics, now. You felled the Titan? The cold of that thing could halt a heart — and you carry its relic like a lantern.",onEnter:()=>{ if(s.stage<10){ s.stage=10; state.gold+=500; state.inv.wardens_seal=(state.inv.wardens_seal||0)+1; gainXP(state,500,toast); toast("Flame Relic delivered! +500◈ & Warden's Seal"); SFX.levelup(); updateHUD(g,g.setUi); } },next:"a"},
    a:{speaker:"Captain Aldric",portrait:"🛡️",text:"Earth, Frost, Flame — three Relics. One remains. The Storm Relic is lost to the high peaks. When the mountain roads clear, Verandah rides with you."},
  };
    if(s.stage===6){
    if(!state.quest.hasFrostRelic) return {start:{speaker:"Captain Aldric",portrait:"🛡️",text:"Ironpeak is to the north — the signpost will take you. The Frostfang Cavern holds the Frost Relic, and the Titan that hoards it."}};
    return {
      start:{speaker:"Captain Aldric",portrait:"🛡️",text:"Two relics, now. You felled the Titan? The cold of that thing could halt a heart — and you carry its relic like a lantern.",onEnter:()=>{ if(s.stage<8){ s.stage=8; state.gold+=500; state.inv.wardens_seal=(state.inv.wardens_seal||0)+1; gainXP(state,500,toast); toast("Frost Relic delivered! +500◈ & Warden's Seal"); SFX.levelup(); updateHUD(g,g.setUi); } },next:"a"},
      a:{speaker:"Captain Aldric",portrait:"🛡️",text:"Two of the Four. Flame and Storm remain, in lands not yet safe to travel. Rest, gather your strength — the realm owes you more than it can pay. (More chapters to come.)"},
    };
  }
  return {start:{speaker:"Captain Aldric",portrait:"🛡️",text:"Stand ready, Warden. Two relics are ours; the Hollow King fears every one we reclaim."}};
}

/* ── Shop overlay ── */
function ShopOverlay({shop, state, G, toast, setUi}){
  const [,force]=useState(0); const redraw=()=>force(n=>n+1);
  const buy=k=>{ const it=ITEMS[k]; if(state.gold<it.price){ toast("Not enough gold"); return; } state.gold-=it.price; state.inv[k]=(state.inv[k]||0)+1; SFX.chest(); toast(`Bought ${it.name}`); redraw(); updateHUD(G.current,setUi); };
  const sell=k=>{ const it=ITEMS[k]; if(it.type==="quest"){ toast("That is not for sale."); return; } const val=Math.max(1,Math.floor(it.price*.45)); state.inv[k]--; if(!state.inv[k]) delete state.inv[k]; state.gold+=val; SFX.pickup(); toast(`Sold ${it.name} (+${val}◈)`); redraw(); updateHUD(G.current,setUi); };
  const stock=shop.stock||[];
  const sellable=Object.keys(state.inv).filter(k=>ITEMS[k]&&ITEMS[k].type!=="quest");
  // Equipment comparison vs currently-equipped item in the same slot
  const cmp=k=>{ const it=ITEMS[k]; if(!it||(it.type!=="weapon"&&it.type!=="armor")) return null;
    let slot=it.slot||"weapon"; if(slot==="ring") slot="ring1";
    const cur=ITEMS[(state.equip||{})[slot]];
    const keys=["dmg","atk","def","str","dex","int","maxHp","maxMana","maxSt"], lbl={dmg:"dmg",atk:"atk",def:"def",str:"str",dex:"dex",int:"int",maxHp:"hp",maxMana:"mp",maxSt:"stm"};
    const parts=keys.map(s=>{const dlt=(it[s]||0)-((cur&&cur[s])||0); return dlt?{s,dlt}:null;}).filter(Boolean);
    if(!parts.length) return cur?"= equipped":null;
    return parts.map(p=>`${p.dlt>0?"+":""}${p.dlt} ${lbl[p.s]}`); };
  const Row=({k,onClick,price,col,showCmp})=>{ const it=ITEMS[k]; const c=showCmp?cmp(k):null; return (
    <div style={{padding:"5px 2px",borderBottom:"1px dashed rgba(91,67,38,.2)",fontSize:12}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:17}}>{it.icon}</span>
        <span style={{flex:1,minWidth:0,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",color:RAR_COL[it.rar]}}>{it.name}{state.inv[k]>1&&onClick===sell?` ×${state.inv[k]}`:""}</span>
        <button onClick={()=>onClick(k)} style={{background:col,color:"#fff",border:"none",borderRadius:5,padding:"4px 8px",fontFamily:"Georgia",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>◈{price}</button>
      </div>
      {c && <div style={{display:"flex",flexWrap:"wrap",gap:5,marginLeft:23,marginTop:2}}>{Array.isArray(c)?c.map((t,i)=><span key={i} style={{fontSize:10,color:t[0]==="+"?"#3f7d54":"#a23b2c"}}>{t}</span>):<span style={{fontSize:10,color:"#7a5e2e"}}>{c}</span>}</div>}
    </div>
  ); };
  return <>
    <h2 style={TS}>{shop.shopName||shop.name}</h2>
    <p style={{textAlign:"center",color:"#7a5e2e",fontSize:11,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>Your Gold: ◈ {state.gold} &nbsp;·&nbsp; deltas vs equipped</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div>
        <p style={{fontSize:13,color:"#5b4326",fontWeight:700,fontFamily:"Georgia",borderBottom:"2px solid #c9962e",paddingBottom:3,marginBottom:4}}>Buy</p>
        {stock.map(k=><Row key={k} k={k} onClick={buy} price={ITEMS[k].price} col={state.gold>=ITEMS[k].price?"#3f7d54":"#9a9a9a"} showCmp={true}/>)}
      </div>
      <div>
        <p style={{fontSize:13,color:"#5b4326",fontWeight:700,fontFamily:"Georgia",borderBottom:"2px solid #c9962e",paddingBottom:3,marginBottom:4}}>Sell</p>
        {sellable.length===0 && <p style={{fontSize:11,color:"#8a7350",fontStyle:"italic",padding:"6px 2px"}}>Nothing to sell.</p>}
        {sellable.map(k=><Row key={k} k={k} onClick={sell} price={Math.max(1,Math.floor(ITEMS[k].price*.45))} col="#8a5a2a"/>)}
      </div>
    </div>
  </>;
}

/* ═══════════════════════════════════════════════════════════
   M4 — IRONPEAK MOUNTAINS & FROSTFANG CAVERN (Frost Relic)
═══════════════════════════════════════════════════════════ */
function buildIronpeak(g){
  const grp=g.ironpeakGroup;
  // snow heightfield
  const geo=new THREE.PlaneGeometry(200,200,52,52); geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){ const x=pos.getX(i),z=pos.getZ(i); pos.setY(i,tHIron(x,z)); }
  geo.computeVertexNormals();
  const ground=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:0xe8f0f7,flatShading:true})); ground.receiveShadow=true; grp.add(ground);
  // snowy pines
  for(let i=0;i<26;i++){ const a=Math.random()*Math.PI*2,d=14+Math.random()*46,x=Math.cos(a)*d,z=Math.sin(a)*d;
    const tr=new THREE.Group();
    const tk=new THREE.Mesh(new THREE.CylinderGeometry(.22,.34,1.8,6),new THREE.MeshLambertMaterial({color:0x5a4630,flatShading:true})); tk.position.y=.9; tr.add(tk);
    for(let j=0;j<3;j++){ const c=new THREE.Mesh(new THREE.ConeGeometry(1.4-j*.35,1.3,7),new THREE.MeshLambertMaterial({color:[0x2f5a44,0x356a4e,0x40745a][j%3],flatShading:true})); c.position.y=2+j*.85; c.castShadow=true; tr.add(c); const snow=new THREE.Mesh(new THREE.ConeGeometry(1.46-j*.35,.32,7),new THREE.MeshLambertMaterial({color:0xf4fafe,flatShading:true})); snow.position.y=2.5+j*.85; tr.add(snow); }
    tr.position.set(x,tHIron(x,z),z); grp.add(tr);
  }
  // ice boulders
  for(let i=0;i<14;i++){ const a=Math.random()*Math.PI*2,d=10+Math.random()*50,x=Math.cos(a)*d,z=Math.sin(a)*d;
    const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(.8+Math.random()*1.2,0),new THREE.MeshLambertMaterial({color:0xbcd2e2,flatShading:true})); rk.position.set(x,tHIron(x,z)+.4,z); rk.rotation.set(Math.random(),Math.random(),Math.random()); rk.castShadow=true; grp.add(rk);
    g.props.push({pos:new THREE.Vector3(x,0,z),radius:1+Math.random(),zone:"ironpeak"});
  }
  // jagged peaks around the rim
  for(let i=0;i<12;i++){ const a=i/12*Math.PI*2,d=72,x=Math.cos(a)*d,z=Math.sin(a)*d;
    const pk=new THREE.Mesh(new THREE.ConeGeometry(8+Math.random()*4,18+Math.random()*10,5),new THREE.MeshLambertMaterial({color:0xc8d8e6,flatShading:true})); pk.position.set(x,tHIron(x,z)+6,z); grp.add(pk);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(4,5,5),new THREE.MeshLambertMaterial({color:0xffffff,flatShading:true})); cap.position.set(x,tHIron(x,z)+16,z); grp.add(cap);
  }
  // Frostfang Cavern mouth (to the north)
  const cx=0,cz=-30;
  const arch=new THREE.Mesh(new THREE.BoxGeometry(7,7,2),new THREE.MeshLambertMaterial({color:0x8fb4cc,flatShading:true})); arch.position.set(cx,tHIron(cx,cz)+3,cz); grp.add(arch);
  const mouth=new THREE.Mesh(new THREE.PlaneGeometry(4,5),new THREE.MeshBasicMaterial({color:0x0a1822,side:THREE.DoubleSide})); mouth.position.set(cx,tHIron(cx,cz)+2.6,cz+1.05); grp.add(mouth);
  [-1,1].forEach(sx=>{ const ice=new THREE.Mesh(new THREE.ConeGeometry(.6,4,5),new THREE.MeshLambertMaterial({color:0xd6ecfa,flatShading:true})); ice.position.set(cx+sx*2.6,tHIron(cx,cz)+5,cz+.5); ice.rotation.x=Math.PI; grp.add(ice); });
  g.props.push({pos:new THREE.Vector3(cx,0,cz),radius:3.4,zone:"ironpeak"});
  g.frostEntrance=new THREE.Vector3(cx,tHIron(cx,cz),cz+2);
  // signpost back
  addSign(g,"ironpeak",4,44);
  // roaming frost enemies
  [[-18,18],[20,14],[-24,-4],[16,-12],[-10,30],[26,2]].forEach(([x,z])=>spawnEnemy(g,x,z,"frostwolf",1,"ironpeak"));
  [[-14,-18],[12,-20],[0,8]].forEach(([x,z])=>spawnEnemy(g,x,z,"wraith",1,"ironpeak"));
  spawnChest(g,-22,24,"rare","ironpeak"); spawnChest(g,24,-18,"epic","ironpeak");
}

function buildFrostCavern(g){
  const fg=g.frostGroup;
  const iceFloor=new THREE.MeshLambertMaterial({color:0x4a6276,flatShading:true});
  const iceWall=new THREE.MeshLambertMaterial({color:0x6f93a8,flatShading:true});
  const crystal=new THREE.MeshLambertMaterial({color:0xa8e0f4,flatShading:true,emissive:0x224a66,emissiveIntensity:.4});
  // one large chamber, floor box
  const floor=new THREE.Mesh(new THREE.BoxGeometry(40,.4,52),iceFloor); floor.position.set(0,-.2,-4); floor.receiveShadow=true; fg.add(floor);
  // perimeter walls
  const wl=(x,z,w,d)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,6,d),iceWall); m.position.set(x,3,z); m.castShadow=true; fg.add(m); };
  wl(-19,-4,1.2,52); wl(19,-4,1.2,52); wl(0,22,40,1.2); wl(0,-30,40,1.2);
  // ice pillars / stalagmites for cover
  [[-9,8],[9,4],[-7,-10],[8,-12],[0,-2],[-11,-20],[11,-20]].forEach(([px,pz])=>{
    const h=2+Math.random()*3; const sg=new THREE.Mesh(new THREE.ConeGeometry(.9,h,6),crystal); sg.position.set(px,h/2,pz); fg.add(sg);
    const st=new THREE.Mesh(new THREE.ConeGeometry(.7,h*.7,6),crystal); st.position.set(px,6-h*.35,pz); st.rotation.x=Math.PI; fg.add(st);
    g.props.push({pos:new THREE.Vector3(px,0,pz),radius:1.1,zone:"frost"});
  });
  // frozen altar with the Frost Relic glow (behind the boss)
  const altar=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.6,1,8),crystal); altar.position.set(0,.5,-26); fg.add(altar);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.65,12,12),new THREE.MeshBasicMaterial({color:0x88e0ff,transparent:true,opacity:.75})); glow.position.set(0,1.9,-26); fg.add(glow); g.frostAltarGlow=glow;
  // entrance/exit portal
  const portal=new THREE.Mesh(new THREE.PlaneGeometry(3,3.6),new THREE.MeshBasicMaterial({color:0x9fd0e8,transparent:true,opacity:.5,side:THREE.DoubleSide})); portal.position.set(0,1.8,19.4); fg.add(portal);
  g.frostEntry=new THREE.Vector3(0,0,17);
  g.frostExit=new THREE.Vector3(0,0,18);
  // enemies + boss
  spawnEnemy(g,-7,6,"wraith",1,"frost"); spawnEnemy(g,7,2,"wraith",2,"frost"); spawnEnemy(g,0,-8,"wraith",1,"frost");
  spawnEnemy(g,0,-22,"titan",1,"frost");
  spawnChest(g,-14,-26,"epic","frost");
}

function enterFrost(g,state,toast,setZone){
  ["overworld","dungeon","redoak","verandah","ironpeak","frost","ember","scorch","storm","stormspire"].forEach(z=>{ const grp=g[z+"Group"]; if(grp) grp.visible=(z==="frost"); });
  g.zone="frost"; setZone("frost");
  g.player.position.copy(g.frostEntry); g.pVel.set(0,0,0); g.camPos=null;
  updateSky(g); if(g.scene.fog) g.scene.fog.density=.05;
  toast("You step into the Frostfang Cavern…");
}
function exitFrost(g,state,toast,setZone){
  switchZone(g,"ironpeak",{x:0,z:-22},toast,setZone);
  g.paused=false; if(g.dlgState) g.dlgClose();
  toast("You leave the biting cold behind.");
}

/* ═══════════════════════════════════════════════════════════
   M5 — EMBERVEIL WASTES & FLAME RELIC
═══════════════════════════════════════════════════════════ */
function tHEmber(x,z){
  // Volcanic ridged terrain — sharper and more dramatic than Ironpeak
  const d=Math.hypot(x,z);
  return Math.abs(Math.sin(x*.11+z*.08))*3.2 + Math.abs(Math.cos(x*.05-z*.07))*2.4 + Math.sin(d*.04)*1.8 + (d>60?(d-60)*.6:0);
}

function buildEmber(g){
  const grp=g.emberGroup;
  const ground=new THREE.Mesh(new THREE.CircleGeometry(80,50),new THREE.MeshLambertMaterial({color:0x5a2208,flatShading:true}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; grp.add(ground);
  // Ash floor patches
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2, d=20+Math.random()*35, x=Math.cos(a)*d, z=Math.sin(a)*d;
    const ash=new THREE.Mesh(new THREE.CircleGeometry(4+Math.random()*6,8),new THREE.MeshLambertMaterial({color:0x3a1a08,flatShading:true}));
    ash.rotation.x=-Math.PI/2; ash.position.set(x,.02,z); grp.add(ash);
  }
  // Obsidian rock spires
  const spire=(x,z,h,c)=>{
    const sp=new THREE.Mesh(new THREE.ConeGeometry(1.4+Math.random()*.6,h,5),new THREE.MeshLambertMaterial({color:c,flatShading:true,emissive:0x110400,emissiveIntensity:.3}));
    sp.position.set(x,h/2,z); sp.rotation.y=Math.random()*Math.PI; sp.castShadow=true; grp.add(sp);
    g.props.push({pos:new THREE.Vector3(x,0,z),radius:2.0,zone:"ember"});
  };
  [[-18,-14,6,0x2a1808],[14,-18,5,0x1e1208],[-22,10,7,0x2a1808],[20,16,4,0x221008],[0,-26,8,0x1a1008],
   [-12,22,5,0x2a1808],[24,4,6,0x221008],[-28,-6,4,0x1e1208],[8,28,5,0x2a1808]].forEach(([x,z,h,c])=>spire(x,z,h,c));
  // Lava cracks (glowing strips)
  for(let i=0;i<8;i++){
    const lv=new THREE.Mesh(new THREE.BoxGeometry(.3,0.06,8+Math.random()*6),new THREE.MeshBasicMaterial({color:0xff4400}));
    const a=i/8*Math.PI*2, d=8+Math.random()*20;
    lv.position.set(Math.cos(a)*d,.01,Math.sin(a)*d); lv.rotation.y=Math.random()*Math.PI; grp.add(lv);
  }
  // Distant volcano backdrop
  [-1,0,1].forEach(i=>{
    const vol=new THREE.Mesh(new THREE.ConeGeometry(18+i*4,28+i*5,8),new THREE.MeshLambertMaterial({color:0x3a1a06,flatShading:true}));
    vol.position.set(i*28,-2,-62+i*8); grp.add(vol);
  });
  // Rim charred trees (stumps)
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2, d=55+Math.random()*10, x=Math.cos(a)*d, z=Math.sin(a)*d;
    const stump=new THREE.Mesh(new THREE.CylinderGeometry(.3,.5,1.4+Math.random()*1.2,7),new THREE.MeshLambertMaterial({color:0x1a0a04,flatShading:true}));
    stump.position.set(x,.7,z); grp.add(stump);
  }
  // Signpost / zone exit
  addSign(g,"ember",6,22);
  // NPCs
  addNPC(g,"ember",{name:"Smoldering Smith",kind:"merchant",x:-10,z:4,col:0x8a4420,shopName:"Ember Forge",stock:["ember_blade","obsidian_plate","lava_ring","potion_greater","mana_potion"]});
  addNPC(g,"ember",{name:"Ashwalker Rynn",kind:"questgiver",x:8,z:-2,col:0x6a3a20});
  // Enemies
  [[-16,14],[18,8],[-20,-10],[14,-18],[-8,26],[22,-8],[-14,-22]].forEach(([x,z])=>spawnEnemy(g,x,z,"emberwolf",1,"ember"));
  [[-10,-14],[12,16],[0,6]].forEach(([x,z])=>spawnEnemy(g,x,z,"magmawisp",1,"ember"));
  spawnChest(g,-24,18,"rare","ember"); spawnChest(g,22,-22,"epic","ember");
  // Cavern entrance marker
  const cx=0,cz=-18;
  const caveMt=new THREE.Mesh(new THREE.ConeGeometry(5,6,7),new THREE.MeshLambertMaterial({color:0x1a0a04,flatShading:true,emissive:0x220800,emissiveIntensity:.4})); caveMt.position.set(cx,3,cz); caveMt.castShadow=true; grp.add(caveMt);
  const caveArch=new THREE.Mesh(new THREE.TorusGeometry(2.2,.45,6,8,Math.PI),new THREE.MeshLambertMaterial({color:0xff4400,emissive:0xcc2200,emissiveIntensity:.7})); caveArch.rotation.x=Math.PI/2; caveArch.position.set(cx,2.2,cz+0.3); grp.add(caveArch);
  g.emberEntrance=new THREE.Vector3(cx,tHEmber(cx,cz),cz+1.5);
  g.emberEntry=new THREE.Vector3(0,0,14);
}

function buildScorchdeep(g){
  const sg=g.scorchGroup;
  const rockM=new THREE.MeshLambertMaterial({color:0x2a1206,flatShading:true,emissive:0x110600,emissiveIntensity:.35});
  const lavaM=new THREE.MeshBasicMaterial({color:0xff4400});
  // Ground — cracked obsidian
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(50,60),new THREE.MeshLambertMaterial({color:0x1e0c04,flatShading:true}));
  fl.rotation.x=-Math.PI/2; fl.receiveShadow=true; sg.add(fl);
  // Lava river channels
  [[2,0,36],[-3,0,36],[1,0,36]].forEach(([x,y,l])=>{
    const lv=new THREE.Mesh(new THREE.BoxGeometry(2.4,.08,l),lavaM); lv.position.set(x*2.5,.02,-8+l/2*(y||1)); sg.add(lv);
  });
  // Walls
  const wall=(x,z,w,h,d)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),rockM); m.position.set(x,h/2,z); m.castShadow=true; sg.add(m); };
  wall(0,0,50,.2,60); // invisible floor cap
  [[-24,0,2,8,60],[24,0,2,8,60]].forEach(p=>wall(...p)); // side walls
  wall(0,22,50,8,2); // back wall
  // Pillars  
  [[-10,-10],[10,-8],[-10,4],[10,6]].forEach(([x,z])=>{
    const pil=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.6,7,8),rockM); pil.position.set(x,3.5,z); pil.castShadow=true; sg.add(pil);
    g.props.push({pos:new THREE.Vector3(x,0,z),radius:1.8,zone:"scorch"});
  });
  // Altar — flame relic pedestal
  const pedM=new THREE.MeshLambertMaterial({color:0x3a1808,flatShading:true});
  const ped=new THREE.Mesh(new THREE.CylinderGeometry(2.5,3,1.2,10),pedM); ped.position.set(0,.6,18); sg.add(ped);
  const altarGlow=new THREE.Mesh(new THREE.SphereGeometry(.65,12,12),new THREE.MeshBasicMaterial({color:0xff6600,transparent:true,opacity:.8})); altarGlow.position.set(0,2,18); sg.add(altarGlow); g.flameAltarGlow=altarGlow;
  // Portal
  const portal=new THREE.Mesh(new THREE.PlaneGeometry(3,3.8),new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:.45,side:THREE.DoubleSide})); portal.position.set(0,1.9,14.5); sg.add(portal);
  g.scorchEntry=new THREE.Vector3(0,0,13);
  g.scorchExit=new THREE.Vector3(0,0,14);
  // Enemies + boss
  spawnEnemy(g,-8,4,"magmawisp",2,"scorch"); spawnEnemy(g,8,0,"magmawisp",1,"scorch"); spawnEnemy(g,0,-8,"emberwolf",2,"scorch");
  spawnEnemy(g,0,14,"colossus",1,"scorch");
  spawnChest(g,-16,14,"epic","scorch");
}

function enterScorch(g,state,toast,setZone){
  ["overworld","dungeon","redoak","verandah","ironpeak","frost","ember","scorch","storm","stormspire"].forEach(z=>{ const grp=g[z+"Group"]; if(grp) grp.visible=(z==="scorch"); });
  g.zone="scorch"; setZone("scorch");
  g.player.position.copy(g.scorchEntry); g.pVel.set(0,0,0); g.camPos=null;
  updateSky(g); if(g.scene.fog) g.scene.fog.density=.055;
  toast("You descend into the Scorchdeep Cavern…");
}
function exitScorch(g,state,toast,setZone){
  switchZone(g,"ember",{x:0,z:-14},toast,setZone);
  toast("You emerge from the smoldering dark.");
}

/* ═══════════════════════════════════════════════════════════
   M8 — THE STORM RELIC: Tempest Reach + the Stormspire
═══════════════════════════════════════════════════════════ */
function buildStorm(g){
  const grp=g.stormGroup;
  const LM=(c,o)=>new THREE.MeshLambertMaterial(Object.assign({color:c,flatShading:true},o||{}));
  // wind-scoured highland ground
  const ground=new THREE.Mesh(new THREE.CircleGeometry(80,50),LM(0x55617a)); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; grp.add(ground);
  // pale grass tufts / heather patches
  for(let i=0;i<22;i++){ const a=i/22*Math.PI*2,d=14+Math.random()*46,x=Math.cos(a)*d,z=Math.sin(a)*d; const patch=new THREE.Mesh(new THREE.CircleGeometry(3+Math.random()*5,7),LM(0x6a7a6e)); patch.rotation.x=-Math.PI/2; patch.position.set(x,tHStorm(x,z)+.04,z); grp.add(patch); }
  // ruined Warden spires (broken stone columns)
  const spire=(x,z,h)=>{ const sp=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.4,h,7),LM(0x6a7088)); sp.position.set(x,tHStorm(x,z)+h/2,z); sp.rotation.y=Math.random()*Math.PI; sp.castShadow=true; grp.add(sp); const cap=new THREE.Mesh(new THREE.DodecahedronGeometry(1.3,0),LM(0x5a6078)); cap.position.set(x,tHStorm(x,z)+h,z); grp.add(cap); g.props.push({pos:new THREE.Vector3(x,0,z),radius:1.6,zone:"storm"}); };
  [[-18,-12,6],[16,-16,5],[-22,12,7],[20,18,4],[-30,0,5],[26,2,6],[6,28,5],[-10,-26,4],[12,-26,6]].forEach(([x,z,h])=>spire(x,z,h));
  // scattered standing stones
  for(let i=0;i<10;i++){ const a=i/10*Math.PI*2,d=30+Math.random()*22,x=Math.cos(a)*d,z=Math.sin(a)*d; const st=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.4+Math.random()*1.5,.8),LM(0x60667e)); st.position.set(x,tHStorm(x,z)+1.4,z); st.rotation.y=Math.random()*Math.PI; st.castShadow=true; grp.add(st); }
  // distant storm peaks
  [-1,0,1].forEach(i=>{ const pk=new THREE.Mesh(new THREE.ConeGeometry(16+i*4,30+i*5,7),LM(0x3a4258)); pk.position.set(i*30,-2,-64+i*7); grp.add(pk); });
  // rim broken pines
  for(let i=0;i<14;i++){ const a=i/14*Math.PI*2,d=58+Math.random()*8,x=Math.cos(a)*d,z=Math.sin(a)*d; const tk=new THREE.Mesh(new THREE.CylinderGeometry(.3,.5,2+Math.random(),6),LM(0x3a3a3a)); tk.position.set(x,tHStorm(x,z)+1,z); grp.add(tk); }
  // travel signpost back
  addSign(g,"storm",6,24);
  // NPCs
  addNPC(g,"storm",{name:"Skywatcher Vael",kind:"merchant",x:-10,z:4,col:0x4a6a9a,shopName:"Tempest Wares",stock:["storm_plate","storm_helm","storm_ring","potion_greater","mana_potion"]});
  addNPC(g,"storm",{name:"Windward Sage",kind:"questgiver",x:8,z:-2,col:0x5a7ab0});
  spawnChest(g,-26,18,"epic","storm"); spawnChest(g,24,-20,"rare","storm");
  // Stormspire entrance — a lightning-wreathed tower base
  const cx=0,cz=-20, cy=tHStorm(cx,cz);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(4,5,9,8),LM(0x4a5066)); base.position.set(cx,cy+4.5,cz); base.castShadow=true; grp.add(base);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.4,.5,6,8,Math.PI),new THREE.MeshBasicMaterial({color:0x9fd8ff})); ring.rotation.x=Math.PI/2; ring.position.set(cx,cy+2.4,cz+3.4); grp.add(ring);
  const door=new THREE.Mesh(new THREE.PlaneGeometry(3,3.8),new THREE.MeshBasicMaterial({color:0x6fb0ff,transparent:true,opacity:.45,side:THREE.DoubleSide})); door.position.set(cx,cy+2.0,cz+4.7); grp.add(door);
  g.props.push({pos:new THREE.Vector3(cx,0,cz),radius:4.2,zone:"storm"});
  g.stormEntrance=new THREE.Vector3(cx,cy,cz+6);
  g.stormEntry=new THREE.Vector3(0,0,16);
}
function buildStormspire(g){
  const sg=g.stormspireGroup;
  const rockM=new THREE.MeshLambertMaterial({color:0x2a3146,flatShading:true,emissive:0x101a30,emissiveIntensity:.35});
  const arcM=new THREE.MeshBasicMaterial({color:0x9fd8ff});
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(50,60),new THREE.MeshLambertMaterial({color:0x1c2236,flatShading:true})); fl.rotation.x=-Math.PI/2; fl.receiveShadow=true; sg.add(fl);
  // glowing rune channels
  [[-3,36],[3,36],[0,36]].forEach(([x,l])=>{ const lv=new THREE.Mesh(new THREE.BoxGeometry(.4,.06,l),arcM); lv.position.set(x*2.5,.02,-8+l/2); sg.add(lv); });
  const wall=(x,z,w,h,d)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),rockM); m.position.set(x,h/2,z); m.castShadow=true; sg.add(m); };
  [[-24,0,2,9,60],[24,0,2,9,60]].forEach(p=>wall(...p)); wall(0,22,50,9,2);
  // spire pillars wreathed in arcs
  [[-10,-10],[10,-8],[-10,4],[10,6]].forEach(([x,z])=>{ const pil=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.6,8,8),rockM); pil.position.set(x,4,z); pil.castShadow=true; sg.add(pil); for(let i=0;i<3;i++){const a=new THREE.Mesh(new THREE.BoxGeometry(.08,2.4,.08),arcM);a.position.set(x+Math.cos(i*2)*1.5,3+i*1.5,z+Math.sin(i*2)*1.5);sg.add(a);} g.props.push({pos:new THREE.Vector3(x,0,z),radius:1.7,zone:"stormspire"}); });
  // altar — storm relic pedestal
  const ped=new THREE.Mesh(new THREE.CylinderGeometry(2.5,3,1.2,10),new THREE.MeshLambertMaterial({color:0x3a4258,flatShading:true})); ped.position.set(0,.6,18); sg.add(ped);
  const altarGlow=new THREE.Mesh(new THREE.SphereGeometry(.65,12,12),new THREE.MeshBasicMaterial({color:0x9fd8ff,transparent:true,opacity:.85})); altarGlow.position.set(0,2,18); sg.add(altarGlow); g.stormAltarGlow=altarGlow;
  const portal=new THREE.Mesh(new THREE.PlaneGeometry(3,3.8),new THREE.MeshBasicMaterial({color:0x6fb0ff,transparent:true,opacity:.45,side:THREE.DoubleSide})); portal.position.set(0,1.9,14.5); sg.add(portal);
  g.stormspireEntry=new THREE.Vector3(0,0,13);
  g.stormspireExit=new THREE.Vector3(0,0,14);
  spawnChest(g,-16,14,"epic","stormspire");
}
// Storm enemies spawn AFTER spawnEnemyWave so they aren't wiped by g.enemies=[]
function spawnStormEnemies(g){
  [[-16,14],[18,8],[-22,-10],[14,-18],[-8,26],[24,-6]].forEach(([x,z])=>spawnEnemy(g,x,z,"galehound",1,"storm"));
  [[-12,-14],[12,16],[2,6]].forEach(([x,z])=>spawnEnemy(g,x,z,"stormwisp",1,"storm"));
  spawnEnemy(g,-8,4,"stormwisp",2,"stormspire"); spawnEnemy(g,8,0,"stormwisp",1,"stormspire"); spawnEnemy(g,0,-8,"galehound",1,"stormspire");
  spawnEnemy(g,0,14,"stormcaller",1,"stormspire");
}
function enterStormspire(g,state,toast,setZone){
  ["overworld","dungeon","redoak","verandah","ironpeak","frost","ember","scorch","storm","stormspire"].forEach(z=>{ const grp=g[z+"Group"]; if(grp) grp.visible=(z==="stormspire"); });
  g.zone="stormspire"; setZone("stormspire");
  g.player.position.copy(g.stormspireEntry); g.pVel.set(0,0,0); g.camPos=null;
  updateSky(g); if(g.scene.fog) g.scene.fog.density=.05;
  toast("You ascend into the Stormspire…");
}
function exitStormspire(g,state,toast,setZone){
  switchZone(g,"storm",{x:0,z:-14},toast,setZone);
  toast("You step back into the howling wind.");
}


/* ═══════════════════════════════════════════════════════════
   M6 — OVERWORLD EXPANSION (river, bridge, bandit camp, quest folk)
═══════════════════════════════════════════════════════════ */
function buildOverworldExtras(g){
  const grp=g.overworldGroup;
  const LM=(c,o)=>new THREE.MeshLambertMaterial(Object.assign({color:c,flatShading:true},o||{}));
  // --- River (south band) + banks ---
  const RZ=-43;
  const water=new THREE.Mesh(new THREE.PlaneGeometry(120,7,1,1),new THREE.MeshLambertMaterial({color:0x2f6fae,transparent:true,opacity:.82,flatShading:true}));
  water.rotation.x=-Math.PI/2; water.position.set(0,.35,RZ); grp.add(water);
  g.riverY=performance.now();
  [[-4.6,0x4a6a3a],[4.6,0x4a6a3a]].forEach(([dz,c])=>{ const bank=new THREE.Mesh(new THREE.BoxGeometry(120,.6,2.4),LM(c)); bank.position.set(0,.3,RZ+dz); grp.add(bank); });
  // --- Bridge at x=0 ---
  const bridge=new THREE.Group();
  const deck=new THREE.Mesh(new THREE.BoxGeometry(4,.3,9),LM(0x6b4a2b)); deck.position.set(0,.75,RZ); bridge.add(deck);
  for(let i=0;i<8;i++){ const plank=new THREE.Mesh(new THREE.BoxGeometry(3.8,.12,.9),LM(0x7a5230)); plank.position.set(0,.92,RZ-4+i*1.05); bridge.add(plank); }
  [-1,1].forEach(s=>{ for(let i=0;i<6;i++){ const rail=new THREE.Mesh(new THREE.BoxGeometry(.12,.7,.12),LM(0x5a3a1a)); rail.position.set(s*1.9,1.2,RZ-3.6+i*1.45); bridge.add(rail); } const top=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,9),LM(0x5a3a1a)); top.position.set(s*1.9,1.55,RZ); bridge.add(top); });
  bridge.traverse(o=>{if(o.isMesh)o.castShadow=true;}); grp.add(bridge);
  // --- Bandit camp (south of river) ---
  const camp=new THREE.Group();
  [[-6,-54,0xaa6644],[6,-56,0x996655],[-1,-60,0x886644]].forEach(([x,z,c])=>{
    const tent=new THREE.Mesh(new THREE.ConeGeometry(2.2,2.6,4),LM(c)); tent.position.set(x,tH(x,z)+1.3,z); tent.rotation.y=Math.PI/4; tent.castShadow=true; camp.add(tent);
    g.props.push({pos:new THREE.Vector3(x,0,z),radius:1.8,zone:"overworld"});
  });
  // campfire
  const fx=0,fz=-56,fy=tH(fx,fz);
  for(let i=0;i<5;i++){ const log=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,1.2,5),LM(0x4a3018)); log.position.set(fx,fy+.2,fz); log.rotation.set(Math.PI/2.2,i/5*Math.PI*2,0); camp.add(log); }
  const fire=new THREE.Mesh(new THREE.ConeGeometry(.5,1.1,6),new THREE.MeshBasicMaterial({color:0xff6622})); fire.position.set(fx,fy+.8,fz); camp.add(fire);
  // a couple crates/loot
  const crate=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),LM(0x7a5a2a)); crate.position.set(8,tH(8,-54)+.5,-54); camp.add(crate); grp.add(camp);
  spawnChest(g,-12,-56,"rare","overworld");
  // --- Forest paths (dirt strips) toward landmarks ---
  [[0,-22,5,44,0],[ -40,-20,5,30,Math.PI/2.4]].forEach(([x,z,w,l,r])=>{ const path=new THREE.Mesh(new THREE.PlaneGeometry(w,l),LM(0x8a6f48,{transparent:true,opacity:.6})); path.rotation.x=-Math.PI/2; path.rotation.z=r; path.position.set(x,.04,z); grp.add(path); });
  // --- Quest folk ---
  addNPC(g,"overworld",{name:"Shepherd Tam",kind:"questtarget",sq:"shepherd",x:52,z:18,col:0x9a8a5a,
    found:"You came for me? Bless you! That fool ewe led me halfway to the mountains. I'll hurry home to Hollis straight away.",
    idle:"...You're not from the farm. Have you seen my ewe?"});
  addNPC(g,"overworld",{name:"Little Pim",kind:"questtarget",sq:"child",x:10,z:-46,col:0xcc9988,height:-.2,
    found:"I—I got lost by the river… I want my mum. You'll take me home? Okay. I'll run straight back to Red Oak!",
    idle:"(a small child sniffles by the water) ...are you a real Warden?"});
  addNPC(g,"overworld",{name:"Stranded Carter",kind:"questtarget",sq:"lumber",x:-44,z:-22,col:0x8a6a4a,
    found:"Bandits scattered, thank the Four! The oak's still on the cart — take it to Foreman Dague at the mill, would you?",
    idle:"My cart's stuck and bandits about. Best move along unless Dague sent you."});
  // broken cart by the carter
  const cart=new THREE.Group(); const bed=new THREE.Mesh(new THREE.BoxGeometry(2.2,.6,1.4),LM(0x6b4a2b)); bed.position.y=.7; cart.add(bed);
  [-1,1].forEach(s=>{const wh=new THREE.Mesh(new THREE.TorusGeometry(.5,.12,5,10),LM(0x4a3018));wh.position.set(s>0?.8:-.8,.5,.9);wh.rotation.y=Math.PI/2;cart.add(wh);});
  const logs2=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,2,7),LM(0x7a5230)); logs2.rotation.z=Math.PI/2; logs2.position.y=1.2; cart.add(logs2);
  cart.position.set(-46,tH(-46,-22),-22); cart.traverse(o=>{if(o.isMesh)o.castShadow=true;}); grp.add(cart);

  // --- Stonewatch tower (north of the grove) — hidden until Thornheart falls ---
  const sw=new THREE.Group();
  const sx=8, sz=-88, sy=tH(sx,sz);
  const stone=new THREE.MeshLambertMaterial({color:0x8a857a,flatShading:true});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.8,14,10),stone); base.position.set(sx,sy+7,sz); base.castShadow=true; sw.add(base);
  // battlements
  for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; const merlon=new THREE.Mesh(new THREE.BoxGeometry(.9,1.1,.9),stone); merlon.position.set(sx+Math.cos(a)*3.1,sy+14.3,sz+Math.sin(a)*3.1); sw.add(merlon); }
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(3.3,3.3,.5,10),new THREE.MeshLambertMaterial({color:0x6a655c,flatShading:true})); cap.position.set(sx,sy+13.6,sz); sw.add(cap);
  // door + windows
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.4,.3),new THREE.MeshLambertMaterial({color:0x4a3018,flatShading:true})); door.position.set(sx,sy+1.2,sz+3.7); sw.add(door);
  [[0,5],[0,9]].forEach(([dx,dy])=>{ const win=new THREE.Mesh(new THREE.BoxGeometry(.7,1.1,.2),new THREE.MeshBasicMaterial({color:0x2a2218})); win.position.set(sx+dx,sy+dy,sz+3.55); sw.add(win); });
  // brazier glow atop
  const brazier=new THREE.Mesh(new THREE.ConeGeometry(.8,1.2,7),new THREE.MeshBasicMaterial({color:0xffaa33})); brazier.position.set(sx,sy+15,sz); sw.add(brazier);
  // Warden banner
  const banner=new THREE.Mesh(new THREE.BoxGeometry(.12,3,1.8),new THREE.MeshLambertMaterial({color:0x2f6f4a,flatShading:true})); banner.position.set(sx-3.4,sy+9,sz); sw.add(banner);
  sw.visible=false; grp.add(sw); g.stonewatch=sw;
  g.props.push({pos:new THREE.Vector3(sx,0,sz),radius:3.6});
}
