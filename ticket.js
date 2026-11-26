/* RAY Lecture 2026 night: shared code for the guest and host pages.
   The API (Supabase RPC), the drinks, the e-coupon ticket and its tear. */
(function () {
  "use strict";

  const API = "https://srnsptrpeoylqzbtrtzj.supabase.co/rest/v1/rpc/";
  const KEY = "sb_publishable_XPe3PFNjFGHXqYwPA2AISw_J4oVnbs0";   // publishable: the functions check tokens and keys

  async function rpc(fn, args) {
    const r = await fetch(API + fn, {
      method: "POST", cache: "no-store",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify(args)
    });
    if (!r.ok) throw new Error("http " + r.status);
    return r.json();
  }

  // The bar's three drinks, coloured as on the paper coupons (Percy and the bar, 25 Nov 2026)
  const DRINKS = {
    1: { name: "Velvet Revolution", year: "1989", bg: "#000000", ink: "#ffffff", spark: "#ff5b3a",
         holes: "rgba(255,255,255,.75)", fiber: "rgba(255,255,255,.6)", liquid: "#3d3d3d", ice: false },
    2: { name: "Common Sense", year: "1776", bg: "#93600a", ink: "#ffffff", spark: "#ffb39f",
         holes: "rgba(255,255,255,.45)", fiber: "rgba(255,240,215,.75)", liquid: "#dba23a", ice: true },
    3: { name: "There’s Always Spring", year: "1968", bg: "#ffa8c4", ink: "#000000", spark: "#c2361b",
         holes: "rgba(0,0,0,.35)", fiber: "rgba(255,255,255,.95)", liquid: "#ff6a9a", ice: false, tag: "Mocktail" }
  };

  const pad2 = n => String(n).padStart(2, "0");
  const TZ = { timeZone: "Asia/Bangkok", hour12: false };
  const hhmm = iso => new Date(iso).toLocaleTimeString("en-GB", { ...TZ, hour: "2-digit", minute: "2-digit" });
  const hhmmss = d => d.toLocaleTimeString("en-GB", { ...TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function glassSVG(d, ink) {
    const cube = d.ice ? '<rect x="5.5" y="8.3" width="5" height="5" rx="0.55" transform="rotate(-9 8 10.8)"/>' : "";
    return '<svg class="glass" viewBox="1.6 5.35 12.8 15.55" aria-hidden="true">' +
      '<path d="M2.5 9.8 H13.5 V18.2 H2.5 Z" fill="' + d.liquid + '"/>' +
      '<g fill="none" stroke="' + ink + '" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M2.5 6.25 V20 H13.5 V6.25"/><path d="M2.5 18.2 H13.5"/><path d="M2.5 9.8 H13.5"/>' + cube + "</g></svg>";
  }

  // ---- the tear's sound: short bursts of filtered noise that follow the finger ----
  const audio = {
    ctx: null, buf: null,
    unlock() {
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          this.ctx = new AC();
          const len = this.ctx.sampleRate;               // one second of noise
          this.buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
          const ch = this.buf.getChannelData(0);
          for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.35);
        }
        if (this.ctx.state === "suspended") this.ctx.resume();
      } catch (e) { /* no sound is fine */ }
    },
    grain(level, ms) {
      if (!this.ctx || !this.buf || level <= 0) return;
      try {
        const t = this.ctx.currentTime, dur = (ms || 32) / 1000;
        const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        src.buffer = this.buf;
        f.type = "bandpass"; f.frequency.value = 1400 + Math.random() * 3200; f.Q.value = 0.9;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(Math.min(0.55, level), t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(f); f.connect(g); g.connect(this.ctx.destination);
        src.start(t, Math.random() * 0.9, dur + 0.02);
      } catch (e) { /* ignore */ }
    },
    rip() { for (let i = 0; i < 6; i++) setTimeout(() => this.grain(0.5 - i * 0.06, 45), i * 22); }
  };

  // ---- one ticket ----
  // coupon: {token, serial, drink, torn_at}; owner: the guest's name or null
  function ticketHTML(c, owner) {
    const d = DRINKS[c.drink];
    const dots = [];
    for (let i = 0; i < 40; i++) {
      const cx = 3 + i * (94 / 39);
      dots.push(i + 1 === c.serial
        ? '<circle class="lit" cx="' + cx.toFixed(2) + '%" cy="7" r="3.2" fill="' + d.spark + '"/>'
        : '<circle cx="' + cx.toFixed(2) + '%" cy="7" r="2.2" fill="' + d.holes + '"/>');
    }
    const ownerLine = owner
      ? '<div class="t-owner"><span>คูปองของ</span> <b>' + esc(owner) + "</b></div>"
      : '<div class="t-owner"><span>คูปองจากทีมงาน</span></div>';
    return '' +
      '<article class="ticket" data-drink="' + c.drink + '" data-token="' + esc(c.token) + '" data-serial="' + c.serial + '" ' +
      'style="--bg:' + d.bg + ";--ink:" + d.ink + ";--spark:" + d.spark + '">' +
      ' <div class="t-main">' +
      '  <div class="t-top"><span class="kicker">RAY LECTURE 2026</span><span class="live"><i></i><time class="clock">--:--:--</time></span></div>' +
      '  <div class="t-title"><div class="t1">ต้นทุน</div><div class="t2">ของการเปลี่ยนแปลง</div><div class="en">Cost of Revolution</div></div>' +
      ownerLine +
      '  <div class="t-when"><div class="date">ศุกร์ 27 พฤศจิกายน 2569</div><div class="venue">#OBSESSION.BKK</div></div>' +
      '  <div class="stamp" aria-live="polite"><b>ใช้แล้ว</b><small class="st-drink">#' + c.drink + " " + esc(d.name) + '</small><small class="st-time"></small></div>' +
      '  <svg class="fiber fiber-main" aria-hidden="true"><path fill="none" stroke="' + d.fiber + '" stroke-width="1.4"/></svg>' +
      " </div>" +
      ' <div class="t-stub">' +
      '  <svg class="perf" aria-hidden="true">' + dots.join("") + "</svg>" +
      '  <svg class="fiber fiber-stub" aria-hidden="true"><path fill="none" stroke="' + d.fiber + '" stroke-width="1.4"/></svg>' +
      '  <div class="s-row"><span class="serial">No. ' + pad2(c.serial) + "</span>" + (d.tag ? '<span class="pill">' + d.tag + "</span>" : "") + "</div>" +
      '  <div class="s-drink"><div class="s-text"><div class="s-no">#' + c.drink + '</div><div class="s-name">' + esc(d.name) + "</div></div>" + glassSVG(d, d.ink) + "</div>" +
      '  <div class="s-voucher"><div class="label">คูปองเครื่องดื่ม</div><div class="redeem">แลก 1 แก้ว</div></div>' +
      " </div>" +
      ' <div class="tear-zone" role="button" aria-label="ลากนิ้วตามรอยปรุเพื่อฉีกคูปอง"><span class="hint"></span></div>' +
      "</article>";
  }

  // A rough tear profile: depth in px (0.5-3.6) every 3 px, the same for one coupon every time
  function profile(seed, n) {
    let s = seed * 9301 + 49297;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const raw = [];
    for (let i = 0; i < n; i++) raw.push(0.5 + rnd() * 3.1 + (rnd() < 0.12 ? 1.4 : 0));
    return raw.map((v, i) => (v * 2 + (raw[i - 1] || v) + (raw[i + 1] || v)) / 4);
  }

  const R = 16, N = 11, STEP = 3;   // corner radius, notch radius, profile step (px)

  function mainPath(W, H, a, b, depth) {
    const pts = [];
    for (let x = W - N; x >= N; x -= STEP) {
      const y = x >= a && x <= b ? H - depth(x) : H;
      pts.push("L" + x.toFixed(1) + " " + y.toFixed(2));
    }
    return "M0 " + R + " A" + R + " " + R + " 0 0 1 " + R + " 0 L" + (W - R) + " 0 A" + R + " " + R + " 0 0 1 " + W + " " + R +
      " L" + W + " " + (H - N) + " A" + N + " " + N + " 0 0 0 " + (W - N) + " " + H + " " + pts.join(" ") +
      " L" + N + " " + H + " A" + N + " " + N + " 0 0 0 0 " + (H - N) + " Z";
  }

  function stubPath(W, H, a, b, depth) {
    const pts = [];
    for (let x = N; x <= W - N; x += STEP) {
      const y = x >= a && x <= b ? depth(x) : 0;
      pts.push("L" + x.toFixed(1) + " " + y.toFixed(2));
    }
    return "M0 " + N + " A" + N + " " + N + " 0 0 0 " + N + " 0 " + pts.join(" ") +
      " L" + (W - N) + " 0 A" + N + " " + N + " 0 0 0 " + W + " " + N +
      " L" + W + " " + (H - R) + " A" + R + " " + R + " 0 0 1 " + (W - R) + " " + H +
      " L" + R + " " + H + " A" + R + " " + R + " 0 0 1 0 " + (H - R) + " Z";
  }

  function fiberPath(W, a, b, depth, top, h) {
    if (b - a < 2) return "";
    const pts = [];
    for (let x = Math.max(a, N); x <= Math.min(b, W - N); x += STEP)
      pts.push((pts.length ? "L" : "M") + x.toFixed(1) + " " + (top ? depth(x) + 0.7 : h - depth(x) - 0.7).toFixed(2));
    return pts.join(" ");
  }

  /* Make one ticket element tearable. opts.tear(token) -> Promise<{ok, torn_at}> does the server's one-time tear.
     The staff member drags a finger along the perforation; the stub hangs, then falls away. */
  function mount(el, c, opts) {
    const main = el.querySelector(".t-main"), stub = el.querySelector(".t-stub"), zone = el.querySelector(".tear-zone");
    const fMain = el.querySelector(".fiber-main"), fStub = el.querySelector(".fiber-stub");
    const prof1 = profile(c.serial, 200), prof2 = profile(c.serial + 77, 200);
    const d1 = x => prof1[Math.min(prof1.length - 1, Math.round(x / STEP))];
    const d2 = x => prof2[Math.min(prof2.length - 1, Math.round(x / STEP))];
    let dir = 1, p = 0, st = null, raf = 0;

    function draw() {
      const W = main.offsetWidth, Hm = main.offsetHeight, Hs = stub.offsetHeight;
      el.style.setProperty("--main-h", Hm + "px");
      const torn = el.classList.contains("torn");
      const len = torn ? W : p * W;
      const a = dir === 1 ? 0 : W - len, b = dir === 1 ? len : W;
      main.style.clipPath = "path('" + mainPath(W, Hm, a, b, d1) + "')";
      fMain.setAttribute("viewBox", "0 0 " + W + " 8");
      fMain.querySelector("path").setAttribute("d", fiberPath(W, a, b, d1, false, 8));
      if (!torn) {
        stub.style.clipPath = "path('" + stubPath(W, Hs, a, b, d2) + "')";
        fStub.setAttribute("viewBox", "0 0 " + W + " 8");
        fStub.querySelector("path").setAttribute("d", fiberPath(W, a, b, d2, true, 8));
        stub.style.transformOrigin = dir === 1 ? "100% 0" : "0 0";
        stub.style.transform = p > 0 ? "translateY(" + (p * 3).toFixed(2) + "px) rotate(" + (-dir * p * 9).toFixed(3) + "deg)" : "";
      }
    }

    function setTorn(iso, animate) {
      el.classList.add("torn");
      el.querySelector(".stamp .st-time").textContent = "ฉีกเมื่อ " + hhmm(iso) + " น.";
      if (animate) el.classList.add("just");
      draw();
    }
    function setWhole() {
      el.classList.remove("torn", "just", "falling", "busy");
      stub.style.transition = ""; stub.style.opacity = "";
      p = 0; draw();
    }

    function springBack() {
      const p0 = p, t0 = performance.now();
      cancelAnimationFrame(raf);
      const step = now => {
        const k = Math.min(1, (now - t0) / 260), e = 1 - Math.pow(1 - k, 3);
        p = p0 * (1 - e); draw();
        if (k < 1) raf = requestAnimationFrame(step); else el.classList.remove("tearing");
      };
      raf = requestAnimationFrame(step);
    }

    async function complete() {
      st = null;
      el.classList.add("busy");
      audio.rip();
      if (navigator.vibrate) navigator.vibrate([12, 40, 22]);
      const server = opts.tear(c.token).catch(() => ({ ok: false, error: "net" }));
      // finish the tear, then let the stub drop
      const p0 = p, t0 = performance.now();
      await new Promise(res => {
        const step = now => {
          const k = Math.min(1, (now - t0) / 110);
          p = p0 + (1 - p0) * k; draw();
          if (k < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
      const W = main.offsetWidth;
      stub.style.transition = "transform 900ms cubic-bezier(.45,0,.9,.55), opacity 900ms ease-in";
      stub.style.transform = "translate(" + (-dir * W * 0.18).toFixed(0) + "px," + Math.round(window.innerHeight * 1.1) + "px) rotate(" + (-dir * 38) + "deg)";
      stub.style.opacity = "0.15";
      el.classList.add("falling");
      const [res] = await Promise.all([server, new Promise(r => setTimeout(r, 820))]);
      el.classList.remove("falling", "tearing");
      if (res && res.ok) {
        c.torn_at = res.torn_at;
        el.classList.remove("busy");
        setTorn(res.torn_at, true);
        if (opts.onTorn) opts.onTorn(c, res);
      } else {
        // the server did not record it: put the stub back and say so
        stub.style.transition = "transform 420ms cubic-bezier(.2,.8,.2,1), opacity 300ms";
        stub.style.transform = ""; stub.style.opacity = "";
        setTimeout(() => { stub.style.transition = ""; setWhole(); }, 430);
        if (opts.onError) opts.onError(res);
      }
    }

    zone.addEventListener("pointerdown", e => {
      if (el.classList.contains("torn") || el.classList.contains("busy")) return;
      e.preventDefault();
      try { zone.setPointerCapture(e.pointerId); } catch (_) { /* old browsers */ }
      cancelAnimationFrame(raf);
      const r = el.getBoundingClientRect(), x = e.clientX - r.left;
      st = { id: e.pointerId, left: r.left, W: r.width, x0: x, dir: x < r.width * 0.35 ? 1 : x > r.width * 0.65 ? -1 : 0, lx: x, lt: performance.now() };
      if (st.dir) dir = st.dir;
      audio.unlock();
      el.classList.add("tearing");
    });
    zone.addEventListener("pointermove", e => {
      if (!st || e.pointerId !== st.id) return;
      const x = e.clientX - st.left;
      if (!st.dir) {
        if (Math.abs(x - st.x0) < 10) return;
        st.dir = dir = x > st.x0 ? 1 : -1;
      }
      const span = st.dir === 1 ? st.W - st.x0 : st.x0;
      const moved = st.dir === 1 ? x - st.x0 : st.x0 - x;
      const np = Math.max(p, Math.min(1, moved / Math.max(span, st.W * 0.5)));
      const now = performance.now(), speed = Math.abs(x - st.lx) / Math.max(8, now - st.lt);
      if (np > p + 0.004) audio.grain(Math.min(0.5, 0.12 + speed * 0.35), 28 + Math.random() * 20);
      st.lx = x; st.lt = now;
      p = np; draw();
      if (p >= 0.9) complete();
    });
    const release = e => {
      if (!st || e.pointerId !== st.id) return;
      st = null;
      if (p > 0) springBack(); else el.classList.remove("tearing");
    };
    zone.addEventListener("pointerup", release);
    zone.addEventListener("pointercancel", release);
    window.addEventListener("resize", () => { if (!st) draw(); });

    if (c.torn_at) setTorn(c.torn_at, false); else draw();
    // fonts change the heights: draw again once they are in
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => draw());

    return {
      update(nc) {   // a newer state from the server (another device, or a host)
        if (el.classList.contains("busy") || st) return;
        if (nc.torn_at && !c.torn_at) { c.torn_at = nc.torn_at; setTorn(nc.torn_at, false); }
        else if (!nc.torn_at && c.torn_at) { c.torn_at = null; setWhole(); }
      }
    };
  }

  // a ticking clock on every ticket: a screenshot does not tick
  function startClocks() {
    const tick = () => {
      const t = hhmmss(new Date());
      document.querySelectorAll(".clock").forEach(n => { n.textContent = t; });
    };
    tick();
    setInterval(tick, 1000);
  }

  window.R27 = { rpc, DRINKS, esc, pad2, hhmm, hhmmss, ticketHTML, mount, startClocks, glassSVG };
})();
