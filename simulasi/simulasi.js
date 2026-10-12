/* Simulasi Ujian Teori bergaya E-AVIS — LATIHAN, bukan ujian resmi.
   Dimuat hanya saat pemohon menekan "Mulai simulasi". Bank soal: simulasi/soal-eavis.json
   (berisi soal yang sudah disetujui petugas penguji). Ilustrasi Persepsi Bahaya digambar
   langsung sebagai SVG dari "resep adegan" setiap soal, sehingga tidak ada file gambar. */
(function () {
  'use strict';

  /* =====================================================================
     1. PENGGAMBAR ADEGAN (SVG 640×360, sudut pandang pengemudi)
     ===================================================================== */
  const W = 640, H = 360, HOR = 140, SPAN = 260, HALF = 380, SC = 1.35;
  const Z = { dekat: 1.95, sedang: 2.8, jauh: 5 };
  // posisi lateral menurut jenis unsur: orang di trotoar, kendaraan di lajur, rambu di tepi jalan
const U_ORANG = { kiri: -1.2, tengah: -0.35, kanan: 1.2 }, U_KEND = { kiri: -0.72, tengah: -0.45, kanan: 0.5 }, U_TEPI = { kiri: -1.3, tengah: -0.5, kanan: 1.3 };
  const ORANG = /^(pejalan|pejalan_hp|anak|pekerja|polisi|tuna_netra|bola|hewan|pasar|keluar_rumah)$/, TEPI = /^(rambu|apill|sekolah|tiang|segitiga|tikungan_buta)$/;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function scene(a) {
    const jalan = a.j || 'kota', cuaca = a.c || 'cerah';
    const narrow = jalan === 'gang' ? 0.62 : jalan === 'permukiman' ? 0.85 : 1;
    const bend = jalan === 'tikungan' ? 230 : 0;
    const cx = z => W / 2 + bend * (1 - 1 / z) * (1 - 1 / z);
    const yz = z => HOR + SPAN / z;
    const P = (u, z) => [cx(z) + u * HALF * narrow / z, yz(z)];
    const at = (u, z) => { const [x, y] = P(u, z); return `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(SC / z).toFixed(3)})`; };
    const strip = (u1, u2, z1, z2, fill, extra = '') => {
      const pts = [];
      for (let i = 0; i <= 16; i++) { const z = z1 + (z2 - z1) * (i / 16) ** 2; pts.push(P(u1, z)); }
      for (let i = 16; i >= 0; i--) { const z = z1 + (z2 - z1) * (i / 16) ** 2; pts.push(P(u2, z)); }
      return `<polygon points="${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}" fill="${fill}"${extra}/>`;
    };
    const night = cuaca === 'malam';
    const sky = { cerah: ['#8ec5f2', '#dbeefb'], hujan: ['#7c8794', '#b6bec7'], kabut: ['#cfd5da', '#e9ecef'], malam: ['#0b1430', '#26375e'] }[cuaca] || ['#8ec5f2', '#dbeefb'];
    let s = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>`;
    s += `<rect width="${W}" height="${HOR + 2}" fill="url(#sky)"/>`;
    s += `<rect y="${HOR}" width="${W}" height="${H - HOR}" fill="${night ? '#1b2a1b' : jalan === 'kota' || jalan === 'simpang' || jalan === 'rel' ? '#9aa3a8' : '#7fa36b'}"/>`;
    // latar: bangunan / rumah / pepohonan
    s += backdrop(jalan, P, night);
    // badan jalan
    const road = night ? '#2a2d33' : '#5d636b';
    if (jalan !== 'tol' && jalan !== 'antarkota') s += strip(-1.45, -1, 1, 60, night ? '#3b3f46' : '#b9b3a8') + strip(1, 1.45, 1, 60, night ? '#3b3f46' : '#b9b3a8');
    s += strip(-1, 1, 1, 60, road);
    if (jalan === 'tol') { s += strip(1, 1.08, 1, 60, '#d9d9d9'); s += strip(-1.06, -1, 1, 60, '#e8e8e8'); }
    // marka tengah
    const solid = (a.h || []).some(h => h.startsWith('marka_utuh'));
    for (let z = 1.05; z < 40; z *= 1.32) {
      const z2 = solid ? z * 1.33 : z * 1.14;
      s += strip(-0.012, 0.012, z, z2, jalan === 'tol' ? '#f4f4f4' : '#f6f6f6');
    }
    if (jalan === 'tol') s += strip(-0.008, 0.008, 1, 60, 'none');
    s += strip(-0.99, -0.965, 1, 60, '#f2f2f2') + strip(0.965, 0.99, 1, 60, jalan === 'tol' ? '#f2c94c' : '#f2f2f2');
    if (jalan === 'simpang') s += strip(-1.6, 1.6, 3.2, 4.6, road) + strip(-1, 0, 2.9, 3.0, '#fff');
    if (jalan === 'rel') s += rails(P);
    if (jalan === 'terowongan') s += tunnel(P);
    // unsur bahaya, digambar dari jauh ke dekat
    const items = (a.h || []).map(h => {
      const m = /^([a-z_]+)(?:\/([\w]+))?@(\w+):(\w+)$/.exec(h) || [];
      const U = ORANG.test(m[1]) ? U_ORANG : TEPI.test(m[1]) ? U_TEPI : U_KEND;
      return { t: m[1], v: m[2], u: U[m[3]] ?? -0.5, z: Z[m[4]] ?? 3, pos: m[3] };
    }).sort((p, q) => q.z - p.z);
    for (const it of items) s += sprite(it, at, P, strip);
    // cuaca
    if (cuaca === 'hujan') s += rain();
    if (cuaca === 'kabut') s += `<rect width="${W}" height="${H}" fill="#eef1f3" opacity=".55"/><rect width="${W}" height="${HOR + 40}" fill="#f4f6f7" opacity=".5"/>`;
    if (night) s += `<polygon points="${P(-0.9, 1.2)} ${P(-0.25, 6)} ${P(0.2, 6)} ${P(0.2, 1.2)}" fill="#fff6c8" opacity=".18"/>`;
    // sudut pandang & spidometer
    s += cockpit(a.k || 'mobil', a.v || 0, items);
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" focusable="false" class="sim-scene">${s}</svg>`;
  }

  function backdrop(jalan, P, night) {
    let s = '';
    const win = night ? '#ffd76a' : '#cfe3f3';
    if (jalan === 'kota' || jalan === 'simpang' || jalan === 'rel' || jalan === 'terowongan') {
      const cols = ['#c97b63', '#e0c7a1', '#9fb6c9', '#d9a5a5', '#b4c49a', '#e8d9b5'];
      for (let i = 9; i >= 0; i--) {
        const z = 1.6 + i * 1.5, side = i % 2 ? 1 : -1;
        const [x, y] = P(side * 1.55, z), w = 420 / z, h = (330 + (i * 61) % 200) / z;
        const x0 = side < 0 ? x - w : x;
        s += `<rect x="${x0.toFixed(1)}" y="${(y - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${cols[i % 6]}"/>`;
        for (let r = 0; r < 3; r++) s += `<rect x="${(x0 + w * 0.15).toFixed(1)}" y="${(y - h + h * (0.15 + r * 0.27)).toFixed(1)}" width="${(w * 0.7).toFixed(1)}" height="${(h * 0.12).toFixed(1)}" fill="${win}" opacity=".85"/>`;
      }
    } else if (jalan === 'permukiman' || jalan === 'gang') {
      for (let i = 9; i >= 0; i--) {
        const z = 1.5 + i * 1.3, side = i % 2 ? 1 : -1;
        const [x, y] = P(side * (jalan === 'gang' ? 1.12 : 1.5), z), w = 330 / z, h = 170 / z;
        const x0 = side < 0 ? x - w : x;
        if (jalan === 'gang') s += `<rect x="${x0.toFixed(1)}" y="${(y - h * 1.1).toFixed(1)}" width="${w.toFixed(1)}" height="${(h * 1.1).toFixed(1)}" fill="${i % 3 ? '#e6e0d3' : '#d6cfc0'}"/>`;
        else s += `<rect x="${x0.toFixed(1)}" y="${(y - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#efe4cf"/><polygon points="${(x0 - w * 0.08).toFixed(1)},${(y - h).toFixed(1)} ${(x0 + w / 2).toFixed(1)},${(y - h * 1.6).toFixed(1)} ${(x0 + w * 1.08).toFixed(1)},${(y - h).toFixed(1)}" fill="#b5523b"/><rect x="${(x0 + w * 0.4).toFixed(1)}" y="${(y - h * 0.55).toFixed(1)}" width="${(w * 0.2).toFixed(1)}" height="${(h * 0.55).toFixed(1)}" fill="#7a4b2a"/>`;
      }
    } else {
      for (let i = 13; i >= 0; i--) {
        const z = 1.4 + i * 1.1, side = i % 2 ? 1 : -1;
        const [x, y] = P(side * (1.5 + (i % 3) * 0.3), z), r = 110 / z;
        s += `<rect x="${(x - r * 0.12).toFixed(1)}" y="${(y - r * 1.6).toFixed(1)}" width="${(r * 0.24).toFixed(1)}" height="${(r * 1.6).toFixed(1)}" fill="#6b4a2b"/><circle cx="${x.toFixed(1)}" cy="${(y - r * 1.8).toFixed(1)}" r="${r.toFixed(1)}" fill="${night ? '#1f3a24' : '#3f7d3a'}"/>`;
      }
    }
    return s;
  }

  function rails(P) {
    let s = '';
    for (const z of [3.1, 3.5]) { const [x1, y] = P(-1.7, z), [x2] = P(1.7, z); s += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#2d2d2d" stroke-width="${(10 / z).toFixed(1)}"/>`; }
    return s;
  }

  function tunnel(P) {
    const [x1, y1] = P(-1.3, 4), [x2] = P(1.3, 4), h = 140 / 4 * 2.4;
    return `<path d="M0 0H${W}V${y1}H${x2}V${(y1 - h).toFixed(1)}Q${W / 2} ${(y1 - h * 1.35).toFixed(1)} ${x1} ${(y1 - h).toFixed(1)}V${y1}H0Z" fill="#3a3f45"/>`;
  }

  function rain() {
    let s = '<g stroke="#dfe7ef" stroke-width="1.4" opacity=".6">';
    for (let i = 0; i < 70; i++) { const x = (i * 97) % W, y = (i * 53) % H; s += `<line x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + 18}"/>`; }
    return s + '</g><rect width="640" height="360" fill="#7d8a96" opacity=".18"/>';
  }

  /* ---------- sprite: ukuran dasar = tampak pada jarak z=1, titik acuan di tanah, tengah bawah ---------- */
  const CAR = ['#c0392b', '#2e86c1', '#f4f6f7', '#7f8c8d', '#27ae60', '#2c3e50'];
  const g = (tr, body) => `<g transform="${tr}">${body}</g>`;
  const person = (c = '#2f6db5', h = 1, dx = 0, dy = 0) => `<g transform="translate(${dx} ${dy}) scale(${h})"><rect x="-9" y="-70" width="18" height="38" rx="6" fill="${c}"/><rect x="-8" y="-34" width="7" height="34" fill="#34495e"/><rect x="1" y="-34" width="7" height="34" fill="#34495e"/><circle cy="-82" r="11" fill="#e0ac69"/></g>`;
  const carRear = (c, brake) => `<rect x="-85" y="-78" width="170" height="62" rx="12" fill="${c}"/><rect x="-62" y="-104" width="124" height="34" rx="10" fill="${c}"/><rect x="-54" y="-99" width="108" height="25" rx="6" fill="#26323d"/><rect x="-80" y="-60" width="26" height="14" rx="3" fill="${brake ? '#ff2b2b' : '#8e1b1b'}"/><rect x="54" y="-60" width="26" height="14" rx="3" fill="${brake ? '#ff2b2b' : '#8e1b1b'}"/>${brake ? '<rect x="-85" y="-72" width="170" height="10" fill="#ff4d4d" opacity=".25"/>' : ''}<rect x="-80" y="-18" width="30" height="18" fill="#1d1d1d"/><rect x="50" y="-18" width="30" height="18" fill="#1d1d1d"/>`;
  const carFront = (c, glare) => `<rect x="-85" y="-78" width="170" height="62" rx="12" fill="${c}"/><rect x="-62" y="-104" width="124" height="34" rx="10" fill="${c}"/><rect x="-54" y="-99" width="108" height="25" rx="6" fill="#405563"/><circle cx="-60" cy="-50" r="11" fill="#fffbd1"/><circle cx="60" cy="-50" r="11" fill="#fffbd1"/>${glare ? '<circle cx="-60" cy="-50" r="60" fill="#fffbd1" opacity=".55"/><circle cx="60" cy="-50" r="60" fill="#fffbd1" opacity=".55"/>' : ''}<rect x="-80" y="-18" width="30" height="18" fill="#1d1d1d"/><rect x="50" y="-18" width="30" height="18" fill="#1d1d1d"/>`;
  const carSide = c => `<rect x="-120" y="-70" width="240" height="52" rx="14" fill="${c}"/><path d="M-70 -70 L-45 -108 H40 L70 -70Z" fill="${c}"/><path d="M-60 -72 L-40 -100 H-5 V-72Z M5 -72 V-100 H35 L58 -72Z" fill="#26323d"/><circle cx="-70" cy="-16" r="20" fill="#1d1d1d"/><circle cx="70" cy="-16" r="20" fill="#1d1d1d"/>`;
  const van = (c, side) => side ? `<rect x="-140" y="-110" width="280" height="92" rx="12" fill="${c}"/><rect x="-125" y="-100" width="250" height="30" fill="#26323d"/><circle cx="-90" cy="-16" r="20" fill="#1d1d1d"/><circle cx="90" cy="-16" r="20" fill="#1d1d1d"/>` : `<rect x="-90" y="-128" width="180" height="112" rx="10" fill="${c}"/><rect x="-75" y="-118" width="150" height="40" rx="5" fill="#26323d"/><rect x="-85" y="-62" width="20" height="14" fill="#c0392b"/><rect x="65" y="-62" width="20" height="14" fill="#c0392b"/><rect x="-85" y="-18" width="30" height="18" fill="#1d1d1d"/><rect x="55" y="-18" width="30" height="18" fill="#1d1d1d"/>`;
  const busRear = c => `<rect x="-115" y="-230" width="230" height="212" rx="12" fill="${c}"/><rect x="-100" y="-215" width="200" height="70" rx="6" fill="#26323d"/><rect x="-108" y="-70" width="24" height="18" fill="#c0392b"/><rect x="84" y="-70" width="24" height="18" fill="#c0392b"/><rect x="-105" y="-20" width="40" height="20" fill="#1d1d1d"/><rect x="65" y="-20" width="40" height="20" fill="#1d1d1d"/>`;
  const busSide = c => `<rect x="-60" y="-230" width="420" height="210" rx="10" fill="${c}"/><rect x="-50" y="-215" width="400" height="70" fill="#26323d"/><circle cx="0" cy="-20" r="28" fill="#1d1d1d"/><circle cx="290" cy="-20" r="28" fill="#1d1d1d"/>`;
  const truckRear = (load) => `<rect x="-115" y="-190" width="230" height="160" fill="#c96d2b"/><rect x="-115" y="-190" width="230" height="10" fill="#8d4a1a"/>${load ? '<rect x="-130" y="-250" width="260" height="66" fill="#8b6b3e"/><rect x="-140" y="-236" width="60" height="18" fill="#6e5330" transform="rotate(-8 -110 -227)"/><line x1="-130" y1="-215" x2="130" y2="-240" stroke="#222" stroke-width="3"/>' : ''}<rect x="-108" y="-50" width="24" height="16" fill="#c0392b"/><rect x="84" y="-50" width="24" height="16" fill="#c0392b"/><rect x="-105" y="-30" width="50" height="30" fill="#1d1d1d"/><rect x="55" y="-30" width="50" height="30" fill="#1d1d1d"/>`;
  const truckFront = () => `<rect x="-110" y="-200" width="220" height="182" rx="10" fill="#2e6f9e"/><rect x="-95" y="-185" width="190" height="65" fill="#26323d"/><circle cx="-80" cy="-60" r="13" fill="#fffbd1"/><circle cx="80" cy="-60" r="13" fill="#fffbd1"/><rect x="-105" y="-20" width="40" height="20" fill="#1d1d1d"/><rect x="65" y="-20" width="40" height="20" fill="#1d1d1d"/>`;
  const moto = (c = '#2c3e50', rider = '#c0392b') => `<rect x="-6" y="-40" width="12" height="40" fill="#1d1d1d"/><rect x="-22" y="-62" width="44" height="26" rx="6" fill="${c}"/><rect x="-16" y="-100" width="32" height="40" rx="8" fill="${rider}"/><circle cy="-112" r="15" fill="#f1c40f"/><rect x="-14" y="-54" width="8" height="8" fill="#ff3b3b"/>`;
  const bike = () => `<circle cx="-20" cy="-18" r="18" fill="none" stroke="#222" stroke-width="4"/><circle cx="22" cy="-18" r="18" fill="none" stroke="#222" stroke-width="4"/><path d="M-20 -18 L0 -48 L22 -18 M0 -48 L-6 -64" stroke="#16a085" stroke-width="5" fill="none"/>${person('#16a085', 0.85, 0, -40)}`;
  const sign = (kind, v) => {
    const pole = '<rect x="-3" y="-150" width="6" height="150" fill="#7f8c8d"/>';
    if (kind === 'stop') return pole + '<polygon points="-15,-200 15,-200 36,-179 36,-149 15,-128 -15,-128 -36,-149 -36,-179" fill="#c0392b" stroke="#fff" stroke-width="4"/><text y="-157" text-anchor="middle" font-size="20" font-weight="800" fill="#fff" font-family="Arial">STOP</text>';
    if (kind === 'num') return pole + `<circle cy="-176" r="34" fill="#fff" stroke="#c0392b" stroke-width="8"/><text y="-166" text-anchor="middle" font-size="28" font-weight="800" fill="#111" font-family="Arial">${esc(v)}</text>`;
    if (kind === 'ka') return pole + '<g transform="translate(0 -180)"><rect x="-40" y="-8" width="80" height="16" fill="#fff" stroke="#c0392b" stroke-width="3" transform="rotate(35)"/><rect x="-40" y="-8" width="80" height="16" fill="#fff" stroke="#c0392b" stroke-width="3" transform="rotate(-35)"/></g>';
    if (kind === 'biru') return pole + `<circle cy="-176" r="34" fill="#1f5fbf"/><path d="M10 -160 V-182 H-8 M-2 -190 L-10 -182 L-2 -174" stroke="#fff" stroke-width="5" fill="none"/>`;
    const sym = { tikungan: '<path d="M-8 18 V0 Q-8 -14 8 -14" stroke="#111" stroke-width="7" fill="none"/>', simpang: '<path d="M0 20 V-20 M0 0 H-18" stroke="#111" stroke-width="7"/>', sekolah: '<circle cx="-8" cy="-14" r="6"/><circle cx="10" cy="-10" r="5"/><path d="M-14 18 L-8 -6 L-2 18 M4 18 L10 -2 L16 18" stroke="#111" stroke-width="5"/>', pejalan: '<circle cy="-16" r="6"/><path d="M0 -8 L-6 18 M0 -8 L8 18 M0 -2 L-10 6" stroke="#111" stroke-width="5"/>', sepeda: '<circle cx="-10" cy="10" r="8" fill="none" stroke="#111" stroke-width="4"/><circle cx="12" cy="10" r="8" fill="none" stroke="#111" stroke-width="4"/>' }[v] || '<text y="12" text-anchor="middle" font-size="34" font-weight="800" font-family="Arial">!</text>';
    return pole + `<g transform="translate(0 -180)"><rect x="-32" y="-32" width="64" height="64" fill="#f2c200" stroke="#111" stroke-width="4" transform="rotate(45)"/><g fill="#111">${sym}</g></g>`;
  };
  const apill = st => `<rect x="-4" y="-230" width="8" height="230" fill="#555"/><rect x="-20" y="-300" width="40" height="96" rx="8" fill="#222"/>${['merah', 'kuning', 'hijau'].map((c, i) => `<circle cy="${-282 + i * 30}" r="11" fill="${c === st ? { merah: '#ff3030', kuning: '#ffc300', hijau: '#2ee06a' }[c] : '#444'}"/>`).join('')}`;
  const cone = '<polygon points="-14,0 14,0 4,-42 -4,-42" fill="#ff7a00"/><rect x="-10" y="-22" width="20" height="6" fill="#fff"/>';

  function sprite(it, at, P, strip) {
    const tr = at(it.u, it.z), t = it.t, v = it.v || '';
    const ci = (t.length * 7 + it.z * 3) | 0, col = CAR[ci % CAR.length];
    const opp = it.pos === 'kanan';
    switch (t) {
      case 'pejalan': case 'pejalan_hp': case 'pekerja': case 'polisi': case 'tuna_netra': {
        const c = t === 'pekerja' ? '#ff8c00' : t === 'polisi' ? '#6e4b2a' : '#2f6db5';
        let extra = t === 'tuna_netra' ? '<line x1="10" y1="-40" x2="30" y2="0" stroke="#fff" stroke-width="4"/>' : t === 'pejalan_hp' ? '<rect x="6" y="-80" width="8" height="12" fill="#111"/>' : t === 'polisi' ? '<rect x="-30" y="-66" width="20" height="8" fill="#fff"/><rect x="10" y="-66" width="20" height="8" fill="#fff"/>' : '';
        return g(tr, person(c) + extra);
      }
      case 'anak': return g(tr, person('#e74c3c', 0.62));
      case 'bola': return g(tr, '<circle cy="-14" r="14" fill="#f39c12" stroke="#fff" stroke-width="3"/>');
      case 'hewan': return g(tr, '<ellipse cy="-46" rx="46" ry="22" fill="#8b5a2b"/><circle cx="48" cy="-58" r="14" fill="#8b5a2b"/><rect x="-36" y="-30" width="8" height="30" fill="#5c3b1b"/><rect x="28" y="-30" width="8" height="30" fill="#5c3b1b"/>');
      case 'mobil_depan': case 'mobil_lambat': case 'mobil_mogok': case 'rem_basah': case 'celah_sempit': case 'antre_rel':
        return g(tr, carRear(col, v === 'rem' || t === 'antre_rel')) + (t === 'mobil_mogok' ? g(at(it.u + 0.2, it.z * 0.75), '<polygon points="-18,0 18,0 0,-30" fill="none" stroke="#e74c3c" stroke-width="6"/>') : '');
      case 'mobil_lawan': case 'mobil_silang': return g(tr, carFront(col, v === 'silau'));
      case 'mobil_keluar': case 'mobil_kiri_masuk': case 'mobil_mundur': case 'keluar_rumah':
        return t === 'keluar_rumah' ? g(tr, moto('#7f8c8d', '#8e44ad')) : g(tr, carSide(col) + (t === 'mobil_mundur' ? '<rect x="110" y="-60" width="12" height="12" fill="#fff"/>' : ''));
      case 'pintu': return g(tr, carRear('#7f8c8d') + '<polygon points="80,-80 128,-96 128,-30 80,-20" fill="#95a5a6" stroke="#555" stroke-width="2"/>' + person('#555', 0.5, 104, 0));
      case 'mobil_parkir_ganda': return g(tr, carRear('#95a5a6')) + g(at(it.u, it.z * 1.4), carRear('#c0392b'));
      case 'mobil_kanan_belok': return g(tr, carRear(col) + '<rect x="-84" y="-62" width="20" height="14" fill="#ffb300"/>');
      case 'angkot': case 'ojek_mobil': return g(tr, van('#1abc9c'));
      case 'bus': case 'bus_halte': case 'bus_keluar_halte': return g(tr, busRear('#2471a3') + (t === 'bus_keluar_halte' ? '<rect x="92" y="-72" width="24" height="18" fill="#ffb300"/>' : ''));
      case 'bus_samping': return g(tr, busSide('#2471a3'));
      case 'truk': case 'truk_parkir': return g(tr, truckRear(false));
      case 'truk_muatan': return g(tr, truckRear(true));
      case 'truk_lawan': return g(tr, truckFront());
      case 'motor': case 'ojek': case 'motor_lawan_arus': return g(tr, moto(col, t === 'ojek' ? '#27ae60' : '#c0392b'));
      case 'sepeda': return g(tr, bike());
      case 'ambulans': case 'pemadam': case 'iring_jenazah': {
        const body = t === 'pemadam' ? '#c0392b' : '#f4f6f7';
        return g(tr, van(body) + `<rect x="-50" y="-140" width="100" height="14" rx="4" fill="${t === 'iring_jenazah' ? '#f1c40f' : '#e74c3c'}"/><rect x="-50" y="-140" width="50" height="14" rx="4" fill="${t === 'pemadam' || t === 'iring_jenazah' ? '#e74c3c' : '#2e86de'}"/>`);
      }
      case 'apill': return g(tr, apill(v || 'merah'));
      case 'rambu': return g(tr, /^\d+$/.test(v) ? sign('num', v) : v === 'stop' ? sign('stop') : v === 'ka' ? sign('ka') : v === 'belok_kiri_ikuti_isyarat' ? sign('biru') : sign('warn', v));
      case 'sekolah': return g(tr, sign('warn', 'sekolah'));
      case 'palang': return g(tr, '<rect x="-6" y="-120" width="12" height="120" fill="#555"/><g transform="rotate(-12)"><rect x="0" y="-104" width="320" height="14" fill="#fff"/>' + [0, 1, 2, 3, 4].map(i => `<rect x="${20 + i * 64}" y="-104" width="30" height="14" fill="#c0392b"/>`).join('') + '</g><circle cx="-26" cy="-130" r="10" fill="#ff3030"/><circle cx="26" cy="-130" r="10" fill="#ff3030"/>') + strip(-1, 1, it.z * 0.97, it.z, '#fff', ' opacity=".9"');
      case 'zebra': { let s = ''; for (let k = -0.9; k < 0.95; k += 0.22) s += strip(k, k + 0.12, it.z, it.z * 1.18, '#fafafa'); return s; }
      case 'rhk': return strip(-1, 0, it.z, it.z * 1.25, '#c0392b', ' opacity=".75"') + strip(-1, 0, it.z * 0.97, it.z, '#fff');
      case 'kotak_kuning': { let s = strip(-1, 1, it.z, it.z * 1.4, 'none', ' stroke="#f1c40f" stroke-width="3"'); for (let k = -0.9; k < 1; k += 0.3) s += strip(k, k + 0.04, it.z, it.z * 1.4, '#f1c40f'); return s; }
      case 'jalur_sepeda': return strip(-0.98, -0.62, 1, 30, '#27ae60', ' opacity=".7"');
      case 'genangan': case 'marka_licin': return g(tr, `<ellipse cy="-6" rx="${t === 'genangan' ? 120 : 200}" ry="26" fill="#9ec9e8" opacity=".75"/>`);
      case 'lubang': return g(tr, '<ellipse cy="-6" rx="60" ry="18" fill="#2b2b2b"/><ellipse cy="-8" rx="46" ry="11" fill="#5c7d94" opacity=".6"/>');
      case 'pasir': return g(tr, '<ellipse cy="-6" rx="110" ry="22" fill="#c9a86a" opacity=".85"/>');
      case 'polisi_tidur': return strip(-1, 1, it.z, it.z * 1.06, '#f1c40f') + strip(-0.9, 0.9, it.z * 1.015, it.z * 1.045, '#222');
      case 'kerucut': return [0, 0.25, 0.5].map(d => g(at(it.u + 0.15 + d * 0.3, it.z * (1 + d)), cone)).join('');
      case 'segitiga': return g(tr, '<polygon points="-20,0 20,0 0,-34" fill="none" stroke="#e74c3c" stroke-width="6"/>');
      case 'pasar': return [0, 1, 2].map(i => g(at(it.u, it.z * (1 + i * 0.5)), `<rect x="-70" y="-90" width="140" height="10" fill="${['#e74c3c', '#3498db', '#f1c40f'][i]}"/><rect x="-65" y="-80" width="6" height="80" fill="#555"/><rect x="59" y="-80" width="6" height="80" fill="#555"/><rect x="-60" y="-40" width="120" height="20" fill="#8e6e4b"/>`) + g(at(it.u + 0.35, it.z * (1 + i * 0.5)), person(['#9b59b6', '#e67e22', '#16a085'][i]))).join('');
      case 'tikungan_buta': return g(tr, '<rect x="-30" y="-140" width="200" height="140" fill="#d6cfc0"/>');
      case 'kabel': return `<path d="M0 ${HOR - 30} Q320 ${HOR + 10} 640 ${HOR - 30}" stroke="#222" stroke-width="2.5" fill="none"/>`;
      case 'tiang': return g(tr, '<rect x="-5" y="-240" width="10" height="240" fill="#7f8c8d"/>');
      case 'angin': return '<g stroke="#ffffff" stroke-width="3" opacity=".7" fill="none"><path d="M380 170 q30 -10 60 0"/><path d="M400 190 q30 -10 60 0"/><path d="M370 210 q30 -10 60 0"/></g>';
      case 'marka_utuh': return '';
      case 'ponsel': return '<g transform="translate(470 250) rotate(-10)"><rect width="40" height="70" rx="6" fill="#111"/><rect x="4" y="8" width="32" height="50" fill="#5dade2"/><text x="20" y="-6" text-anchor="middle" font-size="18" fill="#e74c3c" font-family="Arial">♪</text></g>';
      case 'pindah_lajur': return '<g transform="translate(560 120)"><rect x="-6" y="-4" width="52" height="20" rx="4" fill="#111"/><polygon points="40,-2 58,6 40,14" fill="#ffb300"/></g>';
      default: return '';
    }
  }

  function cockpit(k, v, items) {
    const speedo = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#0d1b12" stroke="#2ee06a" stroke-width="3"/><text x="${x}" y="${y + r * 0.22}" text-anchor="middle" font-size="${(r * 0.62).toFixed(0)}" font-weight="800" fill="#2ee06a" font-family="Arial">${esc(v)}</text><text x="${x}" y="${y + r * 0.62}" text-anchor="middle" font-size="${(r * 0.24).toFixed(0)}" fill="#9fdcb4" font-family="Arial">km/jam</text>`;
    const mirrorHas = items.some(i => i.t === 'ambulans' && i.z > 5) || items.some(i => i.t === 'pemadam');
    if (k === 'motor') {
      return `<path d="M0 360 L120 300 Q190 282 240 300 L280 330 H360 L400 300 Q450 282 520 300 L640 360Z" fill="#1d1f22"/>` +
        `<path d="M200 330 Q320 286 440 330 L470 360 H170Z" fill="#c0392b"/>` +
        `<rect x="40" y="300" width="70" height="26" rx="12" fill="#2b2b2b" transform="rotate(-22 75 313)"/><rect x="530" y="300" width="70" height="26" rx="12" fill="#2b2b2b" transform="rotate(22 565 313)"/>` +
        `<line x1="140" y1="296" x2="80" y2="262" stroke="#333" stroke-width="5"/><ellipse cx="66" cy="252" rx="30" ry="19" fill="#bcd3e0" stroke="#333" stroke-width="4"/>` +
        `<line x1="500" y1="296" x2="560" y2="262" stroke="#333" stroke-width="5"/><ellipse cx="574" cy="252" rx="30" ry="19" fill="#bcd3e0" stroke="#333" stroke-width="4"/>` +
        (mirrorHas ? '<rect x="562" y="246" width="24" height="11" fill="#fff"/><rect x="562" y="243" width="24" height="4" fill="#e74c3c"/>' : '') +
        speedo(320, 318, 30);
    }
    const big = k === 'bus' || k === 'truk';
    const dashY = big ? 268 : 292;
    return `<rect x="0" y="0" width="20" height="360" fill="#151515"/><rect x="620" y="0" width="20" height="360" fill="#151515"/><rect x="0" y="0" width="640" height="16" fill="#151515"/>` +
      `<rect x="250" y="16" width="140" height="34" rx="8" fill="#222"/><rect x="258" y="22" width="124" height="22" rx="5" fill="#9fb3c2"/>` +
      (mirrorHas ? '<rect x="300" y="26" width="34" height="14" fill="#fff"/><rect x="300" y="23" width="34" height="5" fill="#e74c3c"/>' : '') +
      `<path d="M0 ${dashY} Q320 ${dashY - 20} 640 ${dashY} V360 H0Z" fill="#2a2c30"/>` +
      `<circle cx="${big ? 300 : 210}" cy="${big ? 360 : 372}" r="${big ? 110 : 90}" fill="none" stroke="#111" stroke-width="18"/>` +
      speedo(big ? 470 : 360, dashY + 34, 26);
  }

  /* =====================================================================
     2. ALUR UJIAN
     ===================================================================== */
  const TAHAP = [
    { k: 'PB', n: 'Persepsi Bahaya', ikon: '⚠️', soal: 25, menit: 10 },
    { k: 'WA', n: 'Wawasan', ikon: '💡', soal: 20, menit: 20 },
    { k: 'PE', n: 'Pengetahuan', ikon: '🎓', soal: 20, menit: 20 }
  ];
  const LULUS = 70, KEY = 'sim-eavis-riwayat';
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = { get(d) { try { return JSON.parse(localStorage.getItem(KEY)) || d; } catch (e) { return d; } }, set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} } };

  let BANK = null, dlg = null, body = null, timer = null, state = null, from = null, onEvent = () => {};

  function el(html) { body.innerHTML = html; const f = body.querySelector('[data-focus]') || body.querySelector('h2'); if (f) { f.tabIndex = -1; f.focus({ preventScroll: true }); } body.scrollTop = 0; }
  function fmt(s) { s = Math.max(0, s | 0); return `${String(s / 60 | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

  function open(data, opts = {}) {
    BANK = data; onEvent = opts.onEvent || onEvent;
    if (!dlg) {
      dlg = document.createElement('div');
      dlg.className = 'simx'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', 'Simulasi ujian teori SIM');
      dlg.innerHTML = '<div class="simx-box"><header><b>Simulasi Ujian Teori <small>· latihan</small></b><span class="simx-t" id="simxT" aria-live="off"></span><button type="button" class="simx-x" aria-label="Tutup simulasi">✕</button></header><div class="simx-body" id="simxBody"></div><div class="sr" id="simxSr" aria-live="assertive"></div></div>';
      document.body.appendChild(dlg);
      body = dlg.querySelector('#simxBody');
      dlg.querySelector('.simx-x').onclick = () => { if (!state || state.done || confirm('Keluar dari simulasi? Jawaban yang sudah diisi tidak disimpan.')) close(); };
      dlg.addEventListener('keydown', e => {
        e.stopPropagation(); // jangan sampai membalik halaman buku di belakang
        if (e.key === 'Escape') dlg.querySelector('.simx-x').click();
        const o = body.querySelectorAll('.simx-opt');
        const n = '1234'.indexOf(e.key) + 1 || 'abcd'.indexOf(e.key.toLowerCase()) + 1;
        if (n && o[n - 1] && !e.target.matches('input,textarea')) o[n - 1].click();
      });
    }
    from = document.activeElement;
    dlg.classList.add('on'); document.documentElement.classList.add('simx-lock');
    intro();
  }
  function close() { stop(); state = null; dlg.classList.remove('on'); document.documentElement.classList.remove('simx-lock'); if (from && from.focus) from.focus(); }
  function stop() { clearInterval(timer); timer = null; const t = dlg && dlg.querySelector('#simxT'); if (t) t.textContent = ''; }
  const say = m => { const s = dlg.querySelector('#simxSr'); s.textContent = ''; setTimeout(() => { s.textContent = m; }, 30); };

  function intro() {
    stop();
    const pool = k => BANK.soal.filter(q => q.t === k).length;
    const riw = store.get([]);
    el(`<h2 data-focus>Simulasi Ujian Teori SIM</h2>
      ${/DRAF/.test(BANK.catatan || '') ? '<p class="simx-warn"><b>DRAF UJI TAMPILAN.</b> Soal belum diperiksa petugas penguji dan tidak untuk dipublikasikan.</p>' : ''}
      <p class="simx-warn"><b>Latihan, bukan ujian resmi.</b> Soal disusun baru oleh Satpas Polresta Banyuwangi untuk berlatih; bentuknya mengikuti tiga tahap E-AVIS. Ujian resmi tetap dilaksanakan di Satpas.</p>
      <div class="simx-stg">${TAHAP.map((t, i) => `<div><span aria-hidden="true">${t.ikon}</span><b>${i + 1}. ${t.n}</b><small>${t.soal} soal · ${t.menit} menit · bank ${pool(t.k)} soal</small></div>`).join('')}</div>
      <p class="small">Nilai lulus paling rendah <b>${LULUS}</b> (Perpol 5/2021 Pasal 15 ayat 1). Jawaban tidak bisa diubah setelah pindah soal. Pilih dengan ketuk, atau tombol 1–4 pada keyboard.</p>
      <div class="simx-act"><button type="button" class="btn" data-mulai="all">▶ Mulai simulasi lengkap (50 menit)</button></div>
      <p class="small" style="margin:14px 0 6px"><b>Latihan per tahap:</b></p>
      <div class="simx-act">${TAHAP.map((t, i) => `<button type="button" class="btn ghost sm" data-mulai="${i}">${t.ikon} ${t.n}</button>`).join('')}</div>
      ${riw.length ? `<h3>Riwayat skor di perangkat ini</h3><ul class="simx-hist">${riw.slice(-5).reverse().map(r => `<li><span>${new Date(r.w).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span><span>${r.m}</span><b class="${r.s >= LULUS ? 'ok' : 'no'}">${r.s}</b></li>`).join('')}</ul>` : ''}`);
    body.querySelectorAll('[data-mulai]').forEach(b => b.onclick = () => start(b.dataset.mulai));
  }

  function start(which) {
    const list = which === 'all' ? TAHAP : [TAHAP[+which]];
    state = { list, ti: 0, qs: [], ans: [], done: false, mode: which === 'all' ? 'Lengkap' : TAHAP[+which].n };
    onEvent('mulai/' + (which === 'all' ? 'lengkap' : TAHAP[+which].k));
    stage();
  }

  function stage() {
    const t = state.list[state.ti];
    const qs = shuffle(BANK.soal.filter(q => q.t === t.k)).slice(0, t.soal).map(q => ({ ...q, opts: shuffle([q.a, ...q.o]) }));
    state.cur = { t, qs, ans: new Array(qs.length).fill(null), i: 0, end: Date.now() + t.menit * 60000 };
    el(`<h2 data-focus>Tahap ${TAHAP.indexOf(t) + 1}: ${t.n}</h2><p>${t.soal === qs.length ? t.soal : qs.length} soal, waktu <b>${t.menit} menit</b>. ${t.k === 'PB' ? 'Amati gambar dari sudut pandang pengemudi: kecepatan tertera pada spidometer.' : ''}</p><div class="simx-act"><button type="button" class="btn" data-go>Mulai tahap ini</button></div>`);
    body.querySelector('[data-go]').onclick = () => { state.cur.end = Date.now() + t.menit * 60000; tick(); timer = setInterval(tick, 1000); question(); };
  }

  function tick() {
    const left = (state.cur.end - Date.now()) / 1000, T = dlg.querySelector('#simxT');
    T.textContent = '⏱ ' + fmt(left); T.classList.toggle('low', left <= 60);
    if ((left | 0) === 60) say('Sisa waktu satu menit.');
    if (left <= 0) { say('Waktu tahap ini habis.'); finishStage(); }
  }

  function question() {
    const c = state.cur, q = c.qs[c.i];
    el(`<div class="simx-prog" aria-hidden="true"><i style="width:${(c.i / c.qs.length * 100).toFixed(1)}%"></i></div>
      <p class="simx-no">${c.t.n} · Soal <b>${c.i + 1}</b> dari ${c.qs.length}</p>
      ${q.s ? `<figure class="simx-fig">${scene(q.s)}<figcaption class="sr">Ilustrasi: ${esc(sceneAlt(q.s))}</figcaption></figure>` : ''}
      <h2 class="simx-q" data-focus>${esc(q.q)}</h2>
      <div class="simx-opts" role="group" aria-label="Pilihan jawaban">${q.opts.map((o, j) => `<button type="button" class="simx-opt" aria-pressed="false" data-j="${j}"><span class="k">${'ABCD'[j]}</span>${esc(o)}</button>`).join('')}</div>
      <div class="simx-act"><button type="button" class="btn" data-next disabled>${c.i + 1 < c.qs.length ? 'Soal berikutnya →' : 'Selesaikan tahap'}</button></div>`);
    const next = body.querySelector('[data-next]');
    body.querySelectorAll('.simx-opt').forEach(b => b.onclick = () => {
      body.querySelectorAll('.simx-opt').forEach(x => x.setAttribute('aria-pressed', x === b));
      c.ans[c.i] = +b.dataset.j; next.disabled = false;
    });
    next.onclick = () => { if (c.i + 1 < c.qs.length) { c.i++; question(); } else finishStage(); };
  }

  function sceneAlt(a) {
    const k = { motor: 'mengendarai sepeda motor', mobil: 'mengemudikan mobil', bus: 'mengemudikan bus', truk: 'mengemudikan truk' }[a.k] || 'mengemudi';
    return `Anda ${k} dengan kecepatan ${a.v} km/jam di jalan ${a.j}, cuaca ${a.c}.`;
  }

  function finishStage() {
    stop();
    const c = state.cur;
    c.benar = c.qs.filter((q, i) => c.ans[i] !== null && q.opts[c.ans[i]] === q.a).length;
    state.qs.push(c);
    if (++state.ti < state.list.length) {
      const nx = state.list[state.ti];
      el(`<h2 data-focus>Tahap ${c.t.n} selesai</h2><p>Istirahat sejenak bila perlu. Tahap berikutnya: <b>${nx.ikon} ${nx.n}</b> (${nx.soal} soal, ${nx.menit} menit).</p><div class="simx-act"><button type="button" class="btn" data-go>Lanjut ke tahap ${nx.n}</button></div>`);
      body.querySelector('[data-go]').onclick = stage;
    } else result();
  }

  function result() {
    state.done = true;
    const tot = state.qs.reduce((n, c) => n + c.qs.length, 0), ben = state.qs.reduce((n, c) => n + c.benar, 0);
    const skor = tot ? Math.round(ben / tot * 100) : 0, lulus = skor >= LULUS;
    const riw = store.get([]); riw.push({ w: Date.now(), m: state.mode, s: skor }); store.set(riw.slice(-20));
    onEvent('selesai/' + (lulus ? 'lulus' : 'belum'));
    const salah = [];
    state.qs.forEach(c => c.qs.forEach((q, i) => { const a = c.ans[i]; if (a === null || q.opts[a] !== q.a) salah.push({ q, a: a === null ? null : q.opts[a] }); }));
    el(`<div class="simx-res ${lulus ? 'ok' : 'no'}"><small>Nilai Anda</small><b data-focus tabindex="-1">${skor}</b><span>${lulus ? '✅ LULUS (nilai ≥ 70)' : '❌ BELUM LULUS (nilai < 70)'}</span></div>
      <table class="simx-tbl"><thead><tr><th>Tahap</th><th>Benar</th><th>Nilai</th></tr></thead><tbody>${state.qs.map(c => `<tr><td>${c.t.ikon} ${c.t.n}</td><td>${c.benar} / ${c.qs.length}</td><td>${Math.round(c.benar / c.qs.length * 100)}</td></tr>`).join('')}</tbody></table>
      <p class="small muted">Ini latihan. Hasil tidak memengaruhi ujian resmi di Satpas.</p>
      <div class="simx-act"><button type="button" class="btn" data-ulang>🔄 Coba lagi</button><button type="button" class="btn ghost" data-menu>Kembali ke menu</button></div>
      ${salah.length ? `<h3>Pembahasan soal yang belum tepat (${salah.length})</h3><ol class="simx-rev">${salah.map(x => `<li><p><b>${esc(x.q.q)}</b></p><p class="small">Jawaban Anda: ${x.a === null ? '<i>tidak dijawab</i>' : '✗ ' + esc(x.a)}<br>Jawaban tepat: <b>✓ ${esc(x.q.a)}</b></p><p class="small muted">💡 ${esc(x.q.e)}${x.q.d ? ` <span class="simx-d">${esc(x.q.d)}</span>` : ''}</p></li>`).join('')}</ol>` : '<p><b>Sempurna! Semua jawaban benar.</b></p>'}`);
    body.querySelector('[data-ulang]').onclick = () => start(state.mode === 'Lengkap' ? 'all' : String(TAHAP.findIndex(t => t.n === state.mode)));
    body.querySelector('[data-menu]').onclick = intro;
  }

  window.SimEAVIS = { open, scene };
})();
