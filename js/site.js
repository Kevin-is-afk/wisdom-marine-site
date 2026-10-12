/* Wisdom Marine: page behaviour.

   scrollcraft/scrollcraft.js supplies the pinning, the pan rail, the wipe and
   the fade-ins. This file adds the two bespoke choreographies:

     REEL   hero tile > full-bleed panel > service wheel
     DRIFT  tilted commitment cards passing behind a pinned heading

   Both are driven by scroll progress through a pinned act, and both eased:
   the value the page renders is a smoothed copy of the real scroll progress,
   so the motion glides instead of stepping with each wheel notch. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var ease = function (t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  if (window.ScrollCraft) window.ScrollCraft.mount(document.body);

  /* ---------------------------------------------------------- nav drawer -- */
  var toggle = $('#nav-toggle');
  var links = $('#primary-nav');
  function setNav(open) {
    links.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () { setNav(toggle.getAttribute('aria-expanded') !== 'true'); });
  links.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setNav(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', function () { setNav(false); });

  /* --------------------------------------------------- pinned act progress -- */
  function actProgress(el) {
    var r = el.getBoundingClientRect();
    var travel = Math.max(r.height - window.innerHeight, 1);
    return clamp(-r.top / travel, 0, 1);
  }
  function scrollToProgress(el, p) {
    var r = el.getBoundingClientRect();
    var travel = r.height - window.innerHeight;
    window.scrollTo({ top: window.scrollY + r.top + p * travel, behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ------------------------------------------------------------------ REEL -- */
  var reel = $('#top');
  var R = {
    stage: $('.reel__stage'), tile: $('[data-reel-tile]'), panel: $('[data-reel-panel]'),
    media: $('[data-reel-media]'), scrim: $('[data-reel-scrim]'),
    title: $('[data-reel-title]'), fades: $$('[data-reel-fade]'),
    wheel: $('[data-reel-wheel]'), list: $('[data-reel-list]'),
    items: $$('[data-reel-list] li'), layers: $$('.reel__layer'),
    details: $$('[data-detail]'), chips: $$('[data-chip]')
  };
  var N = R.items.length;                       // 9 services
  var WHEEL_START = 0.36, WHEEL_END = 0.94;     // progress window where the wheel turns
  var BOUNDS = [2.5, 4.5, 6.5];                 // where the discipline (background) changes
  var geo = null, item = 72, group = -1, chip = -1, wasLive = false;
  var layerState = [false, false, false, false];

  function measureReel() {
    var W = R.stage.clientWidth, H = R.stage.clientHeight;
    var sr = R.stage.getBoundingClientRect(), tr = R.tile.getBoundingClientRect();
    var headerH = 64;
    geo = {
      W: W, H: H,
      t: { x: tr.left - sr.left, y: tr.top - sr.top, w: tr.width, h: tr.height },
      e: { x: 12, y: headerH + 12, w: W - 24, h: H - headerH - 24 }
    };
    item = R.items[0].offsetHeight || 72;
  }

  function setVideo(i, on) {
    if (layerState[i] === on) return;
    layerState[i] = on;
    var v = R.layers[i].querySelector('video');
    if (!v || !v.getAttribute('src')) return;         // placeholder: nothing to play yet
    if (on) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } else v.pause();
  }

  function renderReel(p) {
    if (!geo) return;
    var W = geo.W, H = geo.H, t = geo.t, e0 = geo.e;

    /* 1. tile grows into the panel */
    var e = ease(p / 0.2);
    var x = lerp(t.x, e0.x, e), y = lerp(t.y, e0.y, e), w = lerp(t.w, e0.w, e), h = lerp(t.h, e0.h, e);
    R.panel.style.clipPath = 'inset(' + y.toFixed(1) + 'px ' + (W - x - w).toFixed(1) + 'px ' + (H - y - h).toFixed(1) + 'px ' + x.toFixed(1) + 'px round ' + lerp(16, 12, e).toFixed(1) + 'px)';
    var s0 = Math.max(t.w / W, t.h / H);
    var s = lerp(s0, 1, e);
    var cx = lerp(t.x + t.w / 2, W / 2, e), cy = lerp(t.y + t.h / 2, H / 2, e);
    R.media.style.transform = 'translate3d(' + (cx - W / 2).toFixed(1) + 'px,' + (cy - H / 2).toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
    R.scrim.style.opacity = e.toFixed(3);

    /* 2. supporting copy leaves while the headline turns white */
    var f = clamp(e * 2.4, 0, 1);
    R.fades.forEach(function (el) {
      el.style.opacity = (1 - f).toFixed(3);
      el.style.transform = 'translate3d(0,' + (-14 * f).toFixed(1) + 'px,0)';
      el.style.visibility = f >= 0.99 ? 'hidden' : 'visible';
    });
    R.stage.style.setProperty('--k', smooth((e - 0.35) / 0.45).toFixed(3));

    /* 3. headline hands over to the wheel */
    var out = smooth((p - 0.27) / 0.07);
    R.title.style.opacity = (1 - out).toFixed(3);
    R.title.style.transform = 'translate3d(0,' + (-34 * out).toFixed(1) + 'px,0)';
    var wIn = smooth((p - 0.29) / 0.08);
    R.wheel.style.opacity = wIn.toFixed(3);
    R.wheel.style.visibility = wIn < 0.01 ? 'hidden' : 'visible';
    var live = wIn > 0.6;
    if (live !== wasLive) { R.panel.classList.toggle('is-live', live); wasLive = live; }

    /* 4. the wheel: a continuous position, never a step */
    var pos = clamp((p - WHEEL_START) / (WHEEL_END - WHEEL_START), 0, 1) * (N - 1);
    R.list.style.transform = 'translate3d(0,' + (-pos * item).toFixed(2) + 'px,0)';
    for (var i = 0; i < N; i++) {
      var d = Math.abs(i - pos);
      R.items[i].style.opacity = clamp(1 - 0.5 * d, 0.14, 1).toFixed(3);
    }

    /* 5. background per discipline: later layers fade in over earlier ones */
    for (var g = 1; g < 4; g++) {
      var o = smooth((pos - (BOUNDS[g - 1] - 0.35)) / 0.7);
      R.layers[g].style.opacity = o.toFixed(3);
      setVideo(g, o > 0.5 && (g === 3 || smooth((pos - (BOUNDS[g] - 0.35)) / 0.7) < 0.5) && wIn > 0.3);
    }
    setVideo(0, pos < BOUNDS[0] || wIn < 0.3);

    /* 6. detail text follows the nearest service */
    var near = Math.round(pos);
    var gnow = near < 3 ? 0 : near < 5 ? 1 : near < 7 ? 2 : 3;
    if (gnow !== group) {
      group = gnow;
      R.details.forEach(function (d2, k) { d2.classList.toggle('is-on', k === gnow); });
    }
    if (near !== chip) {
      chip = near;
      R.chips.forEach(function (c) { c.classList.toggle('is-active', Number(c.getAttribute('data-chip')) === near); });
    }
  }

  R.list.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-item]');
    if (!b) return;
    var i = Number(b.getAttribute('data-item'));
    scrollToProgress(reel, WHEEL_START + (i / (N - 1)) * (WHEEL_END - WHEEL_START) + 0.002);
  });

  /* ----------------------------------------------------------------- DRIFT -- */
  var drift = $('#promise');
  var D = { stage: $('.drift__stage'), cards: $$('.perk', drift) };
  var dgeo = null;
  function measureDrift() {
    var vw = D.stage.clientWidth;
    var cw = D.cards[0].offsetWidth || 300;
    var gap = vw < 768 ? 36 : 84;
    dgeo = { vw: vw, cw: cw, G: cw + gap };
  }
  function renderDrift(p) {
    if (!dgeo) return;
    var n = D.cards.length, vw = dgeo.vw, G = dgeo.G;
    var L = (vw + (n - 1) * G + dgeo.cw) / 0.9;
    D.cards.forEach(function (c, i) {
      var rot = Number(c.getAttribute('data-drift')) || 0;
      var dy = Number(c.getAttribute('data-drift-y')) || 0;
      var speed = 1 + rot * 0.01;
      var x = vw + i * G - p * L * speed;
      var y = dy + (p - 0.5) * (dy > 0 ? -36 : 36);
      c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,calc(-50% + ' + y.toFixed(1) + 'px),0) rotate(' + (rot + (p - 0.5) * 3).toFixed(2) + 'deg)';
    });
  }

  /* -------------------------------------------------- one eased frame loop -- */
  var acts = [];
  function register(el, measure, render, rate) {
    acts.push({ el: el, measure: measure, render: render, rate: rate || 0.12, cur: actProgress(el), last: -1 });
  }
  var lastT = performance.now();
  function tick(now) {
    var dt = Math.min(64, now - lastT); lastT = now;
    var vh = window.innerHeight;
    acts.forEach(function (a) {
      var r = a.el.getBoundingClientRect();
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;          // off screen: do nothing
      var target = actProgress(a.el);
      if (Math.abs(target - a.cur) < 0.0003) a.cur = target;
      else a.cur += (target - a.cur) * (1 - Math.pow(1 - a.rate, dt / 16.7));
      if (a.cur !== a.last) { a.render(a.cur); a.last = a.cur; }
    });
    requestAnimationFrame(tick);
  }
  function remeasure() {
    acts.forEach(function (a) { a.measure(); a.last = -1; });
  }

  if (!reduce) {
    register(reel, measureReel, renderReel, 0.12);
    register(drift, measureDrift, renderDrift, 0.12);
    remeasure();
    acts.forEach(function (a) { a.cur = actProgress(a.el); a.render(a.cur); a.last = a.cur; });
    var rz = null;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(remeasure, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    window.addEventListener('load', remeasure);
    requestAnimationFrame(tick);
  }

  /* ---------------------------- "Services" jumps to where the wheel starts -- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#services"]');
    if (!a || reduce) return;
    e.preventDefault();
    scrollToProgress(reel, 0.4);
  });

  /* ------------------------------------- nav highlights the section in view */
  var navLinks = $$('a', links);
  var navMap = [['work', 'work'], ['about', 'about'], ['promise', 'about'], ['policies', 'policies'], ['contact', 'contact']];
  function markNav() {
    var vh = window.innerHeight, probe = vh * 0.4, current = null;
    var rr = reel.getBoundingClientRect();
    if (rr.top <= probe && rr.bottom > probe && actProgress(reel) > 0.36) current = 'services';
    navMap.forEach(function (m) {
      var r = document.getElementById(m[0]).getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) current = m[1];
    });
    navLinks.forEach(function (a) {
      if (a.getAttribute('href') === '#' + current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  var queued = false;
  window.addEventListener('scroll', function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; markNav(); });
  }, { passive: true });
  markNav();

  /* hero figure counts up once */
  var num = $('[data-hero-count]');
  if (num && !reduce) {
    var t0 = null;
    num.textContent = '0';
    requestAnimationFrame(function step(ts) {
      if (t0 === null) t0 = ts;
      var k = clamp((ts - t0) / 1100, 0, 1);
      num.textContent = String(Math.round(9 * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    });
  }

  /* ------------------------------------------------ policies: slow, smooth -- */
  /* <details> snaps open and shut on its own. Animate the body's height (and
     its bottom padding) instead, on a long ease-out, and keep the chevron in
     step. Clicks during a move are ignored so it can never get stuck half open. */
  var FAQ_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
  $$('.faq').forEach(function (d) {
    var sum = $('summary', d), body = $('.faq__body', d), busy = false;
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      if (busy) return;
      if (reduce) { d.open = !d.open; return; }
      var pad = getComputedStyle(body).paddingBottom;
      busy = true;
      if (!d.open) {
        d.open = true;
        var h = body.offsetHeight;
        body.animate(
          [{ height: '0px', paddingBottom: '0px', opacity: 0 }, { height: h + 'px', paddingBottom: pad, opacity: 1 }],
          { duration: 900, easing: FAQ_EASE }
        ).onfinish = function () { busy = false; };
      } else {
        var h2 = body.offsetHeight;
        d.classList.add('is-closing');
        body.animate(
          [{ height: h2 + 'px', paddingBottom: pad, opacity: 1 }, { height: '0px', paddingBottom: '0px', opacity: 0 }],
          { duration: 800, easing: FAQ_EASE }
        ).onfinish = function () { d.open = false; d.classList.remove('is-closing'); busy = false; };
      }
    });
  });

  /* -------------------------------------------------------------- enquiry -- */
  var form = $('#enquiry');
  var status = $('#form-status');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      status.setAttribute('data-state', 'error');
      status.textContent = 'Please fill in every field so we can reply.';
      return;
    }
    var d = new FormData(form);
    var body = 'Name: ' + d.get('name') + '\nEmail: ' + d.get('email') + '\n\n' + d.get('message');
    var url = 'mailto:operations@wisdommaritime.com?subject=' + encodeURIComponent('Quote request: ' + d.get('subject')) + '&body=' + encodeURIComponent(body);
    status.setAttribute('data-state', 'ok');
    status.textContent = 'Opening your email app. If nothing opens, write to operations@wisdommaritime.com.';
    window.location.href = url;
  });

  /* ---------------------------------------------- footer groups, by width -- */
  var mq = window.matchMedia('(min-width: 768px)');
  function footerGroups() { $$('.footer__group').forEach(function (d) { d.open = mq.matches; }); }
  mq.addEventListener('change', footerGroups); footerGroups();
  $$('.footer__group summary').forEach(function (s) {
    s.addEventListener('click', function (e) { if (mq.matches) e.preventDefault(); });
  });

  var yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();
})();
