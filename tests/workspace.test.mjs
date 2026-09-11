import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkspace,saveWorkspace,readSettings,saveSettings} from '../src/storage.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('v2 builds migrate intact, models stay separate and latest settings restore',()=>{
 const s=memory(),pieces=[{id:'mine',position:[1,2,3]}];s.setItem('parca-editor-v2:car',JSON.stringify(pieces));
 assert.deepEqual(readWorkspace(s,'car').pieces,pieces);
 saveWorkspace(s,'car',pieces,100);saveWorkspace(s,'bonsai',[],200);
 assert.deepEqual(readWorkspace(s,'car').pieces,pieces);
 assert.equal(readWorkspace(s,'car').savedAt,100);
 const settings={language:'en',modelId:'bonsai',theme:'dark',mode:'free',snap:false,favorites:['3004:4']};
 saveSettings(s,settings);assert.deepEqual(readSettings(s),settings);
});
test('corrupt primary restores last valid snapshot without destroying legacy source',()=>{
 const s=memory();saveWorkspace(s,'car',[{id:'one'}],1);saveWorkspace(s,'car',[{id:'one'},{id:'two'}],2);
 s.setItem('parca-workspace-v3:car','broken');
 assert.equal(readWorkspace(s,'car').recovered,true);assert.deepEqual(readWorkspace(s,'car').pieces,[{id:'one'}]);
});
test('quota and unavailable storage fail explicitly while retaining the last saved build',()=>{
 const s=memory();saveWorkspace(s,'car',[{id:'one'}],1);s.setItem=()=>{throw Error('quota');};
 assert.equal(saveWorkspace(s,'car',[],2).ok,false);assert.deepEqual(readWorkspace(s,'car').pieces,[{id:'one'}]);
 assert.equal(saveSettings(null,{}),false);assert.equal(readSettings(null).language,'tr');
});
