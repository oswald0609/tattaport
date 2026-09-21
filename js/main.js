/* ─── SPナビの自前固定（iOSのfixed追従遅れ対策） ─── */
const htmlRoot = document.documentElement;
const vvp = window.visualViewport || null;

let navEl = null;
let navPinRAF = 0;
let navPinUntil = 0;

function isSPView(){
  return window.innerWidth <= 900;
}

/* SPのときだけ absolute 固定モードへ切り替える */
function updateNavPinMode(){
  if(!navEl) navEl = document.getElementById('navFixed');

  if(isSPView()){
    htmlRoot.classList.add('nav-pinned');
    pinNavOnce();
  }else{
    htmlRoot.classList.remove('nav-pinned');
    if(navEl) navEl.style.transform = '';
  }
}

/* ナビを「いま見えている画面の上端」に合わせる */
function pinNavOnce(){
  if(!navEl) navEl = document.getElementById('navFixed');
  if(!navEl) return;

  if(!htmlRoot.classList.contains('nav-pinned')){
    navEl.style.transform = '';
    return;
  }

  const scrollY = window.pageYOffset || htmlRoot.scrollTop || 0;
  const vOffset = vvp ? (vvp.offsetTop || 0) : 0;

  navEl.style.transform =
    'translate3d(0,' + Math.round(scrollY + vOffset) + 'px,0)';
}

/* スクロール中は毎フレーム追従させる（止まったら自動停止） */
function pinNavFor(duration = 400){
  navPinUntil = performance.now() + duration;

  if(navPinRAF) return;

  const loop = () => {
    pinNavOnce();

    if(performance.now() < navPinUntil){
      navPinRAF = requestAnimationFrame(loop);
    }else{
      navPinRAF = 0;
      pinNavOnce();
    }
  };

  navPinRAF = requestAnimationFrame(loop);
}

window.addEventListener('scroll',    () => pinNavFor(400), { passive:true });
window.addEventListener('touchmove', () => pinNavFor(500), { passive:true });
window.addEventListener('touchend',  () => pinNavFor(700), { passive:true });

window.addEventListener('resize', () => {
  updateNavPinMode();
  pinNavFor(600);
});

window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    updateNavPinMode();
    pinNavFor(800);
  }, 300);
});

if(vvp){
  vvp.addEventListener('scroll', () => pinNavFor(400));
  vvp.addEventListener('resize', () => pinNavFor(600));
}

updateNavPinMode();
document.addEventListener('DOMContentLoaded', updateNavPinMode);

/* ─── ページ最上部へ強制的に戻す ─── */
function hardScrollTop(){
  window.scrollTo(0, 0);
  htmlRoot.scrollTop = 0;
  document.body.scrollTop = 0;
  pinNavOnce();
}

let forceTopUntil = 0;
let forcingTop = false;

/* ローダー表示中は最上部を維持し続ける（キーボード由来のズレも打ち消す） */
function forceScrollTop(duration = 1200){
  forceTopUntil = performance.now() + duration;

  if(forcingTop) return;
  forcingTop = true;

  (function loop(){
    hardScrollTop();

    if(performance.now() < forceTopUntil){
      requestAnimationFrame(loop);
    }else{
      forcingTop = false;
    }
  })();
}

/* ─── ページスクロールのロック / 解除 ─── */
function lockPageScroll(){
  htmlRoot.classList.add('access-locked');
}

function unlockPageScroll(){
  htmlRoot.classList.remove('access-locked');

  hardScrollTop();
  forceScrollTop(1500);
}

/* タッチ端末では自動フォーカスしない（キーボードで表示位置がズレるため） */
function isTouchUA(){
  return window.matchMedia('(hover:none)').matches;
}



/* ─── ローダー制御 ─── */
const loader = document.getElementById('loader');
let isLoading = true;
const skipOpening = new URLSearchParams(window.location.search).get('works') === '1';
let openingStarted = false;

/*
  ローダーは最初から表示状態で、パスワード画面の裏に待機させる。
  パスワード画面が消える瞬間に、ドット背景が一瞬見えるのを防ぐ。
*/
if(skipOpening){
  loader.style.display = 'none';
  document.body.classList.add('loaded');
  isLoading = false;
} else {
  /* パスワード画面の背面でローダー背景だけを表示 */
  loader.style.display = 'flex';
  loader.style.visibility = 'visible';
  loader.style.opacity = '1';

  const loaderLogo = loader.querySelector('.ld-logo-box');

  if(loaderLogo){
    /* 認証前はロゴだけ隠す */
    loaderLogo.style.visibility = 'hidden';
    loaderLogo.style.animation = 'none';
  }
}

