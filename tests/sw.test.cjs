const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const scope = 'https://example.test/speakforward-opic/';

function worker() {
  const handlers = {}, stores = new Map();
  let online = true, claimed = false, skipped = false;
  const key = request => new URL(typeof request === 'string' ? request : request.url, scope).href;
  const fetch = async request => {
    if (!online) throw new Error('offline');
    const url = new URL(key(request));
    const relative = url.pathname.slice('/speakforward-opic/'.length) || 'index.html';
    return new Response(fs.readFileSync(path.join(root, relative)));
  };
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async addAll(files) {
          const values = await Promise.all(files.map(async file => [key(file), await fetch(file)]));
          for (const [url, response] of values) entries.set(url, response);
        },
        async match(request) { return entries.get(key(request))?.clone(); }
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
  const self = { location: {origin:new URL(scope).origin,href:scope+'sw.js'},
    addEventListener(type, handler) { handlers[type] = handler; },
    clients: { async claim() { claimed = true; } }, skipWaiting() { skipped = true; } };
  vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'), {self,caches,fetch,URL});
  return { stores, handlers, offline() { online = false; }, get claimed() { return claimed; }, get skipped() { return skipped; },
    lifecycle(type) { let task; handlers[type]({waitUntil(value) { task = value; }}); return task; },
    request(relative, method='GET', mode='same-origin') {
      let task; handlers.fetch({request:{url:new URL(relative,scope).href,method,mode},respondWith(value) {task=value;}}); return task;
    }
  };
}
test('installed shell serves navigation and every deferred script from cache when network fails', async () => {
  const env = worker(); await env.lifecycle('install'); env.offline();
  const html = await (await env.request('lesson/1','GET','navigate')).text();
  assert.match(html,/finance-data\.js/);
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match=>match[1]);
  for (const script of scripts) {
    const response = await env.request(script); assert.equal(response.status,200);
    assert.equal(await response.text(),fs.readFileSync(path.join(root,script),'utf8'));
  }
});
test('worker activation retains unrelated caches and waits for explicit update requests', async () => {
  const env = worker(); env.stores.set('speakforward-shell-v2',new Map()); env.stores.set('another-app',new Map());
  await env.lifecycle('install'); assert.equal(env.skipped,false); await env.lifecycle('activate');
  assert.equal(env.stores.has('speakforward-shell-v2'),false); assert.equal(env.stores.has('another-app'),true);
  assert.equal(env.claimed,true); assert.equal(env.skipped,false);
  env.handlers.message({data:{type:'SKIP_WAITING'}}); assert.equal(env.skipped,true);
});
test('worker respects scope, method and initial-install failure', async () => {
  const env = worker();
  assert.equal(env.request('../outside/'),undefined); assert.equal(env.request('app.js','POST'),undefined);
  assert.equal(env.request('https://fred.stlouisfed.org/series/DEXKOUS'),undefined);
  env.offline(); await assert.rejects(env.lifecycle('install'),/offline/);
});
