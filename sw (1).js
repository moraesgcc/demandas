/* Diário de Pendências — service worker
   Guarda a casca do app para abrir sem sinal.
   Não guarda dados: os dados vivem no IndexedDB do aparelho. */

const CACHE = 'pendencias-v9';
const CASCA = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CASCA))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navegação: rede primeiro (pega versão nova), cache se estiver sem sinal.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', cp));
          return r;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto (fontes, ícone): cache primeiro, rede em segundo plano.
  e.respondWith(
    caches.match(req).then(hit => {
      const rede = fetch(req).then(r => {
        if (r && r.status === 200 && (r.type === 'basic' || r.type === 'cors')) {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(req, cp));
        }
        return r;
      }).catch(() => hit);
      return hit || rede;
    })
  );
});