/* 指定ミリ秒待つための関数 */
function wait(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

/*
  パスワード認証後に実行するオープニング
*/
async function startOpeningSequence(){
  if(openingStarted) return;

  openingStarted = true;

  /* Works一覧へ直接アクセスした場合はオープニングなし */
  if(skipOpening){
    loader.style.display = 'none';
    document.body.classList.add('loaded');
    isLoading = false;
    return;
  }

  /* ページの読み込み完了を待つ */
  if(document.readyState !== 'complete'){
    await new Promise(resolve => {
      window.addEventListener('load', resolve, { once:true });
    });
  }

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  /* オープニング中は最上部を維持し続ける */
  forceScrollTop(2000);

  /*
    ローダーはパスワード画面の背面で既に表示済み。
    ここでロゴだけを表示・再アニメーションする。
  */
  loader.style.display = 'flex';
  loader.style.visibility = 'visible';
  loader.style.opacity = '1';
  loader.classList.remove('done');

  const loaderLogo = loader.querySelector('.ld-logo-box');

  if(loaderLogo){
    loaderLogo.style.visibility = 'visible';
    loaderLogo.style.animation = 'none';

    /* 強制的に再描画してアニメーションを最初から実行 */
    void loaderLogo.offsetWidth;

    loaderLogo.style.animation = '';
  }

  /* ロゴを見せる時間 */
  await wait(1000);

  loader.classList.add('done');
  document.body.classList.add('loaded');

  /* ローダーフェードアウト完了を待つ */
  await wait(500);

  loader.style.display = 'none';

  isLoading = false;

  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';

  /* 解除直後の位置ズレを打ち消す */
  updateNavPinMode();
  hardScrollTop();

  /* 端末によってはバーの高さ確定が遅れるので、少し後にもう一度 */
  setTimeout(hardScrollTop, 120);
  setTimeout(hardScrollTop, 400);
}

/* ─── カスタムカーソル ─── */
const cur = document.getElementById('cur');

let mx = 0;
let my = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;
  cur.style.left = mx + 'px';
  cur.style.top = my + 'px';
});

document.querySelectorAll('a,button,.wa-card,.nav-logo,.playful').forEach(el => {
  el.addEventListener('mouseenter', () => cur.classList.add('expanded'));
  el.addEventListener('mouseleave', () => cur.classList.remove('expanded'));
});

/* ─── ナビ制御 ─── */
const navFixed = document.getElementById('navFixed');
const topSec = document.getElementById('top');

const getSecs = () => [...document.querySelectorAll('section')];
const isMobile = () => window.innerWidth <= 900;

new IntersectionObserver(entries => {
  entries.forEach(e => {
    if(e.target.id === 'top' && !isMobile()){
      if(worksAll.classList.contains('open')) return;

      if(e.isIntersecting && e.intersectionRatio > 0.5){
        navFixed.classList.remove('show');
      } else {
        navFixed.classList.add('show');
      }
    }
  });
}, {
  threshold:[0,.5,1]
}).observe(topSec);

if(isMobile()) navFixed.classList.add('show');

window.addEventListener('resize', () => {
  if(isMobile()) navFixed.classList.add('show');
});

new IntersectionObserver(entries => {
  entries.forEach(e => {
    document.body.classList.toggle(
      'in-contact',
      e.isIntersecting && e.intersectionRatio > 0.3
    );
  });
}, {
  threshold:[0,.3,1]
}).observe(document.getElementById('contact'));

/* ─── ハンバーガーメニュー ─── */
const ham = document.getElementById('ham');
const mob = document.getElementById('mobMenu');

ham.addEventListener('click', () => {
  const isOpen = mob.classList.toggle('open');
  ham.classList.toggle('open', isOpen);
});

function closeMob(){
  mob.classList.remove('open');
  ham.classList.remove('open');
}

document.getElementById('navLogoBtn').addEventListener('click', () => {
  if(worksAll && worksAll.classList.contains('open')){
    worksAll.classList.remove('open');
    document.body.style.overflow = '';
    document.body.classList.remove('works-open');

    if(!isMobile()){
      navFixed.classList.remove('show');
    }
  }

  snapTo(topSec.offsetTop);
});

/* ─── スクロールスナップ ─── */
const htmlEl = document.documentElement;
const SNAP_DUR = 820;

const eie = t => {
  if(t === 0) return 0;
  if(t === 1) return 1;
  return t < .5
    ? Math.pow(2,20 * t - 10) / 2
    : (2 - Math.pow(2,-20 * t + 10)) / 2;
};

function nearest(scrollTop, dir){
  const sections = getSecs();

  if(dir > 0){
    for(const sec of sections){
      if(sec.offsetTop > scrollTop + 60){
        return sec.offsetTop;
      }
    }

    return sections[sections.length - 1].offsetTop;
  }

  for(let i = sections.length - 1; i >= 0; i--){
    if(sections[i].offsetTop < scrollTop - 60){
      return sections[i].offsetTop;
    }
  }

  return 0;
}

let snapping = false;

