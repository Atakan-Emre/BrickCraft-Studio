import test from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {rectangularPart,studPlacement,placementOverlaps,rectangularBody} from '../src/placement.js';
const brick={id:'a',part:'3004',color:'4',position:[0,1.2,0],quaternion:[0,0,0,1]};
const parts={'3004':{name:'Brick 1 x 2'},'3003':{name:'Brick 2 x 2'},'3023':{name:'Plate 1 x 2'}};
test('a brick on another brick sits at 2.4, with no gap or body overlap',()=>{
 const info=rectangularPart(parts['3004'].name);
 const result=studPlacement({...brick,id:'b'},info,brick,info,{x:.1,z:.1});
 assert.deepEqual(result,[0,2.4,0]);assert.equal(placementOverlaps({...brick,id:'b',position:result},[brick],parts),false);
 assert.equal(placementOverlaps({...brick,id:'b',position:[0,2,0]},[brick],parts),true);
});
test('different widths use half-stud center offsets; quarter turns swap footprints',()=>{
 const wide={...brick,id:'b',part:'3003'};
 const result=studPlacement(brick,rectangularPart('Brick 1 x 2'),wide,rectangularPart('Brick 2 x 2'),{x:.2,z:.1});
 assert.equal(result[0],.5);
 const rotated={...brick,quaternion:new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI/2).toArray()};
 assert.equal(rectangularBody(rotated,rectangularPart('Brick 1 x 2')).width,2);
});
test('complex geometry and tilted parts are not falsely treated as solid boxes',()=>{
 assert.equal(rectangularPart('Technic Brick 1 x 4 with Holes'),null);
 const tilted={...brick,quaternion:new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI/2).toArray()};
 assert.equal(rectangularBody(tilted,rectangularPart('Brick 1 x 2')),null);
 assert.equal(studPlacement(brick,rectangularPart('Brick 1 x 2'),brick,rectangularPart('Tile 1 x 2 with Groove'),{x:0,z:0}),null);
});
