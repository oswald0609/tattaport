/* ============================================================
   main.js — index.html（トップページ）
   共通処理は common.js（Portfolio）にあります。
   ============================================================ */

/* JSが正常に読み込めたことを示すフラグ（HTML側の保険用） */
window.__portfolioJsReady = true;

/* ─── 要素・定数 ─── */
const root = document.documentElement;
const loader = document.getElementById('loader');
const navFixed = document.getElementById('navFixed');
const topSection = document.getElementById('top');
const worksAll = document.getElementById('works-all');

const isMobile = () => window.innerWidth <= 900;
const skipOpening = new URLSearchParams(window.location.search).get('works') === '1';

let isLoading = true;
let openingStarted = false;

/* ============================================================
   サイトデータ
   ============================================================ */

const DUMMY_DESC = 'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。';

/* data.json も CMS のデータも無いときに表示するダミー */
const DEFAULT_WORKS_DATA = [
  {
    cat: 'Branding',
    items: [
      { id: 'sotoya-rebrand', tag: 'Branding', title: 'SOTOYA リブランディング CI 開発', desc: DUMMY_DESC },
      { id: 'sotoya-logo', tag: 'Branding', title: 'SOTOYA LOGO', desc: DUMMY_DESC },
      { id: 'sotoya-web', tag: 'Branding / Web', title: 'SOTOYA WEB SITE', desc: DUMMY_DESC },
      { id: 'sotoya-tools', tag: 'Branding', title: 'SOTOYA コーポレートツール', desc: DUMMY_DESC },
      { id: 'ec-flame', tag: 'Branding / EC', title: 'EC SITE flame', desc: DUMMY_DESC }
    ]
  },
  {
    cat: 'Web',
    items: [
      { id: 'nasta-hp', tag: 'Web', title: 'Nasta HP', desc: DUMMY_DESC },
      { id: 'nasta-post', tag: 'Web', title: 'Nasta Box +POST WEB SITE', desc: DUMMY_DESC },
      { id: 'nasta-light', tag: 'Web', title: 'Nasta Box LIGHT WEB SITE', desc: DUMMY_DESC },
      { id: 'nasta-amazon', tag: 'Web / EC', title: 'Nasta Interphone 2 Amazon page', desc: DUMMY_DESC },
      { id: 'nasta-sns', tag: 'SNS', title: 'Nasta SNS クリエイティブ', desc: DUMMY_DESC }
    ]
  },
  {
    cat: 'POP / Print media',
    items: [
      { id: 'pamphlet', tag: 'Print', title: 'カテゴリ別 製品一覧パンフレット', desc: DUMMY_DESC },
      { id: 'flyer-poster', tag: 'Print', title: '各種販促チラシ・ポスター', desc: DUMMY_DESC }
    ]
  },
  {
    cat: 'UI / UX',
    items: [
      { id: 'box-admin', tag: 'UI/UX', title: '宅配ボックス管理者用 WEB システム', desc: DUMMY_DESC },
      { id: 'nasta-app', tag: 'UI/UX', title: 'Nasta Box APP', desc: DUMMY_DESC }
    ]
  },
  {
    cat: 'Other',
    items: [
      { id: 'nasta-mvv', tag: 'Project', title: 'Nasta MVV Project', desc: DUMMY_DESC },
      { id: 'illusts', tag: 'Illustration', title: 'ILLUSTs', desc: DUMMY_DESC }
    ]
  }
];

/* 現在のサイトデータ（読み込めたものだけ上書きされる） */
const siteData = {
  works: DEFAULT_WORKS_DATA,
  profile: { images: [] },
  logo: { src: '' },
  homeBg: null,                                            /* WORKS背景の画像 */
  topTitle: { shota: { src: '', type: '' }, inoue: { src: '', type: '' } }, /* TOPの作字SVG */
  siteAccess: { enabled: false, passwordHash: '' }         /* 閲覧パスワード */
};

const SITE_DATA_FIELDS = ['works', 'profile', 'logo', 'homeBg', 'topTitle', 'siteAccess'];

