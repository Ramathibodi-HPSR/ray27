/* RAY Lecture 2026 night: the guest page.
   No token: register with your Thai nickname and the 5-digit code on your A5 (any A5; one code, one guest).
   Registering is checking in. The page then keeps ?g=TOKEN (and this phone remembers it).
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

  function forget() {
    g = "";
    try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
    if (location.search) history.replaceState(null, "", location.pathname);
  }

  function showBad() {
    app.innerHTML = hero('<p class="lead">ลิงก์คูปองนี้ใช้ไม่ได้<br>บอกทีมงาน</p>');
  }

  const ERR = {
    name: "ไม่พบชื่อนี้ในรายชื่อ ลองพิมพ์ชื่อเล่นแบบอื่น หรือเรียกทีมงาน",
    code: "รหัสไม่ถูก ดูตัวเลข 5 หลักในกรอบเส้นประบน A5 อีกครั้ง",
    code_used: "รหัสนี้มีคนใช้ลงทะเบียนไปแล้ว เรียกทีมงาน",
    name_taken: "ชื่อนี้ลงทะเบียนไปแล้วด้วยรหัสอื่น ถ้าไม่ใช่คุณ เรียกทีมงาน",
    wait: "ลองผิดหลายครั้ง รอสักครู่แล้วลองใหม่ หรือเรียกทีมงาน"
  };

  function showEnter(msg) {
    app.innerHTML = hero(
      '<form class="code" autocomplete="off" novalidate>' +
      '<label for="gname">ชื่อเล่นของคุณ (ภาษาไทย)</label>' +
      '<input id="gname" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next" placeholder="ชื่อเล่น">' +
      '<label for="gcode">รหัส 5 หลักในกรอบเส้นประบน A5</label>' +
      '<input id="gcode" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="7" enterkeyhint="go" placeholder="•••••">' +
      '<button type="submit">ลงทะเบียน และเปิดคูปอง</button>' +
      '<p class="err" role="alert">' + esc(msg || "") + "</p></form>");
    const form = app.querySelector("form"), nameIn = form.querySelector("#gname"), codeIn = form.querySelector("#gcode"),
      err = form.querySelector(".err"), btn = form.querySelector("button");
    nameIn.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); codeIn.focus(); } });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const name = nameIn.value.trim(), code = codeIn.value.replace(/\D/g, "");
      if (!name) { err.textContent = "พิมพ์ชื่อเล่นก่อน"; nameIn.focus(); return; }
      if (code.length !== 5) { err.textContent = "รหัสมี 5 หลัก"; codeIn.focus(); return; }
      btn.disabled = true; err.textContent = "";
      try {
        const res = await rpc("night27_register", { p_name: name, p_code: code });
        if (res.ok) {
          g = res.token;
          try { localStorage.setItem(STORE, g); } catch (e2) { /* private mode */ }
          history.replaceState(null, "", location.pathname + "?g=" + g);
          codeIn.blur();
          showCoupons(res, true);
          startPoll();
        } else {
          err.textContent = ERR[res.error] || "ลงทะเบียนไม่สำเร็จ ลองอีกครั้ง หรือเรียกทีมงาน";
          (res.error === "name" ? nameIn : codeIn).select();
        }
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
      hero("") +
      '<div class="note-card">' +
      (owner ? '<p class="hi">สวัสดี ' + esc(owner) + "</p>" : "") +
      (state.chose === false
        ? "<p>คุณยังไม่ได้เลือกเครื่องดื่มไว้<br>บอกพีพี ภีม ปู๊น หรืออลีฟ<br>แล้วคูปองจะขึ้นที่หน้านี้เอง</p>"
        : "<p>ตอนนี้ยังไม่มีคูปอง<br>ทีมงานกำลังออกให้ใหม่<br>หน้านี้จะขึ้นเองเมื่อพร้อม</p>") +
      "</div>";
    renderGuide();
  }

  async function refresh() {
    if (document.hidden || (!g && !c)) return;
    try {
      const res = c ? await rpc("night27_coupon", { p_ctoken: c }) : await rpc("night27_state", { p_token: g });
      if (res.ok && (c || res.registered)) showCoupons(res, false);
      else if (!c && app.querySelector(".wallet")) {   // a host undid this registration
        forget();
        showEnter("ทีมงานล้างการลงทะเบียนของคุณแล้ว ลงทะเบียนใหม่ได้");
      }
    } catch (_) { /* try again next round */ }
  }

  function startPoll() {
    clearInterval(poll);
    poll = setInterval(refresh, 8000);
  }

  async function start() {
    if (!g && !c) return showEnter("");
    try {
      const res = c ? await rpc("night27_coupon", { p_ctoken: c }) : await rpc("night27_state", { p_token: g });
      if (!res.ok && c) return showBad();
      if (!res.ok || (!c && !res.registered)) { forget(); return showEnter(""); }
      showCoupons(res, false);
    } catch (_) {
      app.innerHTML = hero('<p class="lead">ต่อเน็ตไม่ได้<br><button class="retry" type="button">ลองอีกครั้ง</button></p>');
      app.querySelector(".retry").addEventListener("click", start);
      return;
    }
    startPoll();
  }

  startClocks();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  start();
})();
