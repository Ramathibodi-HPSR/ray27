/* RAY Lecture 2026 night: the guest page.
   ?g=TOKEN  the guest's own A5 (type the name printed there once, then the coupon opens)
   ?c=TOKEN  a coupon a host sent online */
(function () {
  "use strict";
  const { rpc, esc, ticketHTML, mount, startClocks } = window.R27;
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const qs = new URLSearchParams(location.search);
  const STORE = "ray27.g";

  let g = (qs.get("g") || "").trim().toUpperCase();
  const c = (qs.get("c") || "").trim().toUpperCase();
  try {
    if (g) localStorage.setItem(STORE, g);
    else if (!c) g = (localStorage.getItem(STORE) || "").toUpperCase();
  } catch (e) { /* private mode */ }

  const mounted = new Map();   // coupon token -> {el, api}
  let poll = 0;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toastEl.classList.remove("show"), 4200);
  }

  function hero(extra) {
    return '<section class="enter">' +
      '<div class="kicker">RAY LECTURE 2026</div>' +
      '<h1><span class="t1">ต้นทุน</span><span class="t2">ของการเปลี่ยนแปลง</span></h1>' +
      '<p class="en">Cost of Revolution</p>' + extra + "</section>";
  }

  function showNoToken() {
    app.innerHTML = hero('<p class="lead">สแกน QR บน A5 ของคุณ เพื่อเปิดคูปองเครื่องดื่ม</p>');
  }

  function showBad() {
    app.innerHTML = hero('<p class="lead">ลิงก์นี้ใช้ไม่ได้<br>ลองสแกน QR บน A5 อีกครั้ง หรือบอกทีมงาน</p>');
  }

  function showEnter() {
    app.innerHTML = hero(
      '<form class="code" autocomplete="off" novalidate>' +
      '<label for="code">พิมพ์รหัสในกรอบบน A5 ของคุณ</label>' +
      '<input id="code" name="code" type="text" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="รหัส">' +
      '<button type="submit">เปิดคูปอง</button>' +
      '<p class="err" role="alert"></p>' +
      "</form>");
    const form = app.querySelector("form"), input = form.querySelector("input"), err = form.querySelector(".err"),
      btn = form.querySelector("button");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) { err.textContent = "พิมพ์รหัสก่อน"; input.focus(); return; }
      btn.disabled = true; err.textContent = "";
      try {
        const res = await rpc("night27_claim", { p_token: g, p_name: name });
        if (res.ok) { input.blur(); showCoupons(res, true); }
        else if (res.error === "name") { err.textContent = "รหัสไม่ตรงกับ A5 แผ่นนี้ ลองดูในกรอบอีกครั้ง"; input.select(); }
        else showBad();
      } catch (_) {
        err.textContent = "ต่อเน็ตไม่ได้ ลองอีกครั้ง";
      }
      btn.disabled = false;
    });
  }

  function guide(allTorn) {
    return allTorn
      ? '<p class="guide done">แลกแล้ว ขอให้สนุกกับคืนนี้</p>'
      : '<p class="guide"><b>ยื่นมือถือให้พนักงาน</b><br>ลากนิ้วไปตามรอยปรุเพื่อฉีกต้นขั้ว</p>' +
        '<p class="small">ฉีกได้ครั้งเดียว ถ้าเผลอฉีก บอกทีมงานให้คืนได้</p>';
  }

  function tear(token) { return rpc("night27_tear", { p_ctoken: token }); }

  function renderGuide() {
    const box = app.querySelector(".guide-box");
    if (!box) return;
    const list = [...mounted.values()];
    const allTorn = list.length > 0 && list.every(m => m.c.torn_at);
    box.innerHTML = list.length ? guide(allTorn) : "";
  }

  // state: {name, chose, coupons:[...]} (guest) or {name, coupons:[one]} (a host's link)
  function showCoupons(state, fresh) {
    const owner = state.name || null;
    if (!app.querySelector(".wallet")) {
      app.innerHTML = '<section class="wallet' + (fresh ? " fresh" : "") + '"><div class="tickets"></div>' +
        '<div class="waiting"></div><div class="guide-box"></div></section>';
      mounted.clear();
    }
    const box = app.querySelector(".tickets");
    const seen = new Set();
    (state.coupons || []).forEach(cp => {
      seen.add(cp.token);
      const m = mounted.get(cp.token);
      if (m) { m.api.update(cp); return; }
      const holder = document.createElement("div");
      holder.innerHTML = ticketHTML(cp, owner);
      const el = holder.firstElementChild;
      box.appendChild(el);
      const rec = { el, c: cp };
      rec.api = mount(el, cp, {
        tear,
        onTorn: () => renderGuide(),
        onError: res => toast(res && res.error === "net" ? "ฉีกไม่สำเร็จ เน็ตหลุด ลองฉีกอีกครั้ง" : "ฉีกไม่สำเร็จ ลองอีกครั้ง หรือบอกทีมงาน")
      });
      mounted.set(cp.token, rec);
    });
    for (const [tok, m] of mounted) if (!seen.has(tok)) { m.el.remove(); mounted.delete(tok); }

    const waiting = app.querySelector(".waiting");
    waiting.innerHTML = mounted.size ? "" :
      '<div class="note-card">' +
      (owner ? '<p class="hi">สวัสดี ' + esc(owner) + "</p>" : "") +
      (state.chose === false
        ? "<p>คุณยังไม่ได้เลือกเครื่องดื่มไว้<br>บอกพีพี ภีม ปู๊น หรืออลีฟ แล้วคูปองจะขึ้นที่หน้านี้</p>"
        : "<p>ตอนนี้ยังไม่มีคูปอง<br>ทีมงานกำลังออกให้ใหม่ หน้านี้จะขึ้นเองเมื่อพร้อม</p>") +
      "</div>";
    renderGuide();
  }

  async function refresh() {
    if (document.hidden) return;
    try {
      const res = c ? await rpc("night27_coupon", { p_ctoken: c }) : await rpc("night27_state", { p_token: g });
      if (res.ok && (c || res.registered)) showCoupons(res, false);
    } catch (_) { /* try again next round */ }
  }

  async function start() {
    startClocks();
    if (!g && !c) return showNoToken();
    try {
      const res = c ? await rpc("night27_coupon", { p_ctoken: c }) : await rpc("night27_state", { p_token: g });
      if (!res.ok) return showBad();
      if (!c && !res.registered) showEnter();
      else showCoupons(res, false);
    } catch (_) {
      app.innerHTML = hero('<p class="lead">ต่อเน็ตไม่ได้<br><button class="retry" type="button">ลองอีกครั้ง</button></p>');
      app.querySelector(".retry").addEventListener("click", start);
      return;
    }
    clearInterval(poll);
    poll = setInterval(refresh, 8000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  }

  start();
})();