function snapTo(y, dur = SNAP_DUR){
  if(snapping) return;

  snapping = true;

  const startY = htmlEl.scrollTop;
  const distance = y - startY;

  if(Math.abs(distance) < 4){
    snapping = false;
    return;
  }

  const startTime = performance.now();

  (function step(now){
    const progress = Math.min((now - startTime) / dur, 1);

    htmlEl.scrollTop = startY + distance * eie(progress);

    /* 同一フレーム内でナビ位置も更新＝1フレームもズレない */
    pinNavOnce();

    if(progress < 1){
      requestAnimationFrame(step);
    } else {
      htmlEl.scrollTop = y;
      snapping = false;

      pinNavOnce();

      /* iOSはスクロール停止後にバー高さが確定するので追い打ちで補正 */
      pinNavFor(800);
    }
  })(performance.now());
}

let wheelAmount = 0;
let wheelTimer = null;

htmlEl.addEventListener('wheel', e => {
  if(worksAll.classList.contains('open')) return;

  e.preventDefault();

  if(snapping) return;

  wheelAmount += e.deltaY;

  clearTimeout(wheelTimer);

  wheelTimer = setTimeout(() => {
    if(Math.abs(wheelAmount) < 18){
      wheelAmount = 0;
      return;
    }

    const direction = wheelAmount > 0 ? 1 : -1;

    wheelAmount = 0;

    snapTo(nearest(htmlEl.scrollTop, direction));
  }, 3);
}, {
  passive:false
});

let touchStartY = 0;
let touchStartScroll = 0;

const isTouchDevice = () => window.matchMedia('(hover:none)').matches;

htmlEl.addEventListener('touchstart', e => {
  if(isLoading) return;
  if(worksAll.classList.contains('open')) return;
  if(!isTouchDevice()) return;

  touchStartY = e.touches[0].clientY;
  touchStartScroll = htmlEl.scrollTop;
}, {
  passive:false
});

htmlEl.addEventListener('touchmove', e => {
  if(isLoading){
    e.preventDefault();
    return;
  }

  if(worksAll.classList.contains('open')) return;
  if(!isTouchDevice()) return;

  e.preventDefault();
}, {
  passive:false
});

htmlEl.addEventListener('touchend', e => {
  if(isLoading) return;
  if(worksAll.classList.contains('open')) return;
  if(!isTouchDevice()) return;
  if(snapping) return;

  const deltaY = touchStartY - e.changedTouches[0].clientY;

  if(Math.abs(deltaY) < 30) return;

  snapTo(nearest(touchStartScroll, deltaY > 0 ? 1 : -1));
}, {
  passive:true
});

document.querySelectorAll('.top-nav a, .cf-links a').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');

    if(!href || !href.startsWith('#')) return;

    e.preventDefault();

    const target = document.querySelector(href);

    if(target){
      snapTo(target.offsetTop);
    }
  });
});

document.querySelectorAll('.mob-link').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');

    if(!href || !href.startsWith('#')) return;

    e.preventDefault();

    closeMob();

    const target = document.querySelector(href);

    if(target){
      setTimeout(() => snapTo(target.offsetTop), 60);
    }
  });
});

/* ─── WORKS一覧オーバーレイ ─── */
const worksAll = document.getElementById('works-all');

function openWorksAll(){
  worksAll.classList.add('open');
  document.body.style.overflow = 'hidden';

  if(!isMobile()){
    navFixed.classList.add('show');
  }
}

document.getElementById('viewAllBtn').addEventListener('click', e => {
  e.preventDefault();
  openWorksAll();
});

document.getElementById('waBack').addEventListener('click', e => {
  e.preventDefault();

  worksAll.classList.remove('open');
  document.body.style.overflow = '';
  document.body.classList.remove('works-open');

  const worksSec = document.getElementById('works');

  if(worksSec){
    snapTo(worksSec.offsetTop);
  }

  if(!isMobile()){
    navFixed.classList.add('show');
  }
});

if(skipOpening){
  openWorksAll();
  document.documentElement.classList.remove('skip-opening');
  history.replaceState(null, '', location.pathname);
}

/* ─── スクロールリビール ─── */
const rvObs = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry, index) => {
    if(entry.isIntersecting){
      setTimeout(() => {
        entry.target.classList.add('vis');
      }, index * 80);

      observer.unobserve(entry.target);
    }
  });
}, {
  threshold:.15
});

document.querySelectorAll('.rv').forEach(el => rvObs.observe(el));

/* ─── Playfulテキスト ─── */
const playful = document.getElementById('playful');

