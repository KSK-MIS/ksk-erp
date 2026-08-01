// KSK ERP service worker — minimal shell cache so the app is installable & loads offline-first for static files.
const CACHE='ksk-erp-v1';
const SHELL=['./','./index.html','./kartavya.html','./orders.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).catch(()=>{})));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  // never cache Supabase or cross-origin API/auth calls
  if(u.origin!==location.origin){return;}
  e.respondWith(
    fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp).catch(()=>{}));return r;})
      .catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html')))
  );
});
