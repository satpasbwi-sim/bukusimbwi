/* Service worker Buku Digital SIM: agar buku tetap bisa dibuka tanpa internet.
   - Halaman buku, skrip simulasi, bank soal & file unduhan: ambil dari internet dulu (selalu versi
     terbaru), bila gagal pakai salinan tersimpan.
   - Gambar & font: pakai salinan tersimpan agar cepat, sambil diperbarui di latar belakang.
   - Layanan lain (survei IKM, jadwal SIM Keliling, statistik) tidak disentuh.
   Naikkan VERSI bila daftar INTI berubah. */
const VERSI = 'buku-sim-v2';
const INTI = [
  './',
  'manifest.webmanifest',
  'img/logo-lantas-baru.webp',
  'img/sampul-latar.webp',
  'img/ikon-192.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(INTI)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('buku-sim-') && k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function simpan(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    const salinan = res.clone();
    caches.open(VERSI).then(c => c.put(req, salinan));
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sendiri = url.origin === location.origin && url.pathname.startsWith(new URL('./', location).pathname);
  const gambar = /\.(webp|png|jpe?g|svg|gif|ico)$/i.test(url.pathname);

  // Halaman buku, skrip & bank soal simulasi, file unduhan: internet dulu, lalu salinan
  // (agar perubahan langsung sampai; hanya gambar yang boleh pakai salinan lebih dulu)
  if (sendiri && !gambar) {
    e.respondWith(
      fetch(req).then(res => simpan(new Request(url.pathname), res))
        .catch(() => caches.match(url.pathname, { ignoreSearch: true })
          .then(r => r || (req.mode === 'navigate' ? caches.match('./') : Response.error())))
    );
    return;
  }

  // Gambar, ikon & font Google: salinan dulu, diperbarui diam-diam
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (sendiri || font) {
    e.respondWith(
      caches.match(req).then(lama => {
        const baru = fetch(req).then(res => simpan(req, res)).catch(() => lama);
        return lama || baru;
      })
    );
  }
});