if(playful){
  const sparkChars = ['✦','✧','＊','✦','◦','✺'];
  const playfulColors = ['#196ed2','#f04650','#f0eb50','#e6f0e1','#50f0d2'];

  let playfulIndex = -1;

  const burst = () => {
    playfulIndex = (playfulIndex + 1) % playfulColors.length;

    const color = playfulColors[playfulIndex];

    document.documentElement.style.setProperty('--accent', color);

    playful.style.setProperty('--playful-c', color);

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

    for(let i = 0; i < count; i++){
      const spark = document.createElement('span');

      spark.className = 'spark';
      spark.textContent = sparkChars[Math.floor(Math.random() * sparkChars.length)];
      spark.style.color = color;

      const x = rect.left + Math.random() * rect.width;
      const y = rect.top + Math.random() * rect.height;

      spark.style.left = x + 'px';
      spark.style.top = y + 'px';

      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 60;

      spark.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
      spark.style.setProperty('--dy', (Math.sin(angle) * distance - 30) + 'px');
      spark.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
      spark.style.fontSize = (10 + Math.random() * 8) + 'px';

      spark.style.transform = 'translate(-50%,-50%) scale(.4)';

      document.body.appendChild(spark);

      requestAnimationFrame(() => {
        spark.classList.add('fly');
      });

      setTimeout(() => spark.remove(), 1200);
    }
  };

  playful.addEventListener('click', burst);
}

/* ─── 背景ドットエフェクト ─── */
(() => {
  const canvas = document.getElementById('dotsCanvas');

  if(!canvas) return;

  const ctx = canvas.getContext('2d', {
    alpha:false
  });

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

  let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

  let width = 0;
  let height = 0;
  let stopTimer = null;

  const pointer = {
    x:-9999,
    y:-9999,
    tx:-9999,
    ty:-9999,
    strength:0,
    targetStrength:0
  };

  function resize(){
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  resize();

  window.addEventListener('resize', resize);

  function resetStopTimer(){
    pointer.targetStrength = 1;

    clearTimeout(stopTimer);

    stopTimer = setTimeout(() => {
      pointer.targetStrength = 0;
    }, STOP_DELAY);
  }

  window.addEventListener('mousemove', e => {
    pointer.tx = e.clientX;
    pointer.ty = e.clientY;

    if(pointer.x < -9000){
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
    }

    resetStopTimer();
  });

  window.addEventListener('mouseleave', () => {
    pointer.targetStrength = 0;
    clearTimeout(stopTimer);
  });

  window.addEventListener('touchstart', e => {
    const touch = e.touches[0];

    pointer.tx = touch.clientX;
    pointer.ty = touch.clientY;

    if(pointer.x < -9000){
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
    }

    resetStopTimer();
  }, {
    passive:true
  });

  window.addEventListener('touchmove', e => {
    const touch = e.touches[0];

    pointer.tx = touch.clientX;
    pointer.ty = touch.clientY;

    resetStopTimer();
  }, {
    passive:true
  });

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
      pointer.strength += (pointer.targetStrength - pointer.strength) * .1;
    } else {
      pointer.strength *= IDLE_DECAY;

      if(pointer.strength < .001){
        pointer.strength = 0;
      }
    }

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0,0,width,height);

    const px = pointer.x;
    const py = pointer.y;
    const strength = pointer.strength;
    const influenceSq = INFLUENCE * INFLUENCE;

    ctx.fillStyle = DOT_COLOR;
    ctx.beginPath();

    let row = 0;

    for(let y = SPACING / 2; y < height; y += SPACING){
      const offset = row % 2 ? SPACING / 2 : 0;

      for(let x = SPACING / 2 + offset; x < width; x += SPACING){
        const dx = x - px;
        const dy = y - py;

        if(strength > .01 && (dx * dx + dy * dy) < influenceSq) continue;

        ctx.moveTo(x + BASE_RADIUS, y);
        ctx.arc(x,y,BASE_RADIUS,0,Math.PI * 2);
      }

      row++;
    }

    ctx.fill();

    if(strength > .01){
      let row2 = 0;

      for(let y = SPACING / 2; y < height; y += SPACING){
        const offset = row2 % 2 ? SPACING / 2 : 0;

        for(let x = SPACING / 2 + offset; x < width; x += SPACING){
          const dx = x - px;
          const dy = y - py;
          const distSq = dx * dx + dy * dy;

          if(distSq >= influenceSq) continue;

          const distance = Math.sqrt(distSq);

          let t = 1 - distance / INFLUENCE;

          t = t * t * (3 - 2 * t) * strength;

          const radius = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * t;

          ctx.fillStyle = t > .6 ? ACCENT_COLOR : DOT_COLOR;

          ctx.beginPath();
          ctx.arc(x,y,radius,0,Math.PI * 2);
          ctx.fill();
        }

        row2++;
      }
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();

/* ─── データ管理 ─── */
const DEFAULT_WORKS_DATA = [
  {
    cat:'Branding',
    items:[
      {
        id:'sotoya-rebrand',
        tag:'Branding',
        title:'SOTOYA リブランディング CI 開発',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      },
      {
        id:'sotoya-logo',
        tag:'Branding',
        title:'SOTOYA LOGO',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      },
      {
        id:'sotoya-web',
        tag:'Branding / Web',
        title:'SOTOYA WEB SITE',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      },
      {
        id:'sotoya-tools',
        tag:'Branding',
        title:'SOTOYA コーポレートツール',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      },
      {
        id:'ec-flame',
        tag:'Branding / EC',
        title:'EC SITE flame',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      }
    ]
  },
  {
    cat:'Web',
    items:[
      {
        id:'nasta-hp',
        tag:'Web',
        title:'Nasta HP',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      },
      {
        id:'nasta-post',
        tag:'Web',
        title:'Nasta Box +POST WEB SITE',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      },
      {
        id:'nasta-light',
        tag:'Web',
        title:'Nasta Box LIGHT WEB SITE',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      },
      {
        id:'nasta-amazon',
        tag:'Web / EC',
        title:'Nasta Interphone 2 Amazon page',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      },
      {
        id:'nasta-sns',
        tag:'SNS',
        title:'Nasta SNS クリエイティブ',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      }
    ]
  },
  {
    cat:'POP / Print media',
    items:[
      {
        id:'pamphlet',
        tag:'Print',
        title:'カテゴリ別 製品一覧パンフレット',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      },
      {
        id:'flyer-poster',
        tag:'Print',
        title:'各種販促チラシ・ポスター',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      }
    ]
  },
  {
    cat:'UI / UX',
    items:[
      {
        id:'box-admin',
        tag:'UI/UX',
        title:'宅配ボックス管理者用 WEB システム',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      },
      {
        id:'nasta-app',
        tag:'UI/UX',
        title:'Nasta Box APP',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      }
    ]
  },
  {
    cat:'Other',
    items:[
      {
        id:'nasta-mvv',
        tag:'Project',
        title:'Nasta MVV Project',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      },
      {
        id:'illusts',
        tag:'Illustration',
        title:'ILLUSTs',
        desc:'コンテンツこの文章はダミーです。文字の大きさ、量、字間、行間を確認するために入れています。'
      }
    ]
  }
];

let WORKS_DATA = DEFAULT_WORKS_DATA;
let SITE_PROFILE = { images: [] };
let SITE_LOGO = { src: '' };

/* CMS管理：TOPの作字SVG */
let SITE_TOP_TITLE = {
  shota: {
    src:'',
    type:''
  },
  inoue: {
    src:'',
    type:''
  }
};

/* CMS管理：サイト閲覧パスワード */
let SITE_ACCESS = {
  enabled:false,
  passwordHash:''
};

/* ─── IndexedDB ヘルパー ─── */
const _MAIN_IDB_NAME = 'portfolioCMS';
const _MAIN_IDB_VER = 1;
const _MAIN_IDB_STORE = 'store';

let _mainDb = null;

function _mainOpenDB(){
  if(_mainDb) return Promise.resolve(_mainDb);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(_MAIN_IDB_NAME, _MAIN_IDB_VER);

    request.onupgradeneeded = e => {
      e.target.result.createObjectStore(_MAIN_IDB_STORE);
    };

    request.onsuccess = e => {
      _mainDb = e.target.result;
      resolve(_mainDb);
    };

    request.onerror = e => reject(e.target.error);
  });
}