/** 読み込んだデータを siteData へ反映（存在する項目だけ上書き） */
function mergeSiteData(data) {
  if (data.works) siteData.works = data.works;
  if (data.profile) siteData.profile = data.profile;
  if (data.logo) siteData.logo = data.logo;
  if (data.homeBg) siteData.homeBg = data.homeBg;
  if (data.topTitle) siteData.topTitle = data.topTitle;

  if ('siteAccess' in data) {
    siteData.siteAccess = Portfolio.normalizeSiteAccess(data.siteAccess);
  }
}

/**
 * データの読込。優先順位:
 *   本番:     data.json → IndexedDB → localStorage
 *   プレビュー: IndexedDB → localStorage（CMSが保存した最新データ）
 */
async function loadSiteData() {
  if (!Portfolio.isPreviewMode()) {
    const json = await Portfolio.fetchSiteJson();

    if (json) {
      mergeSiteData({ ...json, siteAccess: json.siteAccess });
      applyLogo();
      applyTopTitle();
      return;
    }
  }

  mergeSiteData(await Portfolio.readFromIndexedDB(SITE_DATA_FIELDS));

  if (siteData.works === DEFAULT_WORKS_DATA) {
    mergeSiteData(Portfolio.readFromLocalStorage(SITE_DATA_FIELDS));
  }

  applyLogo();
  applyTopTitle();
}

/* ============================================================
   画面への反映
   ============================================================ */

/* ─── ロゴ ─── */
function applyLogo() {
  Portfolio.applyLogo(siteData.logo, '.nav-logo, .footer-logo, .ld-logo-box');
}

/* ─── TOPの作字SVG（未登録なら従来テキストを表示） ─── */
function applyTopTitle() {
  const titleImages = [
    { key: 'shota', imageId: 'topTitleShota' },
    { key: 'inoue', imageId: 'topTitleInoue' }
  ];

  titleImages.forEach(({ key, imageId }) => {
    const image = document.getElementById(imageId);

    if (!image) return;

    const line = image.closest('.top-title-line');
    const fallback = line ? line.querySelector('.top-title-fallback') : null;
    const asset = siteData.topTitle && siteData.topTitle[key];

    if (asset && asset.src) {
      image.src = asset.src;
      image.classList.add('has-art');

      if (fallback) {
        fallback.classList.add('is-hidden');
        fallback.setAttribute('aria-hidden', 'true');
      }
    } else {
      image.removeAttribute('src');
      image.classList.remove('has-art');

      if (fallback) {
        fallback.classList.remove('is-hidden');
        fallback.removeAttribute('aria-hidden');
      }
    }
  });
}

/* ─── WORKS背景（流れる画像。CMSのHome背景 → 各作品の1枚目 の順で使う） ─── */
function applyWorksBg() {
  let sources = [];

  if (siteData.homeBg && siteData.homeBg.images && siteData.homeBg.images.length) {
    sources = siteData.homeBg.images.map(item => item.src);
  } else {
    siteData.works.forEach(group => {
      group.items.forEach(item => {
        if (item.images && item.images[0]) {
          sources.push(item.images[0].src);
        }
      });
    });
  }

  if (sources.length === 0) return;

  /* 3段のうち上下段は偶数番・奇数番だけにして、段ごとに並びを変える */
  const rowSources = sources.length > 1
    ? [
        sources.filter((_, index) => index % 2 === 0),
        sources,
        sources.filter((_, index) => index % 2 === 1)
      ]
    : [sources, sources, sources];

  document.querySelectorAll('.works-bg-row').forEach((row, rowIndex) => {
    const set = rowSources[rowIndex] && rowSources[rowIndex].length
      ? rowSources[rowIndex]
      : sources;

    row.querySelectorAll('.works-bg-cell').forEach((cell, index) => {
      cell.style.backgroundImage = `url("${set[index % set.length]}")`;
      cell.style.backgroundSize = 'cover';
      cell.style.backgroundPosition = 'center';
      cell.classList.add('has-img');
    });
  });
}

