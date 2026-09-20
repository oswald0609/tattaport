/* ─── カスタムカーソル ─── */
const cur = document.getElementById('cur');
let mx=0,my=0;
document.addEventListener('mousemove', e => {
  mx=e.clientX; my=e.clientY;
  cur.style.left=mx+'px'; cur.style.top=my+'px';
});
document.querySelectorAll('a,button,.nav-logo').forEach(el => {
  el.addEventListener('mouseenter', () => cur.classList.add('expanded'));
  el.addEventListener('mouseleave', () => cur.classList.remove('expanded'));
});

/* ─── ハンバーガーメニュー ─── */
const ham = document.getElementById('ham');
const mob = document.getElementById('mobMenu');
ham.addEventListener('click', () => {
  const o = mob.classList.toggle('open');
  ham.classList.toggle('open', o);
});
document.querySelectorAll('.mob-menu a').forEach(a => {
  a.addEventListener('click', () => {
    mob.classList.remove('open');
    ham.classList.remove('open');
  });
});

/* ─── スクロールリビール ─── */
const rvObs = new IntersectionObserver((entries, obs) => {
  entries.forEach((e, i) => {
    if(e.isIntersecting){
      setTimeout(() => e.target.classList.add('vis'), i * 80);
      obs.unobserve(e.target);
    }
  });
}, {threshold:.15});
document.querySelectorAll('.rv').forEach(el => rvObs.observe(el));

/* ─── URLパラメータ + データ取得 ─── */
const params = new URLSearchParams(window.location.search);
const id = params.get('id');

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ─── IndexedDB ヘルパー（CMS / main.js と同じ DB を参照） ─── */
const _DET_IDB_NAME  = 'portfolioCMS';
const _DET_IDB_VER   = 1;
const _DET_IDB_STORE = 'store';
let _detDb = null;
function _detOpenDB(){
  if(_detDb) return Promise.resolve(_detDb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_DET_IDB_NAME, _DET_IDB_VER);
    req.onupgradeneeded = e => e.target.result.createObjectStore(_DET_IDB_STORE);
    req.onsuccess = e => { _detDb = e.target.result; resolve(_detDb); };
    req.onerror   = e => reject(e.target.error);
  });
}
async function _detIdbGet(key){
  try {
    const db = await _detOpenDB();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(_DET_IDB_STORE, 'readonly').objectStore(_DET_IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = e => reject(e.target.error);
    });
  } catch(e){ return null; }
}

