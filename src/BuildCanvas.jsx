import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { applyPose, makePiece, poseOf, referenceObject, setupLights } from './parts3d';
import {rectangularPart, studPlacement, placementOverlaps} from './placement';
import { matchTarget, rotatePose } from './editor-state';

export const BuildCanvas = forwardRef(function BuildCanvas(props, ref) {
  const host = useRef(), runtime = useRef(), latest = useRef(props);
  latest.current = props;
  useImperativeHandle(ref, () => ({
    startPart: (part,event) => runtime.current?.startPart(part,event),
    rotate: axis => runtime.current?.rotate(axis),
    move: (axis,value,absolute=false) => runtime.current?.move(axis,value,absolute),
    cancel: () => runtime.current?.cancel(),
    fit: view => runtime.current?.fit(view),
    focusHint: () => runtime.current?.focusHint(),
    focus: () => runtime.current?.fit('selected'),
    ground: () => runtime.current?.ground(),
  }), []);
  useEffect(() => {
    const element = host.current;
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.domElement.setAttribute('aria-label',latest.current.canvasLabel);
    renderer.domElement.setAttribute('tabindex','0');
    element.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(38,1,.1,1500);
    camera.position.set(32,29,38);
    const controls = new OrbitControls(camera,renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor=.1;
    controls.minDistance=3; controls.maxDistance=170;
    controls.maxPolarAngle=Math.PI/2-.015;
    controls.target.set(0,0,0);
    setupLights(scene,true);
    const gizmo = new TransformControls(camera,renderer.domElement);gizmo.setMode('rotate');gizmo.setSize(.8);
    scene.add(gizmo.getHelper());
    gizmo.addEventListener('dragging-changed',event=>{controls.enabled=!event.value && !draft;});
    gizmo.addEventListener('objectChange',()=>{if(gizmo.object){updateSelection();if(draft)latest.current.onDraft({...draft.piece,...poseOf(draft.object)});}});
    gizmo.addEventListener('mouseUp',()=>{const object=gizmo.object;if(!object)return;keepAboveGround(object);if(draft)latest.current.onDraft({...draft.piece,...poseOf(object)});else{const original=latest.current.placements.find(p=>p.id===selection);if(original)commitObject(object,original);}updateSelection();});
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:0xf5f5f4,roughness:1}));
    ground.receiveShadow=true;ground.rotation.x=-Math.PI/2;ground.position.y=-.03;scene.add(ground);
    const grid = new THREE.GridHelper(160,160,0xbabdc1,0xdfe1e4); grid.position.y=.005;grid.material.transparent=true;grid.material.opacity=.22;grid.material.depthWrite=false;scene.add(grid);
    const work = new THREE.Group();scene.add(work);
    const reference = new THREE.Group();scene.add(reference);
    const hintGroup = new THREE.Group();scene.add(hintGroup);
    const selectionBox = new THREE.Box3Helper(new THREE.Box3(),0x343434);
    selectionBox.visible=false;scene.add(selectionBox);
    const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
    const objects = new Map();
    let draft=null, selection=null, dragging=false, dragMoved=false, startPoint=null, pointerDown=false;
    let dragPlaneHeight=0, grabOffset=new THREE.Vector3(), lastStatus=null, referenceCache=null, hintObject=null, activeModel=null;
    let frame, disposed=false;
    const localPoint = event => {
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      raycaster.setFromCamera(pointer,camera);
      return event.clientX>=rect.left && event.clientX<=rect.right && event.clientY>=rect.top && event.clientY<=rect.bottom;
    };
    const rootOf = object => { while(object && object.parent!==work)object=object.parent;return object; };
    const setSelection = id => { selection=id;latest.current.onSelect(id);updateSelection(); };
    function updateSelection() {
      const object=draft?.object || objects.get(selection);
      selectionBox.visible=Boolean(object) && !latest.current.reference;
      if(object) selectionBox.box.setFromObject(object);
      if(latest.current.tool==='rotate' && object && !latest.current.reference){if(gizmo.object!==object)gizmo.attach(object);}else gizmo.detach();
    }
    function keepAboveGround(object) {
      const box=new THREE.Box3().setFromObject(object);
      if(box.min.y<0) object.position.y-=box.min.y;
      object.updateMatrixWorld(true);
    }
    const getPiece = object => ({...(draft?.object===object?draft.piece:latest.current.placements.find(p=>objects.get(p.id)===object)),...poseOf(object)});
    const overlaps = piece => placementOverlaps(piece,latest.current.placements,latest.current.model?.parts||{});
    function status(value) { if(lastStatus!==value){lastStatus=value;latest.current.onPlacementStatus?.(value);}selectionBox.material.color.set(value==='overlap'?0xdb4545:value==='stud'?0x338675:latest.current.theme==='dark'?0xffffff:0x343434); }
    function commitObject(object, original, isNew=false) {
      keepAboveGround(object);
      let piece={...original,...poseOf(object)};
      if(overlaps(piece)){latest.current.onNotice?.('Bu konumda parçalar çakışıyor. Parçayı başka yere taşı.');if(!isNew)applyPose(object,original);status('overlap');return false;}
      delete piece.targetId;
      const target=latest.current.snap && matchTarget(piece,latest.current.model?.pieces || [],latest.current.placements);
      if(target){ piece={...piece,position:target.position.slice(),quaternion:target.quaternion.slice(),scale:target.scale.slice(),targetId:target.id};applyPose(object,piece); }
      if(overlaps(piece)){latest.current.onNotice?.('Bu konumda parçalar çakışıyor. Parçayı başka yere taşı.');if(!isNew)applyPose(object,original);status('overlap');return false;}
      latest.current.onCommit(piece,isNew);
      latest.current.onDraft(null);setSelection(piece.id);status(null);return true;
    }
    function clearDraft() {
      if(draft){work.remove(draft.object);if(draft.existingId && objects.has(draft.existingId))objects.get(draft.existingId).visible=true;}
      draft=null; dragging=false; pointerDown=false;controls.enabled=true;grabOffset.set(0,0,0);status(null);
      latest.current.onDraft(null);updateSelection();
    }
    function cancel() {
      status(null);
      if(draft){clearDraft();return;}
      if(dragging) syncPlacements(latest.current.placements);
      dragging=false;pointerDown=false;controls.enabled=true;
      updateSelection();
    }
    function previewAt(event) {
      if(!localPoint(event)) return false;
      const object=draft?.object || (dragging && objects.get(selection));
      if(!object) return false;
      const hits=raycaster.intersectObjects([...objects.values()].filter(o=>o!==object && o.visible),true);
      const hit=hits.find(h=>h.face && h.face.normal.clone().transformDirection(h.object.matrixWorld).y>.7);
      const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-dragPlaneHeight);
      const point=new THREE.Vector3();
      if(!raycaster.ray.intersectPlane(plane,point))return false;
      let floor=0;
      if(hit && hit.point.distanceTo(camera.position)<point.distanceTo(camera.position)) {
        point.copy(hit.point); floor=Math.max(0,Math.round((hit.point.y-.19)/.4)*.4);
      }
      point.add(grabOffset);
      const zero=object.position.y;object.position.y=0;object.updateMatrixWorld(true);
      const bottom=new THREE.Box3().setFromObject(object).min.y;
      object.position.y=zero;
      const snap=latest.current.snap;
      object.position.set(snap?Math.round(point.x*2)/2:point.x,floor-bottom,snap?Math.round(point.z*2)/2:point.z);
      let feedback=snap?(hit?'surface':'floor'):'free';
      if(snap && hit){
        const baseObject=rootOf(hit.object), base=latest.current.placements.find(p=>objects.get(p.id)===baseObject);
        const piece=getPiece(object),parts=latest.current.model.parts;
        const connection=base && studPlacement(piece,rectangularPart(parts[piece.part]?.name),base,rectangularPart(parts[base.part]?.name),point);
        if(connection){object.position.fromArray(connection);feedback='stud';}
      }
      // Source targets attract only when the builder explicitly requested a hint.
      const piece=getPiece(object);
      const target=snap && latest.current.hint && matchTarget(piece,[latest.current.hint],latest.current.placements);
      if(target){applyPose(object,target);feedback='target';}
      object.updateMatrixWorld(true);updateSelection();
      status(overlaps(getPiece(object))?'overlap':feedback);
      if(draft) latest.current.onDraft({...draft.piece,...poseOf(object)});
      return true;
    }
    function startPart(group,event) {
      if(!latest.current.model || latest.current.reference)return;
      clearDraft();
      const piece={id:crypto.randomUUID(),part:group.part,color:group.color,position:[0,0,0],quaternion:[0,0,0,1],scale:[1,1,1]};
      const object=makePiece(latest.current.model.loaded[piece.part],piece.color);
      applyPose(object,piece);keepAboveGround(object);work.add(object);
      draft={piece,object};dragPlaneHeight=0;controls.enabled=false;grabOffset.set(0,0,0);
      if(objects.size===0)fit();
      latest.current.onDraft({...piece,...poseOf(object)});
      setSelection(null);
      if(event){pointerDown=true;startPoint=[event.clientX,event.clientY];previewAt(event);}
      updateSelection();
    }
    function rotate(axis) {
      const object=draft?.object || objects.get(selection);
      const original=draft?.piece || latest.current.placements.find(p=>p.id===selection);
      if(!object || !original)return;
      const pose=rotatePose(poseOf(object),axis);applyPose(object,pose);keepAboveGround(object);
      if(draft)latest.current.onDraft({...original,...poseOf(object)});else commitObject(object,original);
      updateSelection();
    }
    function move(axis,value,absolute) {
      const object=draft?.object || objects.get(selection);
      const original=draft?.piece || latest.current.placements.find(p=>p.id===selection);
      if(!object || !original || !Number.isFinite(value))return;
      object.position[axis]=absolute?value:object.position[axis]+value;object.updateMatrixWorld(true);keepAboveGround(object);
      if(draft)latest.current.onDraft({...original,...poseOf(object)});else commitObject(object,original);
      updateSelection();
    }
    function dropToGround() {
      const object=draft?.object||objects.get(selection),original=draft?.piece||latest.current.placements.find(p=>p.id===selection);
      if(!object||!original)return;
      const bounds=new THREE.Box3().setFromObject(object);object.position.y-=bounds.min.y;object.updateMatrixWorld(true);
      if(draft){latest.current.onDraft({...original,...poseOf(object)});status(overlaps(getPiece(object))?'overlap':'floor');}else commitObject(object,original);
      updateSelection();
    }
    function fit(view='iso') {
      const model=latest.current.model;
      let box=latest.current.reference && referenceCache ? new THREE.Box3().setFromObject(referenceCache) : work.children.length ? new THREE.Box3().setFromObject(work) : null;
      if(view==='selected' && (draft?.object||objects.get(selection)))box=new THREE.Box3().setFromObject(draft?.object||objects.get(selection));
      if(view!=='selected' && !latest.current.reference && hintGroup.children.length){const hintBounds=new THREE.Box3().setFromObject(hintGroup);box=box?box.union(hintBounds):hintBounds;}
      const center=box?.getCenter(new THREE.Vector3()) || new THREE.Vector3();
      const dimensions=box?.getSize(new THREE.Vector3());
      const range=dimensions?Math.max(4.5,dimensions.length()*.85):15;
      const direction = view==='top'?new THREE.Vector3(.001,1,.001):view==='front'?new THREE.Vector3(0,.18,1):new THREE.Vector3(.8,.72,1).normalize();
      camera.position.copy(center).addScaledVector(direction,range*1.8*Math.max(1,1/camera.aspect)); controls.target.copy(center);controls.update();
    }
    function focusHint() {
      const target=latest.current.hint;
      if(!target)return;
      const existing=latest.current.placements.find(p=>p.id===selection && p.part===target.part && p.color===target.color && !p.targetId);
      if(existing){clearDraft();const object=makePiece(latest.current.model.loaded[existing.part],existing.color);work.add(object);objects.get(existing.id).visible=false;draft={piece:existing,object,existingId:existing.id};controls.enabled=false;}
      if(!draft || draft.piece.part!==target.part || draft.piece.color!==target.color) startPart(target);
      applyPose(draft.object,target); draft.hintPose=target;dragMoved=false;startPoint=null;pointerDown=false;
      latest.current.onDraft({...draft.piece,...poseOf(draft.object)});updateSelection();
    }
    function syncPlacements(pieces) {
      const wasEmpty=objects.size===0;
      const ids=new Set(pieces.map(p=>p.id));
      for(const [id,object]of objects)if(!ids.has(id)){work.remove(object);objects.delete(id);}
      if(!latest.current.model)return;
      pieces.forEach(piece=>{
        let object=objects.get(piece.id);
        if(!object){object=makePiece(latest.current.model.loaded[piece.part],piece.color);objects.set(piece.id,object);work.add(object);}
        applyPose(object,piece);
      });updateSelection();if(wasEmpty && pieces.length)fit();
    }
    const onDown=event=>{
      if(event.button!==0 || latest.current.reference || (latest.current.tool==='rotate' && gizmo.axis))return;
      if(draft){pointerDown=true;startPoint=[event.clientX,event.clientY];if(!draft.hintPose)previewAt(event);return;}
      localPoint(event);
      const hits=raycaster.intersectObjects([...objects.values()],true);
      if(hits.length){
        const object=rootOf(hits[0].object);const id=[...objects.entries()].find(([,o])=>o===object)?.[0];
        setSelection(id);dragging=true;dragMoved=false;startPoint=[event.clientX,event.clientY];pointerDown=true;
        dragPlaneHeight=hits[0].point.y;
        grabOffset.set(object.position.x-hits[0].point.x,0,object.position.z-hits[0].point.z);
        controls.enabled=false;event.preventDefault();
      }else setSelection(null);
    };
    const onMove=event=>{
      if(latest.current.reference || gizmo.dragging || (latest.current.tool==='rotate' && draft))return;
      if(draft || dragging){
        if(startPoint && Math.hypot(event.clientX-startPoint[0],event.clientY-startPoint[1])>3)dragMoved=true;
        if(draft?.hintPose && pointerDown && dragMoved)delete draft.hintPose;
        if((draft && !draft.hintPose) || dragMoved && !draft?.hintPose)previewAt(event);
        renderer.domElement.style.cursor='grabbing';
      }else {localPoint(event);renderer.domElement.style.cursor=raycaster.intersectObjects([...objects.values()],true).length?'grab':'default';}
    };
    const onUp=event=>{
      if(!pointerDown)return;pointerDown=false;
      if(draft){
        if(localPoint(event)){
          const object=draft.object,piece=draft.piece,isNew=!draft.existingId;
          if(overlaps(getPiece(object))){status('overlap');return;}
          if(!commitObject(object,piece,isNew))return;
          if(draft.existingId && objects.has(draft.existingId))objects.get(draft.existingId).visible=true;
          work.remove(object);draft=null;
          controls.enabled=true;
        }
      }else if(dragging){
        dragging=false;controls.enabled=true;
        const original=latest.current.placements.find(p=>p.id===selection);
        if(original && dragMoved)commitObject(objects.get(selection),original);
      }
      updateSelection();
    };
    renderer.domElement.addEventListener('pointerdown',onDown,{capture:true});
    window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp);
    window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);
    const resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();fit();});resize.observe(element);
    function animate(){if(disposed)return;frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
    runtime.current={startPart,rotate,move,cancel,fit,ground:dropToGround,focusHint,syncPlacements,
      label(value){renderer.domElement.setAttribute('aria-label',value);},
      syncTool(){gizmo.setRotationSnap(latest.current.snap?Math.PI/12:null);updateSelection();},
      syncTheme(theme){const dark=theme==='dark';scene.background=new THREE.Color(dark?0x191919:0xf4f4f2);ground.material.color.set(dark?0x202020:0xf4f4f2);scene.fog=new THREE.Fog(scene.background,70,170);grid.material.opacity=dark?.26:.22;grid.material.color.set(dark?0x444444:0xd3d3d0);selectionBox.material.color.set(dark?0xffffff:0x262626);},
      select(id){selection=id;updateSelection();},
      showReference(value,model){
        clearDraft();
        if(model!==activeModel){if(referenceCache){reference.remove(referenceCache);referenceCache.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}referenceCache=null;activeModel=model;}
        if(value && model && !referenceCache){referenceCache=referenceObject(model);reference.add(referenceCache);}
        reference.visible=value;work.visible=!value;hintGroup.visible=!value;
        selectionBox.visible=!value && Boolean(selection);updateSelection();
        fit();
      },
      showHint(target){
        hintGroup.clear(); hintObject=null;
        if(target && latest.current.model){
          hintObject=makePiece(latest.current.model.loaded[target.part],target.color);
          const material=new THREE.MeshBasicMaterial({color:0x6e919d,transparent:true,opacity:.38,depthWrite:false});
          hintObject.traverse(o=>{if(o.isMesh)o.material=material;});applyPose(hintObject,target);hintGroup.add(hintObject);fit();
        }
      }
    };
    runtime.current.syncTheme(latest.current.theme);
    runtime.current.syncPlacements(latest.current.placements);
    return()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);controls.dispose();gizmo.dispose();renderer.dispose();ground.geometry.dispose();ground.material.dispose();grid.geometry.dispose();grid.material.dispose();element.removeChild(renderer.domElement);runtime.current=null;};
  },[]);
  useEffect(()=>{runtime.current?.syncPlacements(props.placements);},[props.placements,props.model]);
  useEffect(()=>{runtime.current?.select(props.selected);},[props.selected]);
  useEffect(()=>{runtime.current?.syncTheme(props.theme);},[props.theme]);
  useEffect(()=>{runtime.current?.label(props.canvasLabel);},[props.canvasLabel]);
  useEffect(()=>{runtime.current?.syncTool();},[props.tool,props.snap]);
  useEffect(()=>{runtime.current?.showReference(props.reference,props.model);},[props.reference,props.model]);
  useEffect(()=>{runtime.current?.showHint(props.hint);},[props.hint,props.model]);
  return <div className="build-canvas" ref={host} data-testid="build-canvas"/>;
});
