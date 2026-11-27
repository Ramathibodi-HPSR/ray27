/* RAY Lecture 2026 night: the bar's page. bar.html#k=KEY
   A coupon torn on a guest's phone is an order. The bar sees what is waiting, by drink and in order,
   with the guest's name and coupon number, and marks each glass served (Percy, 27 Nov 2026, after the
   bar said bartenders could not see digital orders or tell who ordered which glass). */
(function () {
  "use strict";
  const { rpc, DRINKS, esc, pad2, hhmm, hhmmss } = window.R27;
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  // the bar's own link, kept on this device; a host already signed in on this phone can open it too
  const STORE = "ray27.bk";
  let key = new URLSearchParams(location.hash.slice(1)).get("k") || "";
  try {
    if (key) localStorage.setItem(STORE, key);
    else key = localStorage.getItem(STORE) || localStorage.getItem("ray27.hk") || "";
  } catch (e) { /* private mode: the link's key lasts while the page is open */ }
  if (location.hash) history.replaceState(null, "", location.pathname);
  let data = null, busy = false, timer = 0, seen = null, showServed = false;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  const chip = no => '<span class="chip" style="--bg:' + DRINKS[no].bg + ";--ink:" + DRINKS[no].ink + '">#' + no + "</span>";
  const waited = iso => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

  function render() {
    if (!data) return;
    const fresh = new Set();
    data.pending.forEach(o => { if (seen && !seen.has(o.serial)) fresh.add(o.serial); });
    seen = new Set(data.pending.map(o => o.serial));
    const total = data.pending.length;

    const tiles = '<div class="b-tiles">' + data.drinks.map(d =>
      '<div class="b-tile' + (d.pending ? " on" : "") + '" style="--bg:' + DRINKS[d.no].bg + ";--ink:" + DRINKS[d.no].ink + '">' +
      '<span class="bt-name">' + esc(DRINKS[d.no].name) + "</span>" +
      '<b class="bt-n">' + d.pending + '</b><span class="bt-l">แก้วรอทำ</span>' +
      '<span class="bt-sub">เสิร์ฟแล้ว ' + d.served + "<br>ยังไม่สั่ง " + d.unused + "</span></div>").join("") + "</div>";

    const queue = '<section class="card"><h2>คิวรอเสิร์ฟ <small>' +
      (total ? "รวม " + total + " แก้ว เรียงจากสั่งก่อน" : "ยังไม่มีออเดอร์ค้าง") + "</small></h2>" +
      data.pending.map(o =>
        '<div class="b-order' + (fresh.has(o.serial) ? " new" : "") + '" style="--bg:' + DRINKS[o.drink].bg + '">' +
        '<div class="bo-main"><div class="bo-top">' + chip(o.drink) + '<span class="bo-drink">' + esc(DRINKS[o.drink].name) + "</span></div>" +
        '<div class="bo-who">' + (o.name ? esc(o.name) : '<span class="anon">ไม่ระบุชื่อ</span>') + "</div>" +
        '<div class="bo-meta">คูปอง No. ' + pad2(o.serial) + "<br>สั่ง " + hhmm(o.torn_at) + " (" + waited(o.torn_at) + " นาทีที่แล้ว)</div></div>" +
        '<button class="bo-done" data-serve="' + o.serial + '">เสิร์ฟแล้ว</button></div>').join("") + "</section>";

    const served = data.served.length
      ? '<section class="card"><button class="b-fold" data-act="fold">' + (showServed ? "ซ่อน" : "ดู") +
        "ที่เสิร์ฟล่าสุด (" + data.served.length + ")</button>" +
        (showServed ? data.served.map(o =>
          '<div class="b-served">' + chip(o.drink) + '<span class="bs-who">' + (o.name ? esc(o.name) : "ไม่ระบุชื่อ") +
          "<br><small>No. " + pad2(o.serial) + " เสิร์ฟ " + hhmm(o.served_at) + "</small></span>" +
          '<button class="mini" data-undo="' + o.serial + '">ยังไม่ได้เสิร์ฟ</button></div>').join("") : "") + "</section>"
      : "";

    app.innerHTML =
      '<header class="h-top"><div><div class="kicker">RAY LECTURE 2026 · บาร์</div><h1>คิวเครื่องดื่ม</h1></div>' +
      '<div class="upd">อัปเดต<br><time>' + hhmmss(new Date()) + "</time></div></header>" +
      tiles + queue + served +
      '<p class="foot">ออเดอร์ขึ้นเองทุก 4 วินาทีเมื่อพนักงานฉีกคูปองบนมือถือแขก<br>กด "เสิร์ฟแล้ว" เมื่อส่งแก้วถึงมือแขก ถ้ากดผิด กดคืนได้ที่ "ที่เสิร์ฟล่าสุด"</p>';
  }

  async function load() {
    try {
      const res = await rpc("night27_bar", { p_key: key });
      if (!res.ok) { stop("ลิงก์นี้ใช้ไม่ได้ ขอลิงก์หน้าบาร์จากทีมงานอีกครั้ง"); return; }
      data = res;
      if (!busy) render();
    } catch (_) { toast("ต่อเน็ตไม่ได้ จะลองใหม่เอง"); }
  }

  async function serve(serial, undo) {
    busy = true;
    try {
      const res = await rpc("night27_bar_serve", { p_key: key, p_serial: serial, p_undo: undo });
      busy = false;
      if (res.ok) toast(undo ? "คืน No. " + pad2(serial) + " เข้าคิวแล้ว" : "เสิร์ฟ No. " + pad2(serial) + " แล้ว");
      else if (res.error === "key") return stop("ลิงก์นี้ใช้ไม่ได้ ขอลิงก์หน้าบาร์จากทีมงานอีกครั้ง");
      await load();
    } catch (_) { busy = false; toast("ต่อเน็ตไม่ได้ ลองกดอีกครั้ง"); }
  }

  app.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b || !data || busy) return;
    if (b.dataset.serve) { b.disabled = true; return serve(+b.dataset.serve, false); }
    if (b.dataset.undo) { if (confirm("คืน No. " + pad2(+b.dataset.undo) + " เข้าคิวรอเสิร์ฟ?")) serve(+b.dataset.undo, true); return; }
    if (b.dataset.act === "fold") { showServed = !showServed; render(); }
  });

  function stop(msg) {
    clearInterval(timer);
    try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
    app.innerHTML = '<section class="enter"><div class="kicker">RAY LECTURE 2026 · บาร์</div>' +
      '<h1><span class="t1">บาร์</span><span class="t2">คิวเครื่องดื่ม</span></h1><p class="lead">' + esc(msg) + "</p></section>";
  }

  // keep the screen on behind the bar, where it is supported
  async function wake() { try { if (navigator.wakeLock && !document.hidden) await navigator.wakeLock.request("screen"); } catch (e) { /* not supported */ } }

  if (!key) stop("เปิดจากลิงก์หน้าบาร์ที่ทีมงานส่งให้");
  else {
    load();
    timer = setInterval(() => { if (!document.hidden && !busy) load(); }, 4000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { load(); wake(); } });
    wake();
  }
})();
