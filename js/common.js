/* ============================================================
   common.js
   index.html / detail.html の両方で使う共通処理。
   main.js / detail.js より「先に」読み込むこと。
   公開するのは Portfolio オブジェクト1つだけ。
   ============================================================ */

const Portfolio = (() => {

  /* ─── 共通ユーティリティ ─── */

  /** タッチ端末（ホバーできない端末）かどうか */
  const isTouchDevice = () => window.matchMedia('(hover:none)').matches;

  /** CMSのプレビュー表示（?preview=1）かどうか */
  const isPreviewMode = () =>
    new URLSearchParams(window.location.search).get('preview') === '1';

  /** ページの最上部へ戻す */
  function scrollToTop() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  /* ─── カスタムカーソル ─── */

  /** マウスに追従するカーソルを有効化。hoverSelector にホバーすると拡大する */
  function initCursor(hoverSelector) {
    const cursor = document.getElementById('cur');

    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });

    document.querySelectorAll(hoverSelector).forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('expanded'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('expanded'));
    });
  }

  /* ─── ハンバーガーメニュー ─── */

  /** メニューの開閉を有効化し、メニューを閉じる関数を返す */
  function initHamburger() {
    const hamburger = document.getElementById('ham');
    const menu = document.getElementById('mobMenu');

    hamburger.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
    });

    return function closeMenu() {
      menu.classList.remove('open');
      hamburger.classList.remove('open');
    };
  }

  /* ─── スクロールリビール ─── */

  /** .rv 要素が画面に入ったら .vis を付ける。Observer を返す（後から追加分を observe できる） */
  function initScrollReveal() {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry, index) => {
        if (!entry.isIntersecting) return;

        setTimeout(() => entry.target.classList.add('vis'), index * 80);
        obs.unobserve(entry.target);
      });
    }, { threshold: .15 });

    document.querySelectorAll('.rv').forEach(el => observer.observe(el));

    return observer;
  }

  /* ─── ロゴ ─── */

  /** ロゴ画像を selector に一致する要素へ適用し、ファビコンも差し替える */
  function applyLogo(logo, selector) {
    if (!logo || !logo.src) return;

    const src = logo.src;

    document.querySelectorAll(selector).forEach(el => {
      el.style.backgroundImage = `url("${src}")`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundColor = 'transparent';
      el.classList.add('has-logo');
    });

    let favicon = document.querySelector('link[rel="icon"]');

    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }

    favicon.href = src;
  }

  /* ─── データ読込（CMSが保存した IndexedDB / localStorage / data.json） ─── */

  const IDB_NAME = 'portfolioCMS';
  const IDB_VERSION = 1;
  const IDB_STORE = 'store';

  /** データ名 → CMS が保存するときのキー名 */
  const STORE_KEYS = {
    works: 'worksData',
    profile: 'profileData',
    logo: 'logoData',
    homeBg: 'homeBgData',
    topTitle: 'topTitleData',
    siteAccess: 'siteAccessData'
  };

  let idbPromise = null;

  function openDatabase() {
    if (!idbPromise) {
      idbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, IDB_VERSION);

        request.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => {
          idbPromise = null;
          reject(e.target.error);
        };
      });
    }

    return idbPromise;
  }

  /** IndexedDB から1件読む。失敗・未保存のときは null */
  async function idbGet(key) {
    try {
      const db = await openDatabase();

      return await new Promise((resolve, reject) => {
        const request = db
          .transaction(IDB_STORE, 'readonly')
          .objectStore(IDB_STORE)
          .get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = e => reject(e.target.error);
      });
    } catch (e) {
      return null;
    }
  }

  /** fields（例: ['works','logo']）を IndexedDB から読む。未保存の項目は null */
  async function readFromIndexedDB(fields) {
    const data = {};

    for (const field of fields) {
      data[field] = await idbGet(STORE_KEYS[field]);
    }

    return data;
  }

  /** fields を localStorage から読む。保存されている項目だけ返す */
  function readFromLocalStorage(fields) {
    const data = {};

    for (const field of fields) {
      try {
        const raw = localStorage.getItem(STORE_KEYS[field]);

        if (raw) data[field] = JSON.parse(raw);
      } catch (e) {}
    }

    return data;
  }

  /** 本番の data.json を取得。取得できなければ null */
  async function fetchSiteJson() {
    try {
      const response = await fetch('data.json', { cache: 'no-cache' });

      if (response.ok) return await response.json();
    } catch (e) {}

    return null;
  }

  /* ─── パスワードゲート ─── */

  const ACCESS_SESSION_KEY = 'portfolioAccessHash';

  function normalizeSiteAccess(data) {
    return {
      enabled: !!(data && data.enabled),
      passwordHash: (data && data.passwordHash) ? data.passwordHash : ''
    };
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);

    return [...new Uint8Array(hashBuffer)]
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * パスワード画面を制御する。認証が済む（または不要）と resolve する。
   *
   * @param {object}   options
   * @param {object}   options.siteAccess  { enabled, passwordHash }
   * @param {Function} [options.onUnlock]  背面スクロールのロック解除の直後に呼ぶ
   * @param {Function} [options.onClosed]  パスワード画面を閉じ終えた直後に呼ぶ
   */
  function initAccessGate({ siteAccess, onUnlock, onClosed }) {
    const root = document.documentElement;
    const gate = document.getElementById('siteAccessGate');
    const form = document.getElementById('siteAccessForm');
    const input = document.getElementById('siteAccessPassword');
    const error = document.getElementById('siteAccessError');
    const toggle = document.querySelector('.site-access-toggle');

    const unlockPageScroll = () => {
      root.classList.remove('access-locked');
      scrollToTop();

      if (onUnlock) onUnlock();
    };

    return new Promise(resolve => {
      if (!gate || !form || !input) {
        unlockPageScroll();
        resolve();
        return;
      }

      let isClosed = false;

      /* 表示 / 非表示ボタンと入力欄の状態を揃える */
      const setPasswordVisible = visible => {
        input.type = visible ? 'text' : 'password';

        if (!toggle) return;

        toggle.textContent = visible ? '非表示' : '表示';
        toggle.classList.toggle('is-visible', visible);
        toggle.setAttribute('aria-pressed', String(visible));
        toggle.setAttribute('aria-label', visible ? 'パスワードを隠す' : 'パスワードを表示');
      };

      if (toggle) {
        toggle.addEventListener('click', () => {
          setPasswordVisible(input.type !== 'text');
          input.focus({ preventScroll: true });
        });
      }

      const closeGate = (withAnimation = true) => {
        if (isClosed) return;

        isClosed = true;

        gate.classList.add('is-hidden');
        gate.setAttribute('aria-hidden', 'true');

        const finish = () => {
          gate.style.display = 'none';

          /* キーボードを確実に閉じてからロック解除 */
          try { input.blur(); } catch (e) {}

          unlockPageScroll();

          if (onClosed) onClosed();

          resolve();
        };

        if (withAnimation) {
          setTimeout(finish, 450);
        } else {
          finish();
        }
      };

      /* CMSでパスワード保護がOFFの場合 */
      if (!siteAccess.enabled || !siteAccess.passwordHash) {
        root.classList.remove('access-session-hint');
        closeGate(false);
        return;
      }

      /* 同じタブで認証済みなら、画面を出さずに進む */
      try {
        if (sessionStorage.getItem(ACCESS_SESSION_KEY) === siteAccess.passwordHash) {
          closeGate(false);
          return;
        }
      } catch (e) {}

      /* ここからパスワード画面を表示 */
      root.classList.remove('access-session-hint');
      root.classList.add('access-locked');

      gate.classList.remove('is-hidden');
      gate.style.display = 'flex';
      gate.setAttribute('aria-hidden', 'false');

      /* タッチ端末では自動フォーカスしない（キーボードで表示位置がズレるため） */
      if (!isTouchDevice()) {
        setTimeout(() => input.focus({ preventScroll: true }), 80);
      }

      form.addEventListener('submit', async e => {
        e.preventDefault();

        const submit = form.querySelector('.site-access-submit');
        const password = input.value;

        error.textContent = '';

        if (!password) {
          error.textContent = 'パスワードを入力してください。';
          input.focus({ preventScroll: true });
          return;
        }

        try {
          submit.disabled = true;
          submit.textContent = 'CHECKING...';

          const inputHash = await sha256(password);

          if (inputHash !== siteAccess.passwordHash) {
            error.textContent = 'パスワードが正しくありません。';

            input.value = '';
            setPasswordVisible(false);
            input.focus({ preventScroll: true });

            submit.disabled = false;
            submit.textContent = 'ENTER';

            return;
          }

          /* 正しいハッシュを同じタブ内に保存 */
          try {
            sessionStorage.setItem(ACCESS_SESSION_KEY, siteAccess.passwordHash);
          } catch (e) {}

          closeGate(true);

        } catch (err) {
          console.error(err);

          error.textContent = '認証処理に失敗しました。ページを再読み込みしてください。';

          submit.disabled = false;
          submit.textContent = 'ENTER';
        }
      });
    });
  }

  /* ─── 背景ドットエフェクト ─── */

  /** マウス／タッチ位置の周りでドットが膨らむ背景（#dotsCanvas） */
  function initDotsBackground() {
    const canvas = document.getElementById('dotsCanvas');

    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });

    const SPACING = 14;
    const BASE_RADIUS = .9;
    const MAX_RADIUS = 5;
    const INFLUENCE = 120;
    const EASE = .12;
    const IDLE_DECAY = .85;
    const STOP_DELAY = 750;

    const BG_COLOR = '#181919';
    const DOT_COLOR = '#1e2323';
    const ACCENT_COLOR = '#3a3b3b';

    const influenceSq = INFLUENCE * INFLUENCE;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

    let width = 0;
    let height = 0;
    let stopTimer = null;
    let isTouchDev = isTouchDevice();

    /* x/y: 描画に使う現在位置、tx/ty: 目標位置、strength: 膨らみの強さ(0〜1) */
    const pointer = {
      x: -9999,
      y: -9999,
      tx: -9999,
      ty: -9999,
      strength: 0,
      targetStrength: 0
    };

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* 操作が止まって STOP_DELAY 経つと、膨らみを解除する */
    function activate() {
      pointer.targetStrength = 1;

      clearTimeout(stopTimer);

      stopTimer = setTimeout(() => {
        pointer.targetStrength = 0;
      }, STOP_DELAY);
    }

    function deactivate() {
      pointer.targetStrength = 0;
      clearTimeout(stopTimer);
    }

    /* 目標位置を更新。初回だけ現在位置も同じ場所に置く */
    function moveTo(clientX, clientY, snapOnFirst) {
      pointer.tx = clientX;
      pointer.ty = clientY;

      if (snapOnFirst && pointer.x < -9000) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }

      activate();
    }

    /* 千鳥配置のドット座標を順に callback へ渡す */
    function forEachDot(callback) {
      let row = 0;

      for (let y = SPACING / 2; y < height; y += SPACING) {
        const offset = row % 2 ? SPACING / 2 : 0;

        for (let x = SPACING / 2 + offset; x < width; x += SPACING) {
          callback(x, y);
        }

        row++;
      }
    }

    function frame() {
      if (pointer.tx > -9000) {
        if (isTouchDev) {
          pointer.x = pointer.tx;
          pointer.y = pointer.ty;
        } else {
          pointer.x += (pointer.tx - pointer.x) * EASE;
          pointer.y += (pointer.ty - pointer.y) * EASE;
        }
      }

      if (pointer.targetStrength > pointer.strength) {
        pointer.strength += (pointer.targetStrength - pointer.strength) * .1;
      } else {
        pointer.strength *= IDLE_DECAY;

        if (pointer.strength < .001) pointer.strength = 0;
      }

      const px = pointer.x;
      const py = pointer.y;
      const strength = pointer.strength;
      const isActive = strength > .01;

      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, width, height);

      /* 通常のドット（膨らむ範囲の内側は除く）をまとめて描画 */
      ctx.fillStyle = DOT_COLOR;
      ctx.beginPath();

      forEachDot((x, y) => {
        const dx = x - px;
        const dy = y - py;

        if (isActive && (dx * dx + dy * dy) < influenceSq) return;

        ctx.moveTo(x + BASE_RADIUS, y);
        ctx.arc(x, y, BASE_RADIUS, 0, Math.PI * 2);
      });

      ctx.fill();

      /* 膨らむ範囲内のドットを、距離に応じた大きさで描画 */
      if (isActive) {
        forEachDot((x, y) => {
          const dx = x - px;
          const dy = y - py;
          const distSq = dx * dx + dy * dy;

          if (distSq >= influenceSq) return;

          let t = 1 - Math.sqrt(distSq) / INFLUENCE;

          t = t * t * (3 - 2 * t) * strength;

          const radius = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * t;

          ctx.fillStyle = t > .6 ? ACCENT_COLOR : DOT_COLOR;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      requestAnimationFrame(frame);
    }

    resize();

    window.addEventListener('resize', () => {
      resize();
      isTouchDev = isTouchDevice();
    });

    window.addEventListener('mousemove', e => moveTo(e.clientX, e.clientY, true));
    window.addEventListener('mouseleave', deactivate);

    window.addEventListener('touchstart', e => {
      moveTo(e.touches[0].clientX, e.touches[0].clientY, true);
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      moveTo(e.touches[0].clientX, e.touches[0].clientY, false);
    }, { passive: true });

    window.addEventListener('touchend', deactivate);

    requestAnimationFrame(frame);
  }

  return {
    isTouchDevice,
    isPreviewMode,
    scrollToTop,
    initCursor,
    initHamburger,
    initScrollReveal,
    applyLogo,
    readFromIndexedDB,
    readFromLocalStorage,
    fetchSiteJson,
    normalizeSiteAccess,
    initAccessGate,
    initDotsBackground
  };

})();
