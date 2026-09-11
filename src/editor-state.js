import * as THREE from 'three';

export const INITIAL_HISTORY = {past:[], present:[], future:[]};
export function historyReducer(state, action) {
  if (action.type === 'load') return {past:[],present:action.pieces,future:[]};
  if (action.type === 'undo') return state.past.length ? {past:state.past.slice(0,-1), present:state.past.at(-1), future:[state.present,...state.future]} : state;
  if (action.type === 'redo') return state.future.length ? {past:[...state.past,state.present],present:state.future[0],future:state.future.slice(1)} : state;
  const present = typeof action.pieces === 'function' ? action.pieces(state.present) : action.pieces;
  if (JSON.stringify(present) === JSON.stringify(state.present)) return state;
  return {past:[...state.past.slice(-59),state.present],present,future:[]};
}
export function rotatePose(pose, axis, angle = Math.PI / 2) {
  const direction = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
  const quaternion = new THREE.Quaternion().setFromAxisAngle(direction,angle).multiply(new THREE.Quaternion().fromArray(pose.quaternion));
  return {...pose, quaternion:quaternion.toArray()};
}
export function matchTarget(piece, targets, placements, distance = .65) {
  const occupied = new Set(placements.filter(p=>p.id !== piece.id && p.targetId).map(p=>p.targetId));
  return targets.filter(t => t.part === piece.part && t.color === piece.color && !occupied.has(t.id)).find(target => {
    const a = new THREE.Vector3().fromArray(piece.position), b = new THREE.Vector3().fromArray(target.position);
    const qa = new THREE.Quaternion().fromArray(piece.quaternion), qb = new THREE.Quaternion().fromArray(target.quaternion);
    return a.distanceTo(b) < distance && qa.angleTo(qb) < .2 && (piece.scale||[1,1,1]).every((s,i)=>Math.abs(s-(target.scale||[1,1,1])[i])<.001);
  });
}
export function validPlacements(value, model) {
  const ids = new Set();
  if (!Array.isArray(value)) return [];
  return value.filter(p => {
    const valid = p && typeof p.id === 'string' && !ids.has(p.id) && Object.hasOwn(model.loaded,p.part) && typeof p.color === 'string'
      && Array.isArray(p.position) && p.position.length === 3 && p.position.every(n=>Number.isFinite(n)&&Math.abs(n)<10000)
      && Array.isArray(p.quaternion) && p.quaternion.length === 4 && p.quaternion.every(Number.isFinite)
      && Math.abs(Math.hypot(...p.quaternion)-1)<.01
      && (!p.scale || (p.scale.length===3 && p.scale.every(n=>Number.isFinite(n)&&Math.abs(n)>0.00001&&Math.abs(n)<100)));
    if(valid)ids.add(p.id);
    return valid;
  }).map(p=>{
    const target = p.targetId && model.pieces?.find(t=>t.id===p.targetId);
    if(p.targetId && (!target || !matchTarget(p,[target],[],.01))){const copy={...p};delete copy.targetId;return copy;}
    return p;
  });
}
