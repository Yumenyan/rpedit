import { parse } from 'acorn';
import { zipSync, strToU8 } from 'fflate';
export const STAGES=['EXTERIOR','INTERIOR','INTERIOR_TRANSLUCENT','LIGHTS','ALWAYS_ON_LIGHTS'];
export const DOORS=['NONE','LEFT_POSITIVE','RIGHT_POSITIVE','LEFT_NEGATIVE','RIGHT_NEGATIVE'];
export const CONDITIONS=['ALL','DOORS_OPEN','DOORS_CLOSED','DOOR_LEFT_OPEN','DOOR_RIGHT_OPEN','DOOR_LEFT_CLOSED','DOOR_RIGHT_CLOSED','MOVING_FORWARDS','MOVING_BACKWARDS'];
export const DISPLAYS=['DESTINATION','ROUTE_NUMBER','NEXT_STATION_PLAIN','NEXT_STATION_KCR','NEXT_STATION_MTR','NEXT_STATION_UK'];
export const clone=v=>structuredClone(v);
export const defaultPart=name=>({name,stage:'EXTERIOR',mirror:false,skip_rendering_if_too_far:false,door_offset:'NONE',render_condition:'ALL',positions:[[0,0]],whitelisted_cars:'',blacklisted_cars:''});
export const defaultDisplay=()=>({x_padding:0,y_padding:0,cjk_size_ratio:0,type:'DESTINATION',color_cjk:'FF9900',color:'FF9900',should_scroll:false,force_upper_case:false,force_single_line:false});
function literal(n){
 if(n.type==='Literal' && (n.value===null || ['string','number','boolean'].includes(typeof n.value)))return n.value;
 if(n.type==='UnaryExpression' && ['-','+'].includes(n.operator)){const v=literal(n.argument);if(typeof v!=='number')throw Error('数値以外の演算は読み込めません');return n.operator==='-'?-v:v;}
 if(n.type==='ArrayExpression')return n.elements.map(literal);
 if(n.type==='ObjectExpression'){const o=Object.create(null);for(const p of n.properties){if(p.type!=='Property'||p.computed||p.method||p.kind!=='init')throw Error('slotCfgには静的な値のみ使用できます');o[p.key.name??p.key.value]=literal(p.value);}return o;}
 throw Error('slotCfgはJSON互換の静的オブジェクトが必要です（JSは実行しません）');
}
export function validateSlots(c){
 const vec=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
 if(!c||!vec(c.texSize,2)||c.texSize.some(v=>v<=0)||!Array.isArray(c.slots))throw Error('texSize / slots が正しくありません');
 for(const s of c.slots){if(typeof s.name!=='string'||!vec(s.texArea,4)||!Array.isArray(s.pos)||!s.pos.length||s.pos.some(q=>!Array.isArray(q)||q.length!==4||q.some(v=>!vec(v,3)))||!Array.isArray(s.offsets)||!s.offsets.length||s.offsets.some(v=>!vec(v,3)))throw Error(`LCD ${s.name??''}: pos / offsets / texArea が不正です`);}
 return c;
}
export function extractSlotCfg(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true});let found;
 function walk(n){if(!n||typeof n!=='object')return;if(n.type==='VariableDeclarator'&&n.id.name==='slotCfg')found=n.init;for(const [k,v]of Object.entries(n)){if(['start','end'].includes(k))continue;if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}
 walk(ast);if(!found)throw Error('slotCfg の変数宣言が見つかりません');return {config:validateSlots(literal(found)),start:found.start,end:found.end};
}
export function patchScript(source,config){validateSlots(config);const {start,end}=extractSlotCfg(source);return source.slice(0,start)+JSON.stringify(config,null,4)+source.slice(end);}
export function normalizeProperties(p){
 if(!p||!Array.isArray(p.parts))throw Error('parts配列を持つプロパティJSONが必要です');
 const result={transport_mode:'TRAIN',length:24,width:2,door_max:14,...p};
 for(const k of ['length','width','door_max'])if(!Number.isFinite(result[k])||result[k]<0)throw Error(`${k}が不正です`);
 result.parts=p.parts.map(v=>{const q={...defaultPart(v.name),...v};if(typeof q.name!=='string'||!STAGES.includes(q.stage)||!DOORS.includes(q.door_offset)||!CONDITIONS.includes(q.render_condition)||!Array.isArray(q.positions)||q.positions.some(a=>!Array.isArray(a)||a.length!==2||!a.every(Number.isFinite)))throw Error(`パーツ ${q.name}: 値を確認してください`);return q;});return result;
}
export function safePath(p){p=p.replaceAll('\\','/');if(p.startsWith('/')||p.split('/').some(v=>v==='..')||p.includes('\0'))throw Error('不正なリソースパスです');return p;}
export function dependencyReport(files){
 const missing=new Set();for(const [path,data] of Object.entries(files)){if(!path.endsWith('.js'))continue;const s=new TextDecoder().decode(data);for(const m of s.matchAll(/["']([a-z0-9_.-]+):([a-zA-Z0-9_./-]+\.(?:js|png|obj|bbmodel|json|ogg))["']/g)){const p=`assets/${m[1]}/${m[2]}`;if(!files[p])missing.add(p);}}
 return [...missing];
}
export function exportFiles(state){
 const {id,model,modelName,properties,meta,script,slots,assets,texture,packFormat}=state;
 if(!/^[a-z0-9_][a-z0-9_.-]*$/.test(id))throw Error('モデルIDは半角英小文字・数字・_ . - で指定してください');
 if(!model)throw Error('モデルを読み込んでください');normalizeProperties(properties);
 const files={};for(const [p,v]of Object.entries(assets??{}))files[safePath(p)]=v;
 const root=`assets/mtr/${id}/${id}`,ext=modelName.endsWith('.obj')?'obj':'bbmodel';
 files[`${root}.${ext}`]=strToU8(typeof model==='string'?model:JSON.stringify(mtrModel(model),null,2));
 files[`${root}.json`]=strToU8(JSON.stringify(properties,null,2));
 if(texture)files[`${root}.png`]=texture;
 else if(ext==='bbmodel'&&model.textures?.[0]?.source?.startsWith('data:image/png;base64,'))files[`${root}.png`]=Uint8Array.from(atob(model.textures[0].source.split(',')[1]),c=>c.charCodeAt(0));
 else throw Error('PNGテクスチャを読み込んでください');
 const m={name:id,description:'',color:'7BAF92',base_train_type:'c1141a',door_animation_type:'STANDARD',render_door_overlay:false,rider_offset:0,...meta,model:`mtr:${id}/${id}.${ext}`,model_properties:`mtr:${id}/${id}.json`,texture_id:`mtr:${id}/${id}`};
 if(script){files[`assets/mtr/${id}/init.js`]=strToU8(slots?patchScript(script,slots):script);m.script_files=[`mtr:${id}/init.js`,...(m.script_files??[]).filter(p=>p!==`mtr:${id}/init.js`&&p!==state.scriptResource)];}
 let resources={};try{if(files['assets/mtr/mtr_custom_resources.json'])resources=JSON.parse(new TextDecoder().decode(files['assets/mtr/mtr_custom_resources.json']));}catch{throw Error('フォルダ内のmtr_custom_resources.jsonが不正です');}
 resources.custom_trains={...resources.custom_trains,[id]:m};files['assets/mtr/mtr_custom_resources.json']=strToU8(JSON.stringify(resources,null,2));
 files['pack.mcmeta']=strToU8(JSON.stringify({pack:{pack_format:Number(packFormat)||6,description:`${m.name} — MTR Resource Pack`}},null,2));
 return files;
}
export function makeZip(files){return zipSync(files,{level:6});}
export function dateName(id,date=new Date()){const d=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);return `${d}_${id}.zip`;}
export function filterStrength(expression,car,total){
 let strength=0;for(const item of expression.split(',')){const t=item.trim();const mod=t.match(/^%(-?\d+)(?:\+(-?\d+))?$/);if(mod){const multiple=Number(mod[1]);if(multiple&&(car+Number(mod[2]??0))%multiple===0)strength=2;}else if(/^-?\d+$/.test(t)){const n=Number(t);if(n===car||n===car-total-1)return 3;}}return strength;
}
export function carMatches(expression,car,total){return filterStrength(expression,car,total)>0;}
export function partVisible(p,sim){if(filterStrength(p.blacklisted_cars??'',sim.car,sim.total)>filterStrength(p.whitelisted_cars??'',sim.car,sim.total))return false;const l=sim.left>0,r=sim.right>0;return ({ALL:true,DOORS_OPEN:l||r,DOORS_CLOSED:!l&&!r,DOOR_LEFT_OPEN:l,DOOR_RIGHT_OPEN:r,DOOR_LEFT_CLOSED:!l,DOOR_RIGHT_CLOSED:!r,MOVING_FORWARDS:sim.forward,MOVING_BACKWARDS:!sim.forward})[p.render_condition]!==false;}
export function mtrModel(model){
 const result=clone(model);if(!Array.isArray(result.groups))return result;
 const groups=new Map(result.groups.map(g=>[g.uuid,g]));
 const walk=entry=>{if(typeof entry==='string'){const g=groups.get(entry);return g?{...g,children:(g.children??[]).map(walk)}:entry;}const g={...groups.get(entry.uuid),...entry};return {...g,children:(g.children??[]).map(walk)};};
 result.outliner=result.outliner.map(walk);delete result.groups;result.meta={...result.meta,format_version:'4.10'};return result;
}
