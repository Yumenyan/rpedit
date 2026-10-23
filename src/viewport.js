import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { partVisible } from './core.js';
const V=a=>new THREE.Vector3(...a);
const rad=a=>(a??[0,0,0]).map(THREE.MathUtils.degToRad);
export class Viewport{
 constructor(host,onSelect,onSlotChange){
 this.host=host;this.onSelect=onSelect;this.onSlotChange=onSlotChange;this.mode='parts';this.units=1;this.selected=-1;this.slotIndex=0;this.offsetIndex=0;this.quadIndex=0;this.epsilon=.002;this.snap=true;
 this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#181c20');this.camera=new THREE.PerspectiveCamera(38,1,.01,2000);this.camera.position.set(19,11,21);
 this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setClearColor('#181c20');host.append(this.renderer.domElement);
 this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.target.set(0,1,0);this.controls.maxDistance=500;
 this.scene.add(new THREE.HemisphereLight(0xcdd9ee,0x747873,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,9,6);this.scene.add(light);
 this.grid=new THREE.GridHelper(60,60,0x43504c,0x2a3235);this.grid.position.y=-.04;this.scene.add(this.grid);this.axes=new THREE.AxesHelper(1.8);this.axes.position.set(0,.01,0);this.scene.add(this.axes);
 this.body=new THREE.Group();this.lcd=new THREE.Group();this.scene.add(this.body,this.lcd);this.ray=new THREE.Raycaster();
 new ResizeObserver(()=>this.resize()).observe(host);this.resize();this.renderer.setAnimationLoop(()=>{this.controls.update();this.renderer.render(this.scene,this.camera);});
 const c=this.renderer.domElement;c.addEventListener('pointerdown',e=>this.down(e),true);c.addEventListener('pointermove',e=>this.move(e));c.addEventListener('pointerup',e=>this.up(e));c.addEventListener('pointercancel',()=>this.endDrag());
 }
 resize(){const {width,height}=this.host.getBoundingClientRect();this.camera.aspect=width/Math.max(height,1);this.camera.updateProjectionMatrix();this.renderer.setSize(width,height);}
 async texture(source){return new Promise((resolve,reject)=>new THREE.TextureLoader().load(source,t=>{t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;resolve(t);},undefined,reject));}
 async load(model,filename,external){
 this.templates=new Map();this.model=model;
 const maps=[];if(external)maps.push(await this.texture(external));
 if(typeof model==='string'){
 const obj=new OBJLoader().parse(model);for(const child of obj.children){child.traverse(m=>{if(m.isMesh)m.material=new THREE.MeshStandardMaterial({map:maps[0]??null,color:maps[0]?0xffffff:0xb4c3c8,roughness:.65,side:THREE.DoubleSide});});this.templates.set(child.name||`part_${this.templates.size}`,child);}
 }else{
 if(!model.elements||!model.outliner)throw Error('Blockbenchのelements / outlinerが必要です');
 if(!external)for(const t of model.textures??[])maps.push(t.source?.startsWith('data:')?await this.texture(t.source):null);
 this.maps=maps;const elements=new Map(model.elements.map(e=>[e.uuid,e]));const groups=new Map((model.groups??[]).map(g=>[g.uuid,g]));const used=new Set();
 const build=(entry,parentOrigin=[0,0,0])=>{
 if(typeof entry==='string'&&elements.has(entry)){const el=elements.get(entry);used.add(entry);return this.cube(el,parentOrigin,model,maps);}
 const g=typeof entry==='string'?groups.get(entry):{...groups.get(entry.uuid),...entry};if(!g)return new THREE.Group();
 const group=new THREE.Group();group.name=g.name??'group';const o=g.origin??[0,0,0];group.position.copy(V(o).sub(V(parentOrigin)).multiplyScalar(1/16));group.rotation.set(...rad(g.rotation),'ZYX');
 for(const child of g.children??[])group.add(build(child,o));return group;
 };
 for(const g of model.outliner){const node=build(g);this.templates.set(node.name||`part_${this.templates.size}`,node);}
 // Orphan elements remain selectable, even in models without groups.
 for(const el of model.elements)if(!used.has(el.uuid))this.templates.set(el.name||el.uuid,this.cube(el,[0,0,0],model,maps));
 }
 this.maps=maps;this.rawNames=[...this.templates.keys()];return this.rawNames;
 }
 cube(el,parentOrigin,model,maps){
 if(el.type&&el.type!=='cube')throw Error(`未対応のBlockbench要素: ${el.type}。Modded Entityのcubeモデルを使用してください。`);
 const from=el.from??[0,0,0],to=el.to??[0,0,0],inflate=el.inflate??0;const size=to.map((v,i)=>(v-from[i]+2*inflate)/16);
 const geom=new THREE.BoxGeometry(...size);const uv=geom.attributes.uv;const keys=['east','west','up','down','south','north'];
 const mats=keys.map((key,i)=>{const face=el.faces?.[key];let r=face?.uv;
 if(!r){const [x,y,z]=to.map((v,j)=>v-from[j]),[u,v]=el.uv_offset??[0,0];r=({east:[u,v+z,u+z,v+z+y],west:[u+z+x,v+z,u+2*z+x,v+z+y],up:[u+z+x,v+z,u+z,v],down:[u+z+2*x,v,u+z+x,v+z],south:[u+2*z+x,v+z,u+2*z+2*x,v+z+y],north:[u+z,v+z,u+z+x,v+z+y]})[key];}
 const index=Number(face?.texture??0),tex=maps[index]??maps[0],tw=model.resolution?.width??model.textures?.[index]?.uv_width??64,th=model.resolution?.height??model.textures?.[index]?.uv_height??64;
 let corners=[[r[0]/tw,1-r[1]/th],[r[2]/tw,1-r[1]/th],[r[0]/tw,1-r[3]/th],[r[2]/tw,1-r[3]/th]];
 for(let n=0;n<(face?.rotation??0)/90;n++)corners=[corners[2],corners[0],corners[3],corners[1]];
 corners.forEach((v,j)=>uv.setXY(i*4+j,...v));return new THREE.MeshStandardMaterial({map:tex??null,color:tex?0xffffff:0xbac8cd,roughness:.68,side:THREE.DoubleSide,transparent:face?.texture===null,opacity:face?.texture===null?0:1,alphaTest:.05});
 });uv.needsUpdate=true;
 const pivot=new THREE.Group(),origin=el.origin??[0,0,0];pivot.position.copy(V(origin).sub(V(parentOrigin)).multiplyScalar(1/16));pivot.rotation.set(...rad(el.rotation),'ZYX');
 const mesh=new THREE.Mesh(geom,mats);mesh.position.copy(V(from.map((v,i)=>(v+to[i])/2)).sub(V(origin)).multiplyScalar(1/16));mesh.name=el.name??'cube';pivot.name=el.name??'cube';pivot.add(mesh);return pivot;
 }
 renderParts(properties,sim,selected,hidden=new Set(),isolate=false,raw=false){
 this.clear(this.body,false);this.selected=selected;const entries=raw?this.rawNames.map(name=>({name,positions:[[0,0]],stage:'EXTERIOR'})):properties.parts;
 entries.forEach((p,i)=>{const base=this.templates?.get(p.name);if(!base||hidden.has(i)||(isolate&&i!==selected)||(!raw&&!partVisible(p,sim)))return;
 for(const position of p.positions??[[0,0]]){const node=base.clone(true);const holder=new THREE.Group();holder.rotation.y=p.mirror?Math.PI:0;holder.add(node);holder.position.set(position[0]/16,0,position[1]/16);
 let slide=(properties.door_max??14)/16;const door=p.door_offset??'';if(door!=='NONE'){const amount=door.startsWith('LEFT')?sim.left:sim.right;holder.position.z+=(door.endsWith('NEGATIVE')?-1:1)*slide*amount*(p.mirror?-1:1);}
 holder.scale.setScalar(this.units);holder.position.multiplyScalar(this.units);holder.userData.part=i;
 holder.traverse(o=>{if(o.isMesh){o.userData.part=i;o.material=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{const mat=m.clone();mat.wireframe=this.wireframe??false;if(i===selected){mat.emissive=new THREE.Color(0x327553);mat.emissiveIntensity=.22;}if(p.stage?.includes('LIGHTS')){mat.emissive=new THREE.Color(0xffffff);mat.emissiveIntensity=.55;}return mat;});}});this.body.add(holder);}
 });
 }
 clear(group,geometry=true){for(const child of [...group.children]){child.traverse(o=>{if(o.isMesh){if(geometry)o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}if(o.isLineSegments&&geometry){o.geometry.dispose();o.material.dispose();}});group.remove(child);}}
 setFlipV(value){for(const t of this.maps??[]){if(t&&t.flipY===!!value){t.flipY=!value;t.needsUpdate=true;}}}
 setTexture(texture){for(const base of this.templates.values())base.traverse(o=>{if(o.isMesh)for(const mat of o.material){mat.map=texture;mat.color.set(0xffffff);mat.needsUpdate=true;}});}
 renderSlots(config,selected=0,show=true,atlas=null){
 this.clear(this.lcd);this.config=config;if(!config||!show)return;
 config.slots.forEach((s,i)=>{for(const [oi,offset]of s.offsets.entries())for(const [qi,q]of s.pos.entries()){
 const points=q.map(p=>V(p).add(V(offset)));const geometry=new THREE.BufferGeometry().setFromPoints([points[0],points[1],points[2],points[0],points[2],points[3]]);geometry.computeVertexNormals();
 const [x,y,w,h]=s.texArea,[tw,th]=config.texSize;const uv=[[x/tw,1-y/th],[x/tw,1-(y+h)/th],[(x+w)/tw,1-(y+h)/th],[(x+w)/tw,1-y/th]];geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,2,0,2,3].flatMap(j=>uv[j]),2));
 const material=new THREE.MeshBasicMaterial({color:atlas?0xffffff:i===selected?0x86edba:0x48a7cb,map:atlas,transparent:true,opacity:i===selected?.93:.58,side:THREE.DoubleSide,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const mesh=new THREE.Mesh(geometry,material);mesh.userData={slot:i,offset:oi,quad:qi};mesh.renderOrder=2;this.lcd.add(mesh);const line=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:i===selected?0xc6ffe2:0x61adcc,depthTest:false}));line.renderOrder=3;this.lcd.add(line);
 }});
 }
 cast(event,objects){const rect=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),this.camera);return this.ray.intersectObjects(objects,true).filter(h=>h.object.isMesh&&h.object.visible);}
 down(e){this.start=[e.clientX,e.clientY];if(e.button!==0||this.mode!=='lcd')return;
 const hit=this.cast(e,this.lcd.children)[0],surface=this.cast(e,this.body.children)[0];if(hit&&(!surface||hit.distance<=surface.distance+.008)){const {slot,offset,quad}=hit.object.userData;this.slotIndex=slot;this.offsetIndex=offset;this.quadIndex=quad;const points=this.config.slots[slot].pos[quad].map(p=>V(p).add(V(this.config.slots[slot].offsets[offset])));const normal=new THREE.Vector3().subVectors(points[1],points[0]).cross(new THREE.Vector3().subVectors(points[2],points[0])).normalize();this.drag={plane:new THREE.Plane().setFromNormalAndCoplanarPoint(normal,hit.point),start:hit.point.clone(),offset:[...this.config.slots[slot].offsets[offset]],moved:false};this.controls.enabled=false;e.stopImmediatePropagation();this.renderer.domElement.setPointerCapture(e.pointerId);this.onSelect('slot',slot,offset,quad);}
 }
 move(e){if(!this.drag)return;const d=this.drag;this.cast(e,[]);const point=new THREE.Vector3();if(this.ray.ray.intersectPlane(d.plane,point)){const delta=point.sub(d.start);const value=d.offset.map((v,i)=>{const n=v+delta.getComponent(i);return this.snap?Math.round(n*1000)/1000:n;});this.config.slots[this.slotIndex].offsets[this.offsetIndex]=value;d.moved=true;this.onSlotChange(false);}}
 up(e){if(this.drag){const moved=this.drag.moved;this.endDrag();if(moved)this.onSlotChange(true);return;}
 if(!this.start||Math.hypot(e.clientX-this.start[0],e.clientY-this.start[1])>5)return;
 const hit=this.cast(e,this.body.children)[0];if(!hit)return;
 if(this.mode==='lcd'&&this.config?.slots[this.slotIndex]){this.place(hit);this.onSlotChange(true);}
 else this.onSelect('part',hit.object.userData.part);
 }
 endDrag(){this.drag=null;this.controls.enabled=true;}
 place(hit){
 const s=this.config.slots[this.slotIndex],quad=s.pos[this.quadIndex];const center=quad.reduce((c,p)=>c.add(V(p)),new THREE.Vector3()).multiplyScalar(.25);const normal=new THREE.Vector3().subVectors(V(quad[1]),V(quad[0])).cross(new THREE.Vector3().subVectors(V(quad[2]),V(quad[0]))).normalize();
 const targetNormal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);if(targetNormal.dot(this.camera.position.clone().sub(hit.point))<0)targetNormal.negate();
 const rotation=new THREE.Quaternion().setFromUnitVectors(normal,targetNormal);s.pos[this.quadIndex]=quad.map(p=>V(p).sub(center).applyQuaternion(rotation).add(center).toArray());
 const target=hit.point.clone();if(this.snap)target.toArray().forEach((v,i)=>target.setComponent(i,Math.round(v*1000)/1000));target.addScaledVector(targetNormal,this.epsilon);
 s.offsets[this.offsetIndex]=target.sub(center).toArray();
 }
 focusSelection(lcd=false){const targets=lcd?this.lcd.children.filter(o=>o.isMesh&&o.userData.slot===this.slotIndex&&o.userData.offset===this.offsetIndex&&o.userData.quad===this.quadIndex):this.body.children.filter(o=>o.userData.part===this.selected);const b=new THREE.Box3();for(const o of targets)b.expandByObject(o);if(b.isEmpty())return this.fit();const center=b.getCenter(new THREE.Vector3()),size=Math.max(b.getSize(new THREE.Vector3()).length(),.1),direction=this.camera.position.clone().sub(this.controls.target).normalize();this.controls.target.copy(center);this.camera.position.copy(center).addScaledVector(direction,size*1.8);this.controls.update();}
 fit(){const b=new THREE.Box3().setFromObject(this.body);if(b.isEmpty())return;const center=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3()).length();this.controls.target.copy(center);this.camera.position.copy(center).add(new THREE.Vector3(1,.48,1).normalize().multiplyScalar(size*1.5));this.camera.near=Math.max(.001,size/10000);this.camera.far=Math.max(1000,size*100);this.camera.updateProjectionMatrix();this.controls.update();}
 view(direction){const target=this.controls.target,distance=this.camera.position.distanceTo(target);const v=({front:[0,.02,1],side:[1,.02,0],top:[0,1,.001],perspective:[1,.5,1]})[direction];this.camera.position.copy(target).add(V(v).normalize().multiplyScalar(distance));this.controls.update();}
}
