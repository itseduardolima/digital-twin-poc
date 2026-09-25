import fs from "node:fs";
const g = JSON.parse(fs.readFileSync("public/models/scene.gltf","utf8"));
const mul=(a,b)=>{const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o};
const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const rows=[];
function walk(i,pm){const n=g.nodes[i];let m=n.matrix?n.matrix:I;const w=mul(pm,m);
 if(n.mesh!=null){const p=g.meshes[n.mesh].primitives[0],a=g.accessors[p.attributes.POSITION];let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++){const v=[x?a.max[0]:a.min[0],y?a.max[1]:a.min[1],z?a.max[2]:a.min[2]];
   for(let k=0;k<3;k++){const t=w[k]*v[0]+w[4+k]*v[1]+w[8+k]*v[2]+w[12+k];mn[k]=Math.min(mn[k],t);mx[k]=Math.max(mx[k],t)}}
  rows.push({name:g.nodes[i-1]?.name,parent:i,mn,mx})}
 (n.children||[]).forEach(c=>walk(c,w))}
g.scenes[0].nodes.forEach(r=>walk(r,I));
const f=v=>v.map(x=>x.toFixed(2)).join(",");
rows.forEach(r=>console.log(r.name.padEnd(22),f(r.mn).padEnd(24),f(r.mx)));
