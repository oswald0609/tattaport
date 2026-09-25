/* ============================================================
   detail.js — detail.html（作品詳細ページ）
   共通処理は common.js（Portfolio）にあります。
   ============================================================ */

/* JSが正常に読み込めたことを示すフラグ（HTML側の保険用） */
window.__portfolioJsReady = true;

const params = new URLSearchParams(window.location.search);
const workId = params.get('id');

/* ─── 共通の動き ─── */
Portfolio.initCursor('a,button,.nav-logo');

const closeMenu = Portfolio.initHamburger();

document.querySelectorAll('.mob-menu a').forEach(link => {
  link.addEventListener('click', closeMenu);
});

const revealObserver = Portfolio.initScrollReveal();

/* ============================================================
   データ読込
   ============================================================ */

const DATA_FIELDS = ['works', 'logo', 'siteAccess'];

/**
 * 詳細ページに必要なデータを読み込む。優先順位:
 *   本番:     data.json → IndexedDB → localStorage
 *   プレビュー: IndexedDB → localStorage（CMSが保存した最新データ）
 * 作品データが見つからない間は、次の保存先へ進む。
 */
async function loadPageData() {
  const data = {
    works: [],
    logo: { src: '' },
    siteAccess: { enabled: false, passwordHash: '' }
  };

  const merge = stored => {
    if (stored.works) data.works = stored.works;
    if (stored.logo) data.logo = stored.logo;

    if ('siteAccess' in stored) {
      data.siteAccess = Portfolio.normalizeSiteAccess(stored.siteAccess);
    }
  };

  const hasNoWorks = () => !data.works.length;

  if (!Portfolio.isPreviewMode()) {
    const json = await Portfolio.fetchSiteJson();

    if (json) {
      merge({ works: json.works, logo: json.logo, siteAccess: json.siteAccess });
    }
  }

  if (Portfolio.isPreviewMode() || hasNoWorks()) {
    merge(await Portfolio.readFromIndexedDB(DATA_FIELDS));
  }

  if (hasNoWorks()) {
    merge(Portfolio.readFromLocalStorage(DATA_FIELDS));
  }

  return data;
}

/* ============================================================
   画面への反映
   ============================================================ */

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

/* ─── タイトル・本文 ─── */
function renderHero(item) {
  document.getElementById('heroTitle').textContent = item.title || '';
  document.getElementById('heroLead').textContent = item.lead || item.desc || '';
  document.title = `${item.title} — SHOTA INOUE`;
}

/* ─── Client / Year などの一覧 ─── */
function renderDataList(item) {
  const dataList = document.querySelector('.data-list');

  if (!dataList) return;

  let rows;

  if (item.dataList && Array.isArray(item.dataList)) {
    rows = item.dataList
      .filter(row => row.label && row.value)
      .map(row => [row.label, row.value]);
  } else {
    const meta = item.meta || {};

    rows = [
      ['Client', meta.client],
      ['Year', meta.year],
      ['Art Direction', meta.artDirection],
      ['Design', meta.design],
      ['Direction', meta.direction],
      ['Tools', meta.tools]
    ].filter(row => row[1]);
  }

  if (!rows.length) return;

  dataList.innerHTML = rows
    .map(([label, value]) =>
      `<div><span class="lbl">${escapeHtml(label)}</span>${escapeHtml(value)}</div>`
    )
    .join('');
}

/* ─── 画像・動画 ─── */

/** 画像／動画1点の要素を作る */
function createMedia(image) {
  const isVideo = (image.type || '').startsWith('video/');
  let media;

  if (isVideo) {
    media = document.createElement('video');
    media.src = image.src;
    media.muted = true;
    media.loop = true;
    media.playsInline = true;
    media.autoplay = true;
    media.controls = true;
  } else {
    media = document.createElement('img');
    media.src = image.src;
    media.alt = '';
  }

  media.style.cssText = 'width:100%;height:auto;display:block';

  return media;
}

/**
 * 画像を表示ブロックに分ける。
 *   scroll: 横スクロール（scrollGroup）。連続していても scrollGroupId が違えば別ブロック
 *   grid:   通常の1枚（cols 列で並べる）
 */
function groupImageBlocks(images) {
  const blocks = [];
  let i = 0;

  while (i < images.length) {
    const image = images[i];

    if (image.scrollGroup) {
      const groupId = image.scrollGroupId || null;
      const group = [];

      while (
        i < images.length &&
        images[i].scrollGroup &&
        (groupId ? images[i].scrollGroupId === groupId : !images[i].scrollGroupId)
      ) {
        group.push(images[i]);
        i++;
      }

      blocks.push({
        type: 'scroll',
        images: group,
        cols: Math.max(1, Math.min(3, image.scrollCols || 1))
      });
    } else {
      blocks.push({ type: 'grid', image, cols: image.cols || 1 });
      i++;
    }
  }

  return blocks;
}

