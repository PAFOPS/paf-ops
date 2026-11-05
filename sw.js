/* PAF OPS — service worker : l'application s'ouvre même sans réseau, et affiche les notifications.
   La page est toujours redemandée au serveur (jamais une copie ancienne) ; la copie locale ne sert que hors réseau. */
const CACHE='pafops-v4';
const FILES=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!=='pafops-cfg'&&k.indexOf('pafnav')!==0).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin)return; // les appels au serveur Apps Script ne passent jamais par ici
 const fresh=e.request.mode==='navigate'||u.pathname.endsWith('.html')||u.pathname.endsWith('/');
 e.respondWith(Promise.race([fetch(e.request,fresh?{cache:'no-store'}:{}),new Promise((_,k)=>setTimeout(()=>k(new Error('lent')),fresh?5000:8000))]).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request,{ignoreSearch:fresh}).then(r=>r||caches.match('./index.html')||caches.match('./'))));
});
/* Notification reçue : c'est un simple « réveil » ; on va chercher le détail avec le lien personnel enregistré par la page */
self.addEventListener('push',e=>{e.waitUntil((async()=>{
 let items=[];
 try{const c=await caches.open('pafops-cfg');const k=await (await c.match('/k')).text(),api=await (await c.match('/api')).text();
  const r=await Promise.race([fetch(api,{method:'POST',body:JSON.stringify({op:'inbox',p:{k}}),redirect:'follow'}),new Promise((_,x)=>setTimeout(()=>x(new Error('lent')),6000))]);const j=await r.json();items=j.items||[]}catch(err){}
 if(!items.length)items=[{id:'pafops',title:'PAF OPS',body:'Du nouveau pour vous dans PAF OPS.',url:'./'}];
 for(const it of items)await self.registration.showNotification(it.title||'PAF OPS',{body:it.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:it.id||'pafops',data:{url:it.url||'./'}});
})())});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=(e.notification.data&&e.notification.data.url)||'./',go=(url.match(/[?&]go=([a-z]+)/)||[])[1];
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(L=>{const w=L.find(c=>'focus' in c);if(w){if(go)w.postMessage({go});return w.focus()}return self.clients.openWindow(url)}))});
