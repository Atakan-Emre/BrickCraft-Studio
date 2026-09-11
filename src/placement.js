import {Vector3, Quaternion, Box3} from 'three';

// Restrict physical stud/body rules to known rectangular parts. Complex Technic,
// sloped and hinged parts remain freely positionable; a bounding box is not their body.
export function rectangularPart(name) {
  const match = /^(Brick|Plate|Tile) (\d+) x (\d+)(?: with Groove)?$/.exec(name || '');
  if(!match)return null;
  return {width:Number(match[2]),depth:Number(match[3]),height:match[1]==='Brick'?1.2:.4,studs:match[1]!=='Tile'};
}
export function rectangularBody(piece, info) {
  if(!info || (piece.scale||[1,1,1]).some(n=>Math.abs(n-1)>.001))return null;
  const q=new Quaternion().fromArray(piece.quaternion);
  const up=new Vector3(0,1,0).applyQuaternion(q), right=new Vector3(1,0,0).applyQuaternion(q);
  if(up.y<.999 || Math.max(Math.abs(right.x),Math.abs(right.z))<.999)return null;
  const rotated=Math.abs(right.z)>.99;
  const width=rotated?info.depth:info.width,depth=rotated?info.width:info.depth;
  const [x,y,z]=piece.position;
  return {width,depth,height:info.height,top:y,studs:info.studs,
    box:new Box3(new Vector3(x-width/2,y-info.height,z-depth/2),new Vector3(x+width/2,y,z+depth/2))};
}
export function studPlacement(piece, info, basePiece, baseInfo, point) {
  const body=rectangularBody(piece,info),base=rectangularBody(basePiece,baseInfo);
  if(!body || !base?.studs)return null;
  const x0=basePiece.position[0]+(base.width-body.width)/2;
  const z0=basePiece.position[2]+(base.depth-body.depth)/2;
  const x=x0+Math.round(point.x-x0),z=z0+Math.round(point.z-z0);
  if(Math.abs(x-basePiece.position[0])>=(body.width+base.width)/2-.05 || Math.abs(z-basePiece.position[2])>=(body.depth+base.depth)/2-.05)return null;
  return [x,base.top+body.height,z];
}
export function bodiesOverlap(a,b,tolerance=.025) {
  return Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x)>tolerance &&
    Math.min(a.max.y,b.max.y)-Math.max(a.min.y,b.min.y)>tolerance &&
    Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z)>tolerance;
}
export function placementOverlaps(piece, placements, parts) {
  const body=rectangularBody(piece,rectangularPart(parts[piece.part]?.name));
  if(!body)return false;
  return placements.some(other=>{
    if(other.id===piece.id)return false;
    const obstacle=rectangularBody(other,rectangularPart(parts[other.part]?.name));
    return obstacle && bodiesOverlap(body.box,obstacle.box);
  });
}