/* ─── WORKS一覧（カテゴリ別カード） ─── */
function renderWorksList() {
  const grid = document.getElementById('waGridContainer');

  grid.innerHTML = '';

  siteData.works.forEach(group => {
    const category = document.createElement('div');

    category.className = 'wa-category';
    category.innerHTML = `
      <div class="wa-cat-label wa-fade">${group.cat}</div>
      <div class="wa-grid"></div>
    `;

    const cardGrid = category.querySelector('.wa-grid');

    group.items.forEach(item => cardGrid.appendChild(createWorkCard(item)));
    grid.appendChild(category);
  });

  /* スクロールでカードをフェードイン */
  const fadeObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, {
    root: document.querySelector('.wa-body'),
    threshold: .12
  });

  document.querySelectorAll('.wa-fade').forEach(el => fadeObserver.observe(el));

  bindWorkCardClicks();
}

function createWorkCard(item) {
  const card = document.createElement('div');

  card.className = 'wa-card wa-fade';
  card.dataset.id = item.id;

  const thumb = item.images && item.images[0];
  const thumbSrc = thumb ? thumb.src : null;
  const isVideo = ((thumb && thumb.type) || '').startsWith('video/');
  const mediaStyle = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';

  let mediaHtml = '<div class="wa-card-img-ph"></div>';

  if (thumbSrc) {
    mediaHtml = isVideo
      ? `<video src="${thumbSrc}" muted loop playsinline autoplay style="${mediaStyle}"></video>`
      : `<img src="${thumbSrc}" alt="" style="${mediaStyle}">`;
  }

  card.innerHTML = `
    <div class="wa-card-img">${mediaHtml}</div>
    <div class="wa-card-body">
      <div class="wa-card-title">${item.title}</div>
      <div class="wa-card-desc">${item.desc || ''}</div>
    </div>
    <div class="wa-card-arrow"></div>
  `;

  return card;
}

/*
  カードのクリック:
    PC（ホバーできる）  … すぐ詳細ページへ
    タッチ端末          … 1回目で内容を表示、2回目で詳細ページへ
*/
function bindWorkCardClicks() {
  const isHoverPC = () =>
    window.matchMedia('(hover:hover) and (min-width:901px)').matches;

  const previewQuery = Portfolio.isPreviewMode() ? '&preview=1' : '';

  document.querySelectorAll('.wa-card').forEach(card => {
    card.addEventListener('click', () => {
      const detailUrl = `detail.html?id=${card.dataset.id}${previewQuery}`;

      if (isHoverPC() || card.classList.contains('active')) {
        window.location.href = detailUrl;
        return;
      }

      document
        .querySelectorAll('.wa-card.active')
        .forEach(activeCard => activeCard.classList.remove('active'));

      card.classList.add('active');
    });
  });
}

/* ─── PROFILE画像のスライドショー（PC用・SP用の両方へ） ─── */
function renderProfileSlideshow() {
  const images = siteData.profile.images || [];

  if (images.length === 0) return;

  const targets = ['profileBgPC', 'profileBgSP']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  targets.forEach(target => {
    target.classList.add('has-slides');
    target.querySelectorAll('.profile-slide').forEach(el => el.remove());

    images.forEach((image, index) => {
      const slide = document.createElement('div');

      slide.className = 'profile-slide' + (index === 0 ? ' active' : '');
      slide.style.backgroundImage = `url("${image.src}")`;

      target.appendChild(slide);
    });
  });

  if (images.length < 2) return;

  let current = 0;

  setInterval(() => {
    current = (current + 1) % images.length;

    targets.forEach(target => {
      target.querySelectorAll('.profile-slide').forEach((slide, index) => {
        slide.classList.toggle('active', index === current);
      });
    });
  }, 4000);
}

/* ============================================================
   スクロール制御
   ============================================================ */

/* ─── 最上部への強制固定（ローダー表示中・キーボード由来のズレ対策） ─── */
let forceTopUntil = 0;
let forcingTop = false;

function forceScrollTop(duration = 1200) {
  forceTopUntil = performance.now() + duration;

  if (forcingTop) return;

  forcingTop = true;

  (function loop() {
    Portfolio.scrollToTop();

    if (performance.now() < forceTopUntil) {
      requestAnimationFrame(loop);
    } else {
      forcingTop = false;
    }
  })();
}

/* ─── セクション単位のスナップスクロール ─── */
const SNAP_DURATION = 820;

/* easeInOutExpo */
const ease = t => {
  if (t === 0) return 0;
  if (t === 1) return 1;

  return t < .5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
};