async function loadAndRender(){
  const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';
  let WORKS_DATA = [];
  let SITE_LOGO = { src: '' };

  if(isPreview){
    try {
      /* IndexedDB から読む（CMS が保存した最新データ） */
      const w = await _detIdbGet('worksData'); if(w) WORKS_DATA = w;
      const l = await _detIdbGet('logoData');  if(l) SITE_LOGO  = l;
    } catch(e){}
    /* IDB にデータが無ければ localStorage にフォールバック */
    if(!WORKS_DATA.length){
      try {
        const raw  = localStorage.getItem('worksData'); if(raw)  WORKS_DATA = JSON.parse(raw);
        const lRaw = localStorage.getItem('logoData');  if(lRaw) SITE_LOGO  = JSON.parse(lRaw);
      } catch(e){}
    }
  } else {
    try {
      const res = await fetch('data.json', { cache: 'no-cache' });
      if(res.ok){
        const json = await res.json();
        if(json.works) WORKS_DATA = json.works;
        if(json.logo) SITE_LOGO = json.logo;
      }
    } catch(e){}
    if(WORKS_DATA.length === 0){
      try {
        const w = await _detIdbGet('worksData'); if(w) WORKS_DATA = w;
        const l = await _detIdbGet('logoData');  if(l) SITE_LOGO  = l;
      } catch(e){}
    }
    if(WORKS_DATA.length === 0){
      try {
        const stored = localStorage.getItem('worksData');
        if(stored) WORKS_DATA = JSON.parse(stored);
        const lRaw = localStorage.getItem('logoData');
        if(lRaw) SITE_LOGO = JSON.parse(lRaw);
      } catch(e){}
    }
  }

  /* ロゴ適用 */
  if(SITE_LOGO && SITE_LOGO.src){
    const src = SITE_LOGO.src;
    document.querySelectorAll('.nav-logo, .footer-logo').forEach(el => {
      el.style.backgroundImage = `url("${src}")`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundColor = 'transparent';
      el.classList.add('has-logo');
    });
    let link = document.querySelector('link[rel="icon"]');
    if(!link){
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = src;
  }

  const flatList = [];
  WORKS_DATA.forEach(g => g.items.forEach(it => flatList.push(it)));
  const item = flatList.find(it => it.id === id);
  if(!item) return;

  /* タイトル/本文 */
  document.getElementById('heroTitle').textContent = item.title || '';
  document.getElementById('heroLead').textContent = item.lead || item.desc || '';
  document.title = `${item.title} — SHOTA INOUE`;

  /* DATA */
  const dataListEl = document.querySelector('.data-list');
  if(dataListEl){
    let rows = [];
    if(item.dataList && Array.isArray(item.dataList)){
      rows = item.dataList
        .filter(r => r.label && r.value)
        .map(r => [r.label, r.value]);
    } else {
      const meta = item.meta || {};
      rows = [
        ['Client', meta.client],
        ['Year', meta.year],
        ['Art Direction', meta.artDirection],
        ['Design', meta.design],
        ['Direction', meta.direction],
        ['Tools', meta.tools],
      ].filter(r => r[1]);
    }
    if(rows.length){
      dataListEl.innerHTML = rows.map(([l,v]) =>
        `<div><span class="lbl">${escapeHtml(l)}</span>${escapeHtml(v)}</div>`
      ).join('');
    }
  }

  /* 画像 */
  const imagesRoot = document.querySelector('.images');
  if(imagesRoot && item.images && item.images.length){
    imagesRoot.innerHTML = '';

    /* Scrollは連続性ではなくブロックIDでまとめる（隣同士でも別ブロックにできる） */
    const blocks = [];
    let i = 0;
    while(i < item.images.length){
      const img = item.images[i];
      if(img.scrollGroup){
        const groupId = img.scrollGroupId || null;
        const group = [];
        while(i < item.images.length && item.images[i].scrollGroup && (groupId ? item.images[i].scrollGroupId === groupId : !item.images[i].scrollGroupId)){
          group.push(item.images[i]);
          i++;
        }
        blocks.push({ type: 'scroll', images: group, cols: Math.max(1, Math.min(3, img.scrollCols || 1)) });
      } else {
        blocks.push({ type: 'grid', img, cols: img.cols || 1 });
        i++;
      }
    }

    /* グリッドブロックは cols でまとめる */
    let row = null;
    let currentCols = null;

    const flushRow = () => { row = null; currentCols = null; };

    blocks.forEach(block => {
      if(block.type === 'scroll'){
        const cols = block.cols;
        if(currentCols !== cols || (row && row.children.length >= cols)){
          row = document.createElement('div');
          row.className = `img-row cols-${cols} rv`;
          imagesRoot.appendChild(row);
          currentCols = cols;
        }
        const wrapper = document.createElement('div');
        wrapper.className = 'scroll-row rv';
        const track = document.createElement('div');
        track.className = 'scroll-row-track';

        block.images.forEach(img => {
          const cell = document.createElement('div');
          const mediaType = img.type || '';
          const isVideo = mediaType.startsWith('video/');
          let mediaEl;
          if(isVideo){
            mediaEl = document.createElement('video');
            mediaEl.src = img.src;
            mediaEl.muted = true; mediaEl.loop = true; mediaEl.playsInline = true;
            mediaEl.autoplay = true; mediaEl.controls = true;
            mediaEl.style.cssText = 'width:100%;height:auto;display:block';
          } else {
            mediaEl = document.createElement('img');
            mediaEl.src = img.src; mediaEl.alt = '';
            mediaEl.style.cssText = 'width:100%;height:auto;display:block';
          }
          cell.appendChild(mediaEl);
          track.appendChild(cell);
        });

        wrapper.appendChild(track);

        /* 矢印ボタン（2枚以上のとき） */
        if(block.images.length > 1){
          const prev = document.createElement('button');
          prev.className = 'scroll-row-btn prev'; prev.setAttribute('aria-label','前へ');
          const next = document.createElement('button');
          next.className = 'scroll-row-btn next'; next.setAttribute('aria-label','次へ');
          wrapper.appendChild(prev);
          wrapper.appendChild(next);

          /* ドットインジケーター */
          const dotsWrap = document.createElement('div');
          dotsWrap.className = 'scroll-row-dots';
          block.images.forEach((_, di) => {
            const dot = document.createElement('button');
            dot.className = 'scroll-row-dot' + (di === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `${di+1}枚目`);
            dotsWrap.appendChild(dot);
          });
          wrapper.appendChild(dotsWrap);

          /* スクロール同期 */
          const dots = dotsWrap.querySelectorAll('.scroll-row-dot');
          const totalItems = block.images.length;
          let currentIdx = 0;

          const goTo = (idx) => {
            currentIdx = Math.max(0, Math.min(totalItems - 1, idx));
            const itemW = track.scrollWidth / totalItems;
            track.scrollTo({ left: itemW * currentIdx, behavior: 'smooth' });
            dots.forEach((d, di) => d.classList.toggle('active', di === currentIdx));
          };

          prev.addEventListener('click', () => goTo(currentIdx - 1));
          next.addEventListener('click', () => goTo(currentIdx + 1));
          dots.forEach((dot, di) => dot.addEventListener('click', () => goTo(di)));

          /* スクロール位置 → ドット更新 */
          track.addEventListener('scroll', () => {
            const itemW = track.scrollWidth / totalItems;
            const idx = Math.round(track.scrollLeft / itemW);
            if(idx !== currentIdx){
              currentIdx = idx;
              dots.forEach((d, di) => d.classList.toggle('active', di === currentIdx));
            }
          }, { passive: true });
        }

        row.appendChild(wrapper);

      } else {
        /* 通常グリッド */
        const img = block.img;
        const cols = block.cols;
        if(currentCols !== cols || (row && row.children.length >= cols)){
          row = document.createElement('div');
          row.className = `img-row cols-${cols} rv`;
          imagesRoot.appendChild(row);
          currentCols = cols;
        }
        const cell = document.createElement('div');
        const mediaType = img.type || '';
        const isVideo = mediaType.startsWith('video/');
        let mediaEl;
        if(isVideo){
          mediaEl = document.createElement('video');
          mediaEl.src = img.src; mediaEl.muted = true; mediaEl.loop = true;
          mediaEl.playsInline = true; mediaEl.autoplay = true; mediaEl.controls = true;
          mediaEl.style.cssText = 'width:100%;height:auto;display:block';
        } else {
          mediaEl = document.createElement('img');
          mediaEl.src = img.src; mediaEl.alt = '';
          mediaEl.style.cssText = 'width:100%;height:auto;display:block';
        }
        cell.style.cssText = 'position:relative';
        cell.appendChild(mediaEl);
        row.appendChild(cell);
      }
    });

    /* 2列・3列で不足する行は、各ブロックの幅を保って中央寄せ */
    imagesRoot.querySelectorAll('.img-row.cols-2, .img-row.cols-3').forEach(rowEl => {
      const cols = rowEl.classList.contains('cols-2') ? 2 : 3;
      if(rowEl.children.length < cols) rowEl.classList.add('incomplete');
    });

    /* 新規ロード分のスクロールリビールを再観測 */
    document.querySelectorAll('.images .rv').forEach(el => rvObs.observe(el));
  } else {
    /* 画像が1枚もない場合は .images セクション全体を非表示 */
    if(imagesRoot) imagesRoot.style.display = 'none';
  }
}

loadAndRender();

/* preview モード時: Back リンクに preview=1 を付与して
   index.html に戻っても preview 状態を維持する */
if(params.get('preview') === '1'){
  const backLink = document.getElementById('backLink');
  if(backLink) backLink.href = 'index.html?works=1&preview=1';
}

/* ─── 背景ドットエフェクト ─── */
(() => {
  const canvas = document.getElementById('dotsCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  const SPACING = 14;
  const BASE_RADIUS = 0.9;
  const MAX_RADIUS = 5.0;
  const INFLUENCE = 120;
  const EASE = 0.12;
  const IDLE_DECAY = 0.85;
  const STOP_DELAY = 750;

  const BG_COLOR = '#181919';
  const DOT_COLOR = '#1e2323';
  const ACCENT_COLOR = '#3a3b3b';

  let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  let W = 0, H = 0;
  let stopTimer = null;

  const pointer = { x:-9999, y:-9999, tx:-9999, ty:-9999, strength:0, targetStrength:0 };

  function resize(){
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  window.addEventListener('resize', resize);

  function resetStopTimer(){
    pointer.targetStrength = 1;
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { pointer.targetStrength = 0; }, STOP_DELAY);
  }

  window.addEventListener('mousemove', e => {
    pointer.tx = e.clientX; pointer.ty = e.clientY;
    if(pointer.x < -9000){ pointer.x = pointer.tx; pointer.y = pointer.ty; }
    resetStopTimer();
  });
  window.addEventListener('mouseleave', () => {
    pointer.targetStrength = 0;
    clearTimeout(stopTimer);
  });
  window.addEventListener('touchstart', e => {
    const t = e.touches[0];
    pointer.tx = t.clientX; pointer.ty = t.clientY;
    if(pointer.x < -9000){ pointer.x = pointer.tx; pointer.y = pointer.ty; }
    resetStopTimer();
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    pointer.tx = t.clientX; pointer.ty = t.clientY;
    resetStopTimer();
  }, { passive: true });
  window.addEventListener('touchend', () => {
    pointer.targetStrength = 0;
    clearTimeout(stopTimer);
  });

  let isTouchDev = window.matchMedia('(hover:none)').matches;
  window.addEventListener('resize', () => {
    isTouchDev = window.matchMedia('(hover:none)').matches;
  });

  function frame(){
    if(pointer.tx > -9000){
      if(isTouchDev){
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      } else {
        pointer.x += (pointer.tx - pointer.x) * EASE;
        pointer.y += (pointer.ty - pointer.y) * EASE;
      }
    }
    if(pointer.targetStrength > pointer.strength){
      pointer.strength += (pointer.targetStrength - pointer.strength) * 0.1;
    }else{
      pointer.strength *= IDLE_DECAY;
      if(pointer.strength < 0.001) pointer.strength = 0;
    }

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    const px = pointer.x, py = pointer.y;
    const s = pointer.strength;
    const inflSq = INFLUENCE * INFLUENCE;

    ctx.fillStyle = DOT_COLOR;
    ctx.beginPath();
    let row = 0;
    for(let y = SPACING/2; y < H; y += SPACING){
      const offset = (row % 2) ? SPACING/2 : 0;
      for(let x = SPACING/2 + offset; x < W; x += SPACING){
        const dx = x - px, dy = y - py;
        if(s > 0.01 && (dx*dx + dy*dy) < inflSq) continue;
        ctx.moveTo(x + BASE_RADIUS, y);
        ctx.arc(x, y, BASE_RADIUS, 0, Math.PI * 2);
      }
      row++;
    }
    ctx.fill();

    if(s > 0.01){
      let row2 = 0;
      for(let y = SPACING/2; y < H; y += SPACING){
        const offset = (row2 % 2) ? SPACING/2 : 0;
        for(let x = SPACING/2 + offset; x < W; x += SPACING){
          const dx = x - px, dy = y - py;
          const distSq = dx*dx + dy*dy;
          if(distSq >= inflSq) continue;
          const dist = Math.sqrt(distSq);
          let t = 1 - dist / INFLUENCE;
          t = t * t * (3 - 2 * t) * s;
          const r = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * t;
          ctx.fillStyle = (t > 0.6) ? ACCENT_COLOR : DOT_COLOR;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        row2++;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