/** 横スクロールのカルーセル（2枚以上なら矢印・ドット付き） */
function createScrollRow(images) {
  const wrapper = document.createElement('div');
  const track = document.createElement('div');

  wrapper.className = 'scroll-row rv';
  track.className = 'scroll-row-track';

  images.forEach(image => {
    const cell = document.createElement('div');

    cell.appendChild(createMedia(image));
    track.appendChild(cell);
  });

  wrapper.appendChild(track);

  if (images.length > 1) {
    attachCarouselControls(wrapper, track, images.length);
  }

  return wrapper;
}

/** 前へ／次へボタンとドットを付け、スクロール位置と同期させる */
function attachCarouselControls(wrapper, track, total) {
  const prev = document.createElement('button');
  const next = document.createElement('button');

  prev.className = 'scroll-row-btn prev';
  prev.setAttribute('aria-label', '前へ');
  next.className = 'scroll-row-btn next';
  next.setAttribute('aria-label', '次へ');

  const dotsWrap = document.createElement('div');

  dotsWrap.className = 'scroll-row-dots';

  for (let i = 0; i < total; i++) {
    const dot = document.createElement('button');

    dot.className = 'scroll-row-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `${i + 1}枚目`);
    dotsWrap.appendChild(dot);
  }

  wrapper.appendChild(prev);
  wrapper.appendChild(next);
  wrapper.appendChild(dotsWrap);

  const dots = dotsWrap.querySelectorAll('.scroll-row-dot');
  let current = 0;

  const setCurrent = index => {
    current = index;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  };

  const goTo = index => {
    const target = Math.max(0, Math.min(total - 1, index));
    const itemWidth = track.scrollWidth / total;

    track.scrollTo({ left: itemWidth * target, behavior: 'smooth' });
    setCurrent(target);
  };

  prev.addEventListener('click', () => goTo(current - 1));
  next.addEventListener('click', () => goTo(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  /* スクロール位置 → ドット更新 */
  track.addEventListener('scroll', () => {
    const index = Math.round(track.scrollLeft / (track.scrollWidth / total));

    if (index !== current) setCurrent(index);
  }, { passive: true });
}

function renderImages(item) {
  const imagesRoot = document.querySelector('.images');

  if (!imagesRoot) return;

  /* 画像が1枚もない場合は .images セクション全体を非表示 */
  if (!item.images || !item.images.length) {
    imagesRoot.style.display = 'none';
    return;
  }

  imagesRoot.innerHTML = '';

  /* 同じ列数の連続ブロックは、列数に達するまで同じ行に入れる */
  let row = null;
  let currentCols = null;

  const rowFor = cols => {
    if (currentCols !== cols || (row && row.children.length >= cols)) {
      row = document.createElement('div');
      row.className = `img-row cols-${cols} rv`;
      imagesRoot.appendChild(row);
      currentCols = cols;
    }

    return row;
  };

  groupImageBlocks(item.images).forEach(block => {
    const target = rowFor(block.cols);

    if (block.type === 'scroll') {
      target.appendChild(createScrollRow(block.images));
      return;
    }

    const cell = document.createElement('div');

    cell.style.cssText = 'position:relative';
    cell.appendChild(createMedia(block.image));
    target.appendChild(cell);
  });

  /* 2列・3列で不足する行は、各ブロックの幅を保って中央寄せ */
  imagesRoot.querySelectorAll('.img-row.cols-2, .img-row.cols-3').forEach(rowEl => {
    const cols = rowEl.classList.contains('cols-2') ? 2 : 3;

    if (rowEl.children.length < cols) rowEl.classList.add('incomplete');
  });

  /* 新規に作った分のスクロールリビールを観測 */
  document.querySelectorAll('.images .rv').forEach(el => revealObserver.observe(el));
}

/* ============================================================
   初期化
   ============================================================ */

async function init() {
  const data = await loadPageData();

  /* パスワード認証が完了するまで詳細内容を表示しない */
  await Portfolio.initAccessGate({ siteAccess: data.siteAccess });

  Portfolio.applyLogo(data.logo, '.nav-logo, .footer-logo');

  const item = data.works
    .flatMap(group => group.items)
    .find(work => work.id === workId);

  if (!item) return;

  renderHero(item);
  renderDataList(item);
  renderImages(item);
}

init();

/* プレビュー時は Back リンクにも preview=1 を付け、index.html に戻ってもプレビュー状態を保つ */
if (params.get('preview') === '1') {
  const backLink = document.getElementById('backLink');

  if (backLink) backLink.href = 'index.html?works=1&preview=1';
}

Portfolio.initDotsBackground();