async function _mainIdbGet(key){
  try {
    const db = await _mainOpenDB();

    return await new Promise((resolve, reject) => {
      const request = db
        .transaction(_MAIN_IDB_STORE, 'readonly')
        .objectStore(_MAIN_IDB_STORE)
        .get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = e => reject(e.target.error);
    });
  } catch(e){
    return null;
  }
}

/* ─── SITE ACCESS ─── */
function normalizeSiteAccess(data){
  return {
    enabled: !!(data && data.enabled),
    passwordHash: (data && data.passwordHash) ? data.passwordHash : ''
  };
}

async function sha256(value){
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);

  return [...new Uint8Array(hashBuffer)]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
}

async function initSiteAccessGate(){
  const gate = document.getElementById('siteAccessGate');
  const form = document.getElementById('siteAccessForm');
  const input = document.getElementById('siteAccessPassword');
  const error = document.getElementById('siteAccessError');
  const toggle = document.querySelector('.site-access-toggle');

  return new Promise(resolve => {
    if(!gate || !form || !input){
      unlockPageScroll();
      resolve();
      return;
    }

    let isClosed = false;

    /* SHOW / HIDE ボタン */
    if(toggle){
      toggle.addEventListener('click', () => {
        const isVisible = input.type === 'text';

        input.type = isVisible ? 'password' : 'text';

        toggle.textContent = isVisible ? '表示' : '非表示';
        toggle.classList.toggle('is-visible', !isVisible);
        toggle.setAttribute('aria-pressed', String(!isVisible));
        toggle.setAttribute(
          'aria-label',
          isVisible ? 'パスワードを表示' : 'パスワードを隠す'
        );

        input.focus({ preventScroll:true });
      });
    }

    const closeGate = (withAnimation = true) => {
      if(isClosed) return;

      isClosed = true;

      gate.classList.add('is-hidden');
      gate.setAttribute('aria-hidden', 'true');

       const finish = () => {
        gate.style.display = 'none';

        /* キーボードを確実に閉じてからロック解除＆最上部へ */
        try{ input.blur(); }catch(e){}

        unlockPageScroll();

        /* キーボードが閉じ切るタイミングで再度最上部へ */
        setTimeout(() => {
          updateNavPinMode();
          hardScrollTop();
        }, 400);

        setTimeout(hardScrollTop, 800);

        resolve();
      };

      if(withAnimation){
        setTimeout(finish, 450);
      } else {
        finish();
      }
    };

    /* CMSでパスワード保護がOFFの場合 */
    if(!SITE_ACCESS.enabled || !SITE_ACCESS.passwordHash){
      document.documentElement.classList.remove('access-session-hint');
      closeGate(false);
      return;
    }

    /* 同タブで認証済みならゲートを表示せずに進む */
    try {
      const savedHash = sessionStorage.getItem('portfolioAccessHash');

      if(savedHash === SITE_ACCESS.passwordHash){
        closeGate(false);
        return;
      }
    } catch(e){}

    /* ここからパスワード画面を表示 */
    document.documentElement.classList.remove('access-session-hint');

    lockPageScroll();

    gate.classList.remove('is-hidden');
    gate.style.display = 'flex';
    gate.setAttribute('aria-hidden', 'false');

     /* SPは自動フォーカスしない（キーボードで表示位置がズレるため） */
    if(!isTouchUA()){
      setTimeout(() => {
        input.focus({ preventScroll:true });
      }, 80);
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();

      const submit = form.querySelector('.site-access-submit');
      const password = input.value;

      error.textContent = '';

      if(!password){
        error.textContent = 'パスワードを入力してください。';
        input.focus({ preventScroll:true });
        return;
      }

      try {
        submit.disabled = true;
        submit.textContent = 'CHECKING...';

        const inputHash = await sha256(password);

        if(inputHash !== SITE_ACCESS.passwordHash){
          error.textContent = 'パスワードが正しくありません。';

          input.value = '';
          input.type = 'password';

          if(toggle){
            toggle.textContent = '表示';
            toggle.classList.remove('is-visible');
            toggle.setAttribute('aria-pressed', 'false');
            toggle.setAttribute('aria-label', 'パスワードを表示');
          }

          input.focus({ preventScroll:true });

          submit.disabled = false;
          submit.textContent = 'ENTER';

          return;
        }

        /* 正しいハッシュを同タブ内に保存 */
        try {
          sessionStorage.setItem(
            'portfolioAccessHash',
            SITE_ACCESS.passwordHash
          );
        } catch(e){}

        closeGate(true);

      } catch(err){
        console.error(err);

        error.textContent =
          '認証処理に失敗しました。ページを再読み込みしてください。';

        submit.disabled = false;
        submit.textContent = 'ENTER';
      }
    });
  });
}