/** 現在位置から見て、次（dir>0）／前（dir<0）のセクション位置 */
function nearestSectionTop(scrollTop, dir) {
  const sections = [...document.querySelectorAll('section')];

  if (dir > 0) {
    for (const section of sections) {
      if (section.offsetTop > scrollTop + 60) return section.offsetTop;
    }

    return sections[sections.length - 1].offsetTop;
  }

  for (let i = sections.length - 1; i >= 0; i--) {
    if (sections[i].offsetTop < scrollTop - 60) return sections[i].offsetTop;
  }

  return 0;
}

let snapping = false;

function snapTo(y, duration = SNAP_DURATION) {
  if (snapping) return;

  snapping = true;

  const startY = root.scrollTop;
  const distance = y - startY;

  if (Math.abs(distance) < 4) {
    snapping = false;
    return;
  }

  const startTime = performance.now();

  (function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);

    root.scrollTop = startY + distance * ease(progress);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      root.scrollTop = y;
      snapping = false;
    }
  })(performance.now());
}

/** スナップ操作を受け付けない状態か（ローダー中・WORKS一覧表示中など） */
const isSnapDisabled = () => isLoading || worksAll.classList.contains('open');

function initSnapScroll() {
  /* ホイール */
  let wheelAmount = 0;
  let wheelTimer = null;

  root.addEventListener('wheel', e => {
    if (worksAll.classList.contains('open')) return;

    e.preventDefault();

    if (snapping) return;

    wheelAmount += e.deltaY;

    clearTimeout(wheelTimer);

    wheelTimer = setTimeout(() => {
      if (Math.abs(wheelAmount) < 18) {
        wheelAmount = 0;
        return;
      }

      const direction = wheelAmount > 0 ? 1 : -1;

      wheelAmount = 0;

      snapTo(nearestSectionTop(root.scrollTop, direction));
    }, 3);
  }, { passive: false });

  /* タッチ */
  let touchStartY = 0;
  let touchStartScroll = 0;

  root.addEventListener('touchstart', e => {
    if (isSnapDisabled() || !Portfolio.isTouchDevice()) return;

    touchStartY = e.touches[0].clientY;
    touchStartScroll = root.scrollTop;
  }, { passive: false });

  root.addEventListener('touchmove', e => {
    /* パスワード画面の中だけは自由にスクロールさせる */
    if (e.target.closest && e.target.closest('.site-access-gate')) return;

    if (isLoading) {
      e.preventDefault();
      return;
    }

    if (worksAll.classList.contains('open')) return;
    if (!Portfolio.isTouchDevice()) return;

    e.preventDefault();
  }, { passive: false });

  root.addEventListener('touchend', e => {
    if (isSnapDisabled() || !Portfolio.isTouchDevice() || snapping) return;

    const deltaY = touchStartY - e.changedTouches[0].clientY;

    if (Math.abs(deltaY) < 30) return;

    snapTo(nearestSectionTop(touchStartScroll, deltaY > 0 ? 1 : -1));
  }, { passive: true });
}

/** #anchor リンクのクリックでスナップスクロールする */
function bindAnchorLinks(selector, { beforeScroll, delay = 0 } = {}) {
  document.querySelectorAll(selector).forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');

      if (!href || !href.startsWith('#')) return;

      e.preventDefault();

      if (beforeScroll) beforeScroll();

      const target = document.querySelector(href);

      if (!target) return;

      if (delay) {
        setTimeout(() => snapTo(target.offsetTop), delay);
      } else {
        snapTo(target.offsetTop);
      }
    });
  });
}

/* ============================================================
   ナビ・メニュー・WORKS一覧オーバーレイ
   ============================================================ */

/* ─── ナビの表示切替 ─── */
function initNavVisibility() {
  /* PC: TOPが半分以上見えている間はナビを隠す */
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.target.id !== 'top' || isMobile()) return;
      if (worksAll.classList.contains('open')) return;

      if (e.isIntersecting && e.intersectionRatio > 0.5) {
        navFixed.classList.remove('show');
      } else {
        navFixed.classList.add('show');
      }
    });
  }, { threshold: [0, .5, 1] }).observe(topSection);

  /* SP: 常に表示 */
  if (isMobile()) navFixed.classList.add('show');

  window.addEventListener('resize', () => {
    if (isMobile()) navFixed.classList.add('show');
  });

  /* CONTACTが見えている間、メールボタンを出すための目印 */
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      document.body.classList.toggle(
        'in-contact',
        e.isIntersecting && e.intersectionRatio > 0.3
      );
    });
  }, { threshold: [0, .3, 1] }).observe(document.getElementById('contact'));
}

