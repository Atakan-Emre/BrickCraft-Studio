import test from 'node:test';
import assert from 'node:assert/strict';
import { Quaternion } from 'three';
import { historyReducer, INITIAL_HISTORY, rotatePose, matchTarget, validPlacements } from '../src/editor-state.js';
const piece={id:'placed-1',part:'3001',color:'4',position:[0,1.2,0],quaternion:[0,0,0,1],scale:[1,1,1]};
test('undo restores a moved piece; editing after undo discards obsolete redo',()=>{
  const added=historyReducer(INITIAL_HISTORY,{type:'set',pieces:[piece]});
  const moved=historyReducer(added,{type:'set',pieces:[{...piece,position:[5,1.2,3]}]});
  const undone=historyReducer(moved,{type:'undo'});
  assert.deepEqual(undone.present,[piece]);
  assert.deepEqual(historyReducer(undone,{type:'redo'}).present,moved.present);
  const branched=historyReducer(undone,{type:'set',pieces:[{...piece,color:'0'}]});
  assert.equal(branched.future.length,0);assert.deepEqual(historyReducer(branched,{type:'redo'}),branched);
});
test('four 90 degree turns preserve orientation and position on each world axis',()=>{
  for(const axis of ['x','y','z']){
    let pose=piece;for(let i=0;i<4;i++)pose=rotatePose(pose,axis);
    assert.ok(new Quaternion().fromArray(pose.quaternion).angleTo(new Quaternion())<1e-7);
    assert.deepEqual(pose.position,piece.position);
  }
});
test('target snapping requires right part, color, orientation and an unoccupied target',()=>{
  const target={...piece,id:'target-1'};
  assert.equal(matchTarget({...piece,position:[.25,1.2,0]},[target],[]),target);
  assert.equal(matchTarget({...piece,color:'0'},[target],[]),undefined);
  assert.equal(matchTarget(rotatePose(piece,'y'),[target],[]),undefined);
  assert.equal(matchTarget({...piece,scale:[-1,1,1]},[target],[]),undefined);
  assert.equal(matchTarget(piece,[target],[{...piece,id:'other',targetId:target.id}]),undefined);
  assert.equal(matchTarget({...piece,targetId:target.id},[target],[{...piece,targetId:target.id}]),target);
});
test('saved files reject missing geometries, non-finite coordinates, duplicate IDs and invalid rotations',()=>{
  const model={loaded:{3001:{}},pieces:[]};
  const values=[piece,piece,{...piece,id:'bad1',part:'missing'},{...piece,id:'bad2',position:[NaN,0,0]},{...piece,id:'bad3',quaternion:[0,0,0,0]}];
  assert.deepEqual(validPlacements(values,model),[piece]);
  assert.equal(validPlacements([{...piece,targetId:'forged-target'}],model)[0].targetId,undefined);
});
