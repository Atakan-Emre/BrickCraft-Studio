"""Vendor selected original LDraw parts, preserving embedded authors and licenses."""
import zipfile, pathlib, re, json
root=pathlib.Path(__file__).resolve().parents[1]
z=zipfile.ZipFile(root/'.cache/ldraw-complete.zip')
keys={n.lower():n for n in z.namelist()}
parts='3001 3003 3004 3005 3029 3020 3022 3023 3024 3031 3032 3034 3068b 3069b 3070b 3037 3039 3040b 3062b 3941 3942c 6222 3943b 3958 4032 4589 4600 4624 3641 3829c01 4865 3811'.split()
out=root/'public/ldraw';out.mkdir(parents=True,exist_ok=True)
for p in parts:
 seen={}
 def visit(name):
  name=name.replace('\\','/').lower()
  if name in seen:return
  found=next((keys['ldraw/'+folder+name] for folder in ['parts/','p/',''] if 'ldraw/'+folder+name in keys),None)
  if not found:raise RuntimeError(name)
  text=z.read(found).decode('utf-8-sig').replace('\\','/')
  seen[name]=text
  for line in text.splitlines():
   fields=line.strip().split()
   if fields and fields[0]=='1':visit(' '.join(fields[14:]))
 visit(p+'.dat')
 packed='0 FILE main.ldr\n0 Packed official part\n0 !LDRAW_ORG Model\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 '+p+'.dat\n'
 packed+='\n'.join('0 FILE '+('parts/'+name if name.startswith('s/') else 'p/'+name if name.startswith('48/') else name)+'\n'+t for name,t in seen.items())
 (out/(p+'.mpd')).write_text(packed)
for name in ['LDConfig.ldr','CAreadme.txt','CAlicense.txt','CAlicense4.txt']:
 (out/name).write_bytes(z.read('ldraw/'+name))
print('Packed',len(parts),'parts; total bytes',sum(f.stat().st_size for f in out.iterdir()))