/* ─── WORKS一覧オーバーレイ ─── */
function openWorksAll() {
  worksAll.classList.add('open');
  document.body.style.overflow = 'hidden';

  if (!isMobile()) navFixed.classList.add('show');
}

function closeWorksAll() {
  worksAll.classList.remove('open');
  document.body.style.overflow = '';
  document.body.classList.remove('works-open');
}

function initWorksOverlay() {
  document.getElementById('viewAllBtn').addEventListener('click', e => {
    e.preventDefault();
    openWorksAll();
  });

  document.getElementById('waBack').addEventListener('click', e => {
    e.preventDefault();

    closeWorksAll();

    const worksSection = document.getElementById('works');

    if (worksSection) snapTo(worksSection.offsetTop);

    if (!isMobile()) navFixed.classList.add('show');
  });

  /* カード以外をクリックしたら、タッチ端末の選択状態を解除 */
  document.querySelector('.wa-body').addEventListener('click', e => {
    if (e.target.closest('.wa-card')) return;

    document
      .querySelectorAll('.wa-card.active')
      .forEach(card => card.classList.remove('active'));
  });

  /* 詳細ページの「Back to WORKS」から戻ってきたとき（?works=1）は一覧を開いた状態にする */
  if (skipOpening) {
    openWorksAll();
    root.classList.remove('skip-opening');
    history.replaceState(null, '', location.pathname);
  }
}

/* ─── ナビロゴ・メニュー ─── */
function initNavControls() {
  const closeMenu = Portfolio.initHamburger();

  document.getElementById('navLogoBtn').addEventListener('click', () => {
    if (worksAll.classList.contains('open')) {
      closeWorksAll();

      if (!isMobile()) navFixed.classList.remove('show');
    }

    snapTo(topSection.offsetTop);
  });

  bindAnchorLinks('.top-nav a, .cf-links a');
  bindAnchorLinks('.mob-link', { beforeScroll: closeMenu, delay: 60 });
}

/* ============================================================
   演出
   ============================================================ */

/* ─── オープニング（ローダー） ─── */

/** ローダーを消して本編を表示状態にする */
function hideLoader() {
  loader.style.display = 'none';
  document.body.classList.add('loaded');
  isLoading = false;
}

