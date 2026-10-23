import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unzipSync,strFromU8} from 'fflate';
import {extractSlotCfg,patchScript,defaultPart,partVisible,filterStrength,normalizeProperties,exportFiles,makeZip,dateName,dependencyReport,mtrModel} from '../src/core.js';
const script=readFileSync('public/examples/init_153.js','utf8');
const properties=JSON.parse(readFileSync('public/examples/properties.json','utf8'));
test('real script: all slots parsed and only initializer replaced',()=>{
 const original=extractSlotCfg(script);assert.equal(original.config.slots.length,10);assert.equal(original.config.slots[2].offsets.length,2);
 original.config.slots[0].offsets[0][0]=1.234;const patched=patchScript(script,original.config),after=extractSlotCfg(patched);
 assert.equal(after.config.slots[0].offsets[0][0],1.234);assert.equal(script.slice(0,original.start),patched.slice(0,after.start));assert.equal(script.slice(original.end),patched.slice(after.end));
});
test('untrusted JavaScript is never evaluated',()=>{
 assert.throws(()=>extractSlotCfg('let slotCfg = doSomething();'),/静的/);assert.throws(()=>extractSlotCfg('let slotCfg = { texSize: [1024,1024], slots: eval("bad") };'),/静的/);
 assert.throws(()=>extractSlotCfg('let slotCfg = {texSize:[0,1024],slots:[]};'),/texSize/);
});
test('MTR filter precedence: explicit car number beats modulo blacklist',()=>{
 const p={...defaultPart('front'),whitelisted_cars:'1',blacklisted_cars:'%1'};
 const sim={car:1,total:3,left:0,right:0,forward:true};assert.equal(partVisible(p,sim),true);assert.equal(partVisible(p,{...sim,car:2}),false);
 assert.equal(filterStrength('-1',3,3),3);assert.equal(filterStrength('%2+1',1,3),2);
 assert.equal(partVisible({...p,whitelisted_cars:'-1'}, {...sim,car:3}),true);
});
test('render conditions and imported properties remain intact',()=>{
 assert.deepEqual(normalizeProperties(properties).parts[10].display,properties.parts[10].display);
 assert.equal(partVisible({...defaultPart('d'),render_condition:'DOOR_LEFT_OPEN'},{car:1,total:3,left:0,right:1}),false);
 assert.throws(()=>normalizeProperties({...properties,length:'oops'}),/length/);
});
test('ZIP round trip: model, texture, metadata, script and supplemental assets',()=>{
 const state={id:'test_train',model:{elements:[],outliner:[]},modelName:'test.bbmodel',texture:new Uint8Array([137,80,78,71]),properties,meta:{name:'Test',base_train_type:'c1141a_small'},script,scriptResource:'mtr:old/init.js',slots:extractSlotCfg(script).config,packFormat:6,assets:{'assets/mtr/bluevision/display_helper.js':new TextEncoder().encode('// helper'),'assets/mtr/mtr_custom_resources.json':new TextEncoder().encode('{"custom_trains":{"other":{"name":"Other"}}}')}};
 const files=exportFiles(state),zip=unzipSync(makeZip(files));assert.ok(zip['pack.mcmeta']);assert.ok(zip['assets/mtr/test_train/test_train.png']);assert.ok(zip['assets/mtr/bluevision/display_helper.js']);
 const registry=JSON.parse(strFromU8(zip['assets/mtr/mtr_custom_resources.json']));assert.equal(registry.custom_trains.other.name,'Other');assert.equal(registry.custom_trains.test_train.model,'mtr:test_train/test_train.bbmodel');assert.equal(registry.custom_trains.test_train.texture_id,'mtr:test_train/test_train');
 assert.equal(extractSlotCfg(strFromU8(zip['assets/mtr/test_train/init.js'])).config.slots.length,10);
 assert.ok(dependencyReport(files).includes('assets/mtr/bluevision/new_draw_helper.js'));
 assert.equal(dateName('test_train',new Date('2026-10-22T16:00:00Z')),'2026-10-23_test_train.zip');
 assert.throws(()=>exportFiles({...state,id:'../../bad'}),/モデルID/);
 assert.throws(()=>exportFiles({...state,assets:{'../oops':new Uint8Array()}}),/パス/);
});
test('Blockbench 5 group references convert to nested MTR outliner',()=>{
 const m={meta:{format_version:'5.0'},groups:[{uuid:'g',name:'body',origin:[0,0,0]}],outliner:[{uuid:'g',children:['cube']}],elements:[]};
 const out=mtrModel(m);assert.equal(out.outliner[0].name,'body');assert.deepEqual(out.outliner[0].children,['cube']);assert.equal(out.groups,undefined);assert.ok(m.groups);
});