/* ─── CMS / data.json データ読込 ─── */
async function loadSiteData(){
  const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';

  /* CMS Preview */
  if(isPreview){
    try {
      const works = await _mainIdbGet('worksData');
      const profile = await _mainIdbGet('profileData');
      const logo = await _mainIdbGet('logoData');
      const homeBg = await _mainIdbGet('homeBgData');
      const topTitle = await _mainIdbGet('topTitleData');
      const siteAccess = await _mainIdbGet('siteAccessData');

      if(works) WORKS_DATA = works;
      if(profile) SITE_PROFILE = profile;
      if(logo) SITE_LOGO = logo;
      if(homeBg) window._SITE_HOMEBG = homeBg;
      if(topTitle) SITE_TOP_TITLE = topTitle;

      SITE_ACCESS = normalizeSiteAccess(siteAccess);
    } catch(e){}

    if(!WORKS_DATA || WORKS_DATA === DEFAULT_WORKS_DATA){
      try {
        const worksRaw = localStorage.getItem('worksData');
        const profileRaw = localStorage.getItem('profileData');
        const logoRaw = localStorage.getItem('logoData');
        const homeBgRaw = localStorage.getItem('homeBgData');
        const topTitleRaw = localStorage.getItem('topTitleData');
        const siteAccessRaw = localStorage.getItem('siteAccessData');

        if(worksRaw) WORKS_DATA = JSON.parse(worksRaw);
        if(profileRaw) SITE_PROFILE = JSON.parse(profileRaw);
        if(logoRaw) SITE_LOGO = JSON.parse(logoRaw);
        if(homeBgRaw) window._SITE_HOMEBG = JSON.parse(homeBgRaw);
        if(topTitleRaw) SITE_TOP_TITLE = JSON.parse(topTitleRaw);

        if(siteAccessRaw){
          SITE_ACCESS = normalizeSiteAccess(JSON.parse(siteAccessRaw));
        }
      } catch(e){}
    }

    applyLogo();
    applyTopTitle();

    return;
  }

  /* 本番：data.json */
  try {
    const response = await fetch('data.json', {
      cache:'no-cache'
    });

    if(response.ok){
      const json = await response.json();

      if(json.works) WORKS_DATA = json.works;
      if(json.profile) SITE_PROFILE = json.profile;
      if(json.logo) SITE_LOGO = json.logo;
      if(json.homeBg) window._SITE_HOMEBG = json.homeBg;
      if(json.topTitle) SITE_TOP_TITLE = json.topTitle;

      SITE_ACCESS = normalizeSiteAccess(json.siteAccess);

      applyLogo();
      applyTopTitle();

      return;
    }
  } catch(e){}

  /* data.jsonがない場合：IndexedDB */
  try {
    const works = await _mainIdbGet('worksData');
    const profile = await _mainIdbGet('profileData');
    const logo = await _mainIdbGet('logoData');
    const homeBg = await _mainIdbGet('homeBgData');
    const topTitle = await _mainIdbGet('topTitleData');
    const siteAccess = await _mainIdbGet('siteAccessData');

    if(works) WORKS_DATA = works;
    if(profile) SITE_PROFILE = profile;
    if(logo) SITE_LOGO = logo;
    if(homeBg) window._SITE_HOMEBG = homeBg;
    if(topTitle) SITE_TOP_TITLE = topTitle;

    SITE_ACCESS = normalizeSiteAccess(siteAccess);
  } catch(e){}

  /* IndexedDBがない場合：localStorage */
  if(!WORKS_DATA || WORKS_DATA === DEFAULT_WORKS_DATA){
    try {
      const worksRaw = localStorage.getItem('worksData');
      const profileRaw = localStorage.getItem('profileData');
      const logoRaw = localStorage.getItem('logoData');
      const homeBgRaw = localStorage.getItem('homeBgData');
      const topTitleRaw = localStorage.getItem('topTitleData');
      const siteAccessRaw = localStorage.getItem('siteAccessData');

      if(worksRaw) WORKS_DATA = JSON.parse(worksRaw);
      if(profileRaw) SITE_PROFILE = JSON.parse(profileRaw);
      if(logoRaw) SITE_LOGO = JSON.parse(logoRaw);
      if(homeBgRaw) window._SITE_HOMEBG = JSON.parse(homeBgRaw);
      if(topTitleRaw) SITE_TOP_TITLE = JSON.parse(topTitleRaw);

      if(siteAccessRaw){
        SITE_ACCESS = normalizeSiteAccess(JSON.parse(siteAccessRaw));
      }
    } catch(e){}
  }

  applyLogo();
  applyTopTitle();
}