/*
  ローダーは最初から表示状態で、パスワード画面の裏に待機させる。
  パスワード画面が消える瞬間に、ドット背景が一瞬見えるのを防ぐ。
*/
function prepareLoader() {
  if (skipOpening) {
    hideLoader();
    return;
  }

  /* パスワード画面の背面でローダー背景だけを表示（ロゴは認証後に出す） */
  loader.style.display = 'flex';
  loader.style.visibility = 'visible';
  loader.style.opacity = '1';

  const logo = loader.querySelector('.ld-logo-box');

  if (logo) {
    logo.style.visibility = 'hidden';
    logo.style.animation = 'none';
  }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/* パスワード認証後に実行するオープニング */
async function startOpeningSequence() {
  if (openingStarted) return;

  openingStarted = true;

  /* Works一覧へ直接アクセスした場合はオープニングなし */
  if (skipOpening) {
    hideLoader();
    return;
  }

  /* ページの読み込み完了を待つ */
  if (document.readyState !== 'complete') {
    await new Promise(resolve => {
      window.addEventListener('load', resolve, { once: true });
    });
  }

  root.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  /* オープニング中は最上部を維持し続ける */
  forceScrollTop(2000);

  /* ここでロゴだけを表示し、アニメーションを最初から再生する */
  loader.style.display = 'flex';
  loader.style.visibility = 'visible';
  loader.style.opacity = '1';
  loader.classList.remove('done');

  const logo = loader.querySelector('.ld-logo-box');

  if (logo) {
    logo.style.visibility = 'visible';
    logo.style.animation = 'none';

    void logo.offsetWidth; /* 強制再描画 */

    logo.style.animation = '';
  }

  /* ロゴを見せる時間 */
  await wait(1000);

  loader.classList.add('done');
  document.body.classList.add('loaded');

  /* ローダーのフェードアウト完了を待つ */
  await wait(500);

  loader.style.display = 'none';
  isLoading = false;

  root.style.overflow = '';
  document.body.style.overflow = '';

  /* 解除直後の位置ズレを打ち消す。端末によってはバーの高さ確定が遅れるので、少し後にもう一度 */
  Portfolio.scrollToTop();
  setTimeout(Portfolio.scrollToTop, 120);
  setTimeout(Portfolio.scrollToTop, 400);
}

/* ─── PROFILEの「遊び心」テキスト（クリックで色が変わり、火花が飛ぶ） ─── */
function initPlayful() {
  const playful = document.getElementById('playful');

  if (!playful) return;

  const SPARK_CHARS = ['✦', '✧', '＊', '✦', '◦', '✺'];
  const COLORS = ['#196ed2', '#f04650', '#f0eb50', '#e6f0e1', '#50f0d2'];

  let colorIndex = -1;

  function spawnSpark(rect, color) {
    const spark = document.createElement('span');

    spark.className = 'spark';
    spark.textContent = SPARK_CHARS[Math.floor(Math.random() * SPARK_CHARS.length)];
    spark.style.color = color;

    spark.style.left = (rect.left + Math.random() * rect.width) + 'px';
    spark.style.top = (rect.top + Math.random() * rect.height) + 'px';

    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 60;

    spark.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
    spark.style.setProperty('--dy', (Math.sin(angle) * distance - 30) + 'px');
    spark.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
    spark.style.fontSize = (10 + Math.random() * 8) + 'px';
    spark.style.transform = 'translate(-50%,-50%) scale(.4)';

    document.body.appendChild(spark);

    requestAnimationFrame(() => spark.classList.add('fly'));
    setTimeout(() => spark.remove(), 1200);
  }

  playful.addEventListener('click', () => {
    colorIndex = (colorIndex + 1) % COLORS.length;

    const color = COLORS[colorIndex];

    /* サイト全体のアクセント色も切り替える */
    root.style.setProperty('--accent', color);
    playful.style.setProperty('--playful-c', color);

    /* ぷるっと揺れるアニメーションを再生し直す */
    playful.classList.remove('poked');
    void playful.offsetWidth;
    playful.classList.add('poked');

    setTimeout(() => {
      playful.classList.remove('poked');
      playful.style.animation = 'none';

      void playful.offsetWidth;

      playful.style.animation = '';
    }, 950);

    const rect = playful.getBoundingClientRect();
    const count = 8 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      spawnSpark(rect, color);
    }
  });
}

/* ============================================================
   初期化
   ============================================================ */

prepareLoader();

Portfolio.initCursor('a,button,.wa-card,.nav-logo,.playful');
Portfolio.initScrollReveal();
Portfolio.initDotsBackground();

initNavVisibility();
initNavControls();
initSnapScroll();
initWorksOverlay();
initPlayful();

(async () => {
  /* データ取得に失敗してもゲートで固まらないようにする */
  try {
    await loadSiteData();
  } catch (e) {
    console.error(e);
    siteData.siteAccess = { enabled: false, passwordHash: '' };
  }

  /* 正しいパスワードを入れるまで、ここから先へ進まない */
  await Portfolio.initAccessGate({
    siteAccess: siteData.siteAccess,

    /* ゲート解除の直後は最上部に固定し続ける */
    onUnlock: () => forceScrollTop(1500),

    /* キーボードが閉じ切るタイミングで再度最上部へ */
    onClosed: () => {
      setTimeout(Portfolio.scrollToTop, 400);
      setTimeout(Portfolio.scrollToTop, 800);
    }
  });

  /* パスワード通過後にページ内容を構築 */
  renderWorksList();
  renderProfileSlideshow();
  applyWorksBg();

  /* 最後にオープニングアニメーションを開始 */
  await startOpeningSequence();
})();
