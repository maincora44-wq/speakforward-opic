// Verify delivery and exact bytes at localhost or the deployed Pages scope.
// This is an HTTP resource check; it does not emulate a browser or device.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base)) throw new Error('Pass an HTTP(S) app URL ending with /');
const sw = fs.readFileSync(path.join(root,'sw.js'),'utf8');
const files = [...sw.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(match=>match[1]).concat('./sw.js');
const types = { '.js':'javascript', '.css':'text/css', '.html':'text/html', '.png':'image/png', '.webmanifest':'manifest' };
(async () => {
  const results = await Promise.all(files.map(async file => {
    const url = new URL(file,base);
    url.searchParams.set('verify',process.env.SF_VERIFY_REF || 'next-v4');
    const response = await fetch(url,{signal:AbortSignal.timeout(15000)});
    const bytes = Buffer.from(await response.arrayBuffer());
    const local = fs.readFileSync(path.join(root,file === './' ? 'index.html' : file));
    const contentType = response.headers.get('content-type') || '';
    const expectedType = file === './' ? 'text/html' : types[path.extname(file)];
    const digest = value => createHash('sha256').update(value).digest('hex');
    if (!response.ok || !contentType.includes(expectedType) || digest(bytes) !== digest(local)) {
      throw new Error(`${file}: status=${response.status}, type=${contentType}, bytesMatch=${digest(bytes) === digest(local)}`);
    }
    return { file, status:response.status, bytes:bytes.length, sha256:digest(bytes) };
  }));
  console.log(JSON.stringify({base,checkedAt:new Date().toISOString(),resources:results},null,2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
