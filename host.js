/* RAY Lecture 2026 night: the hosts' page (Percy, ภีม, ปู๊น, อลีฟ). host.html#k=KEY
   Counts for the bar, coupons for guests who chose no drink (or spares), and fixes: tear for a guest,
   give back a coupon torn by mistake, cancel one issued by mistake. */
(function () {
  "use strict";
  const { rpc, DRINKS, esc, pad2, hhmm, hhmmss } = window.R27;
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  // one link for all hosts: each types their own 6-digit code and gets a session key kept on this phone
  // (an old personal link with #k=… still works)
  const STORE = "ray27.hk";
  let key = new URLSearchParams(location.hash.slice(1)).get("k") || "";
  try { if (!key) key = localStorage.getItem(STORE) || ""; } catch (e) { /* private mode */ }
  let timer = 0;
  const SITE = location.origin + location.pathname.replace(/host\.html$/, "");
  let data = null, pickGuest = "", busy = false, filter = "";

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toastEl.classList.remove("show"), 3800);
  }

  async function share(url, text) {
    try {
      if (navigator.share) { await navigator.share({ title: "คูปองเครื่องดื่ม RAY Lecture 2026", text, url }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(text + "\n" + url); toast("คัดลอกลิงก์แล้ว วางในแชตได้เลย"); }
    catch (_) { prompt("คัดลอกลิงก์นี้", url); }
  }

  const chip = no => '<span class="chip" style="--bg:' + DRINKS[no].bg + ";--ink:" + DRINKS[no].ink + '">#' + no + "</span>";

  function couponRow(c, who) {
    const d = DRINKS[c.drink];
    const state = c.torn_at ? '<span class="st used">ใช้แล้ว ' + hhmm(c.torn_at) + "</span>" : '<span class="st ready">พร้อมใช้</span>';
    const acts = c.torn_at
      ? '<button data-act="untear" data-serial="' + c.serial + '">คืนคูปอง</button>'
      : '<button data-act="tear" data-serial="' + c.serial + '">ฉีกแทน</button>' +
        '<button data-act="link" data-token="' + c.token + '" data-who="' + esc(who || "") + '">ส่งลิงก์</button>' +
        '<button data-act="void" data-serial="' + c.serial + '" class="danger">ยกเลิก</button>';
    return '<div class="cp">' + chip(c.drink) + '<span class="cp-no">No. ' + pad2(c.serial) + '</span><span class="cp-name">' +
      esc(d.name) + "</span>" + state + '<div class="acts">' + acts + "</div></div>";
  }

  function render() {
    if (!data) return;
    const all = [];
    data.guests.forEach(g => g.coupons.forEach(c => all.push(c)));
    data.free.forEach(c => all.push(c));
    const issued = all.length, torn = all.filter(c => c.torn_at).length;
    const left = no => { const d = data.drinks.find(x => x.no === no); return Math.max(0, d.cap - d.issued); };

    const totals =
      '<div class="totals">' +
      '<div><b>' + torn + '</b><span>แก้วที่ใช้แล้ว</span></div>' +
      '<div><b>' + issued + '<small>/' + data.max + '</small></b><span>คูปองที่ออกแล้ว</span></div>' +
      '<div><b>' + (data.max - issued) + '</b><span>ยังออกได้</span></div></div>' +
      '<div class="drinks">' + data.drinks.map(d =>
        '<div class="drow">' + chip(d.no) + '<span class="dname">' + esc(DRINKS[d.no].name) + '</span>' +
        '<span class="dnum">ใช้ <b>' + d.torn + '</b> · ออก ' + d.issued + "/" + d.cap +
        (d.issued > d.cap ? ' <em class="over">เกิน ' + (d.issued - d.cap) + "</em>" : "") + "</span></div>").join("") + "</div>";

    const options = ['<option value="">ไม่ระบุชื่อ (ส่งลิงก์ให้เอง)</option>']
      .concat(data.guests.filter(g => !g.drink).map(g => '<option value="' + g.id + '">' + esc(g.name) + " · ยังไม่ได้เลือก</option>"))
      .concat(data.guests.filter(g => g.drink).map(g => '<option value="' + g.id + '">' + esc(g.name) + "</option>"));
    const issue =
      '<section class="card"><h2>ออกคูปอง</h2>' +
      '<label class="lbl" for="who">ให้ใคร</label><select id="who">' + options.join("") + "</select>" +
      '<div class="pick">' + [1, 2, 3].map(no =>
        '<button class="drink-btn" data-issue="' + no + '" style="--bg:' + DRINKS[no].bg + ";--ink:" + DRINKS[no].ink + '">' +
        '<span class="db-name">' + esc(DRINKS[no].name) + '</span><span class="db-left">เหลือ ' + left(no) + "</span></button>").join("") +
      "</div><p class=\"hint-t\">ถ้าเลือกชื่อ คูปองจะขึ้นในหน้าของคนนั้นเอง และส่งลิงก์ซ้ำได้</p></section>";

    const q = filter.trim();
    const guests = data.guests.filter(g => !q || g.name.includes(q));
    const list =
      '<section class="card"><h2>รายชื่อ <small>' + data.guests.filter(g => g.registered_at).length + "/" + data.guests.length + ' คนเปิดคูปองแล้ว</small></h2>' +
      '<input class="filter" type="search" placeholder="ค้นชื่อ" value="' + esc(filter) + '">' +
      guests.map(g =>
        '<div class="guest"><div class="g-head"><span class="g-name">' + esc(g.name) + "</span>" +
        (g.registered_at ? '<span class="tag on">เปิดแล้ว</span>' : '<span class="tag">ยังไม่เปิด</span>') +
        (g.drink ? "" : '<span class="tag warn">ยังไม่ได้เลือก</span>') +
        '<button class="mini" data-act="glink" data-token="' + g.token + '" data-who="' + esc(g.name) + '">ลิงก์ A5</button></div>' +
        (g.coupons.length ? g.coupons.map(c => couponRow(c, g.name)).join("") : '<div class="none">ยังไม่มีคูปอง</div>') +
        "</div>").join("") + "</section>";

    const free = data.free.length
      ? '<section class="card"><h2>คูปองไม่ระบุชื่อ</h2>' + data.free.map(c => couponRow(c, "") +
          '<div class="by">ออกโดย ' + esc(c.issued_by) + "</div>").join("") + "</section>"
      : "";

    const keepFocus = document.activeElement && document.activeElement.classList.contains("filter");
    app.innerHTML =
      '<header class="h-top"><div><div class="kicker">RAY LECTURE 2026 · ทีมงาน</div><h1>' + esc(data.host) + "</h1></div>" +
      '<div class="upd">อัปเดต<br><time>' + hhmmss(new Date()) + '</time><br><button class="out" type="button" data-act="logout">ออก</button></div></header>' +
      totals + issue + list + free +
      '<p class="foot">ตัวเลขนี้ใช้ปิดยอดกับร้านได้: ร้านเสิร์ฟตามคูปองที่ฉีกแล้ว รวมไม่เกิน ' + data.max + " แก้ว</p>";
    const sel = app.querySelector("#who");
    sel.value = pickGuest;
    sel.addEventListener("change", () => { pickGuest = sel.value; });
    const f = app.querySelector(".filter");
    f.addEventListener("input", () => { filter = f.value; render(); });
    if (keepFocus) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
  }


  async function load() {
    try {
      const res = await rpc("night27_host", { p_key: key });
      if (!res.ok) { logout("รหัสนี้หมดอายุหรือใช้ไม่ได้ ใส่รหัสอีกครั้ง"); return false; }
      data = res;
      if (!busy) render();
      return true;
    } catch (_) {
      toast("ต่อเน็ตไม่ได้ จะลองใหม่เอง");
      return false;
    }
  }

  async function act(fn, args, okMsg) {
    busy = true;
    try {
      const res = await rpc(fn, Object.assign({ p_key: key }, args));
      busy = false;
      await load();
      if (res.ok) { if (okMsg) toast(okMsg); return res; }
      return res;
    } catch (_) {
      busy = false;
      toast("ต่อเน็ตไม่ได้ ลองอีกครั้ง");
      return null;
    }
  }

  app.addEventListener("click", async e => {
    const b = e.target.closest("button");
    if (!b || !data) return;
    if (b.dataset.issue) {
      const no = +b.dataset.issue, gid = pickGuest ? +pickGuest : null;
      const g = gid ? data.guests.find(x => x.id === gid) : null;
      const who = g ? g.name : "ไม่ระบุชื่อ";
      if (!confirm("ออกคูปอง " + DRINKS[no].name + " ให้ " + who + " ?")) return;
      let res = await act("night27_host_issue", { p_drink: no, p_guest: gid, p_force: false });
      if (res && !res.ok && res.error === "cap") {
        if (!confirm(DRINKS[no].name + " ครบโควตา " + res.cap + " แก้วแล้ว\nออกเกินไหม (รวมทั้งงานยังไม่เกิน 40 แก้ว ถ้าร้านตกลง)")) return;
        res = await act("night27_host_issue", { p_drink: no, p_guest: gid, p_force: true });
      }
      if (!res) return;
      if (!res.ok) { toast(res.error === "full" ? "ออกครบ 40 ใบแล้ว ออกเพิ่มไม่ได้" : "ออกคูปองไม่สำเร็จ"); return; }
      const url = SITE + "?c=" + res.token;
      toast("ออก No. " + pad2(res.serial) + " ให้ " + who + " แล้ว");
      if (confirm("ส่งลิงก์คูปอง No. " + pad2(res.serial) + " ให้ " + who + " เลยไหม")) {
        share(url, "คูปองเครื่องดื่ม " + DRINKS[no].name + " ของ " + who + " (ยื่นให้พนักงานฉีกที่บาร์)");
      }
      return;
    }
    const a = b.dataset.act;
    if (a === "logout") { if (confirm("ออกจากหน้าทีมงานบนเครื่องนี้?")) logout(""); return; }
    if (a === "link") return share(SITE + "?c=" + b.dataset.token, "คูปองเครื่องดื่ม" + (b.dataset.who ? " ของ " + b.dataset.who : "") + " (ยื่นให้พนักงานฉีกที่บาร์)");
    if (a === "glink") return share(SITE + "?g=" + b.dataset.token, "ลิงก์คูปองของ " + b.dataset.who + " (พิมพ์รหัส " + b.dataset.who + ")");
    const serial = +b.dataset.serial;
    if (a === "tear" && confirm("ฉีกคูปอง No. " + pad2(serial) + " แทนแขก?")) return act("night27_host_act", { p_serial: serial, p_action: "tear" }, "ฉีก No. " + pad2(serial) + " แล้ว");
    if (a === "untear" && confirm("คืนคูปอง No. " + pad2(serial) + " ให้ใช้ได้อีกครั้ง?")) return act("night27_host_act", { p_serial: serial, p_action: "untear" }, "คืน No. " + pad2(serial) + " แล้ว");
    if (a === "void" && confirm("ยกเลิกคูปอง No. " + pad2(serial) + " ?\nใช้เมื่อออกผิด เลขนี้จะว่างให้ออกใหม่")) return act("night27_host_act", { p_serial: serial, p_action: "void" }, "ยกเลิก No. " + pad2(serial) + " แล้ว");
  });

  function logout(msg) {
    key = ""; data = null;
    try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
    if (location.hash) history.replaceState(null, "", location.pathname);
    showLogin(msg);
  }

  function showLogin(msg) {
    clearInterval(timer);
    app.innerHTML =
      '<section class="enter"><div class="kicker">RAY LECTURE 2026 · ทีมงาน</div>' +
      '<h1><span class="t1">ทีมงาน</span><span class="t2">คูปองเครื่องดื่ม</span></h1>' +
      '<form class="code" autocomplete="off" novalidate>' +
      '<label for="hcode">รหัสทีมงานของคุณ (6 หลัก)</label>' +
      '<input id="hcode" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="••••••">' +
      '<button type="submit">เข้าหน้าทีมงาน</button>' +
      '<p class="err" role="alert">' + esc(msg || "") + "</p></form></section>";
    const form = app.querySelector("form"), input = form.querySelector("input"), err = form.querySelector(".err"),
      btn = form.querySelector("button");
    input.focus();
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const code = input.value.replace(/\D/g, "");
      if (code.length !== 6) { err.textContent = "รหัสมี 6 หลัก"; return; }
      btn.disabled = true; err.textContent = "";
      try {
        const res = await rpc("night27_host_login", { p_code: code });
        if (res.ok) {
          key = res.key;
          try { localStorage.setItem(STORE, key); } catch (e2) { /* the session lasts until the page closes */ }
          start();
        } else {
          err.textContent = res.error === "wait" ? "ใส่รหัสผิดหลายครั้ง รอ 10 นาทีแล้วลองใหม่" : "รหัสไม่ถูก ลองอีกครั้ง";
          input.select();
        }
      } catch (_) { err.textContent = "ต่อเน็ตไม่ได้ ลองอีกครั้ง"; }
      btn.disabled = false;
    });
  }

  async function start() {
    if (!key) return showLogin("");
    await load();          // a network hiccup here is retried by the timer; a bad key has already logged out
    clearInterval(timer);
    timer = setInterval(() => { if (key && !document.hidden && !busy && !(document.activeElement && document.activeElement.matches("select, input"))) load(); }, 8000);
  }

  document.addEventListener("visibilitychange", () => { if (key && !document.hidden) load(); });
  start();
})();