/* ─── ロゴ適用 ─── */
function applyLogo(){
  if(!SITE_LOGO || !SITE_LOGO.src) return;

  const src = SITE_LOGO.src;

  document.querySelectorAll('.nav-logo, .footer-logo, .ld-logo-box').forEach(el => {
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

/* ─── TOP作字 SVG 適用 ─── */
function applyTopTitle(){
  const titleAssets = [
    {
      key:'shota',
      imageId:'topTitleShota'
    },
    {
      key:'inoue',
      imageId:'topTitleInoue'
    }
  ];

  titleAssets.forEach(({ key, imageId }) => {
    const image = document.getElementById(imageId);

    if(!image) return;

    const line = image.closest('.top-title-line');

    const fallback = line
      ? line.querySelector('.top-title-fallback')
      : null;

    const asset = SITE_TOP_TITLE && SITE_TOP_TITLE[key];

    /* CMSに画像が登録済み */
    if(asset && asset.src){
      image.src = asset.src;
      image.classList.add('has-art');

      if(fallback){
        fallback.classList.add('is-hidden');
        fallback.setAttribute('aria-hidden', 'true');
      }
    }

    /* 未登録時は既存テキストを表示 */
    else {
      image.removeAttribute('src');
      image.classList.remove('has-art');

      if(fallback){
        fallback.classList.remove('is-hidden');
        fallback.removeAttribute('aria-hidden');
      }
    }
  });
}

/* ─── WORKS背景 ─── */
function applyWorksBg(){
  let sources = [];

  if(
    window._SITE_HOMEBG &&
    window._SITE_HOMEBG.images &&
    window._SITE_HOMEBG.images.length
  ){
    sources = window._SITE_HOMEBG.images.map(item => item.src);
  } else {
    WORKS_DATA.forEach(group => {
      group.items.forEach(item => {
        if(item.images && item.images[0]){
          sources.push(item.images[0].src);
        }
      });
    });
  }

  if(sources.length === 0) return;

  const rows = document.querySelectorAll('.works-bg-row');

  const rowSources = sources.length > 1
    ? [
        sources.filter((_, index) => index % 2 === 0),
        sources,
        sources.filter((_, index) => index % 2 === 1)
      ]
    : [
        sources,
        sources,
        sources
      ];

  rows.forEach((row, rowIndex) => {
    const set = rowSources[rowIndex] && rowSources[rowIndex].length
      ? rowSources[rowIndex]
      : sources;

    row.querySelectorAll('.works-bg-cell').forEach((cell, index) => {
      const src = set[index % set.length];

      cell.style.backgroundImage = `url("${src}")`;
      cell.style.backgroundSize = 'cover';
      cell.style.backgroundPosition = 'center';

      cell.classList.add('has-img');
    });
  });
}

/* ─── WORKS一覧 ─── */
function renderWorksList(){
  const waGrid = document.getElementById('waGridContainer');

  waGrid.innerHTML = '';

  WORKS_DATA.forEach(group => {
    const category = document.createElement('div');

    category.className = 'wa-category';

    category.innerHTML = `
      <div class="wa-cat-label wa-fade">${group.cat}</div>
      <div class="wa-grid"></div>
    `;

    const grid = category.querySelector('.wa-grid');

    group.items.forEach(item => {
      const card = document.createElement('div');

      card.className = 'wa-card wa-fade';
      card.dataset.id = item.id;

      const thumbSrc = item.images && item.images[0]
        ? item.images[0].src
        : null;

      const thumbType = item.images && item.images[0]
        ? item.images[0].type || ''
        : '';

      const isVideo = thumbType.startsWith('video/');

      const imageHtml = thumbSrc
        ? (
            isVideo
              ? `<video src="${thumbSrc}" muted loop playsinline autoplay style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>`
              : `<img src="${thumbSrc}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
          )
        : `<div class="wa-card-img-ph"></div>`;

      card.innerHTML = `
        <div class="wa-card-img">${imageHtml}</div>
        <div class="wa-card-body">
          <div class="wa-card-title">${item.title}</div>
          <div class="wa-card-desc">${item.desc || ''}</div>
        </div>
        <div class="wa-card-arrow"></div>
      `;

      grid.appendChild(card);
    });

    waGrid.appendChild(category);
  });

  const fadeObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, {
    root:document.querySelector('.wa-body'),
    threshold:.12
  });

  document.querySelectorAll('.wa-fade').forEach(el => fadeObserver.observe(el));

  const isHoverPC = () => {
    return window.matchMedia('(hover:hover) and (min-width:901px)').matches;
  };

  const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === '1';

  document.querySelectorAll('.wa-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;

      const detailUrl = `detail.html?id=${id}${isPreviewMode ? '&preview=1' : ''}`;

      if(isHoverPC()){
        window.location.href = detailUrl;
        return;
      }

      if(card.classList.contains('active')){
        window.location.href = detailUrl;
      } else {
        document
          .querySelectorAll('.wa-card.active')
          .forEach(activeCard => activeCard.classList.remove('active'));

        card.classList.add('active');
      }
    });
  });
}

/* ─── PROFILEスライド ─── */
function renderProfileSlideshow(){
  const images = SITE_PROFILE.images || [];

  if(images.length === 0) return;

  const targets = [
    'profileBgPC',
    'profileBgSP'
  ]
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

  if(images.length > 1){
    let index = 0;

    setInterval(() => {
      index = (index + 1) % images.length;

      targets.forEach(target => {
        const slides = target.querySelectorAll('.profile-slide');

        slides.forEach((slide, slideIndex) => {
          slide.classList.toggle('active', slideIndex === index);
        });
      });
    }, 4000);
  }
}

/* ─── 初期化 ─── */
(async () => {
  /* data.json / CMSの設定を読み込む */
  await loadSiteData();

  /*
    パスワード認証を待つ。
    正しいパスワードを入れるまで、この次へ進まない。
  */
  await initSiteAccessGate();

  /* パスワード通過後にページ内容を構築 */
  renderWorksList();
  renderProfileSlideshow();
  applyWorksBg();

  /* レイアウト確定後にナビ位置を合わせる */
  updateNavPinMode();

  /* 最後にオープニングアニメーションを開始 */
  await startOpeningSequence();

  /* 画像読み込み完了で高さが変わる場合に備えて最終補正 */
  window.addEventListener('load', () => {
    updateNavPinMode();
    pinNavFor(600);
  });
})();

document.querySelector('.wa-body').addEventListener('click', e => {
  if(!e.target.closest('.wa-card')){
    document
      .querySelectorAll('.wa-card.active')
      .forEach(card => card.classList.remove('active'));
  }
});