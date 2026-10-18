const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('PWA manifest has scoped relative URLs and real 192/512 icons',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){const png=fs.readFileSync(path.join(root,icon.src));const size=Number(icon.sizes.split('x')[0]);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
});
test('all shell resources exist; no external CDN or tracking dependency',()=>{
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');const paths=sw.match(/const FILES = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1));
 for(const file of paths)assert.ok(fs.existsSync(path.join(root,file)),file);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.equal(/https?:\/\//.test(html),false);
 for(const module of ['shadow','exam','intro','record','builder'])assert.ok(html.includes(`id="${module}"`));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
