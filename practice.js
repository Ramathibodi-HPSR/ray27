/* RAY Lecture 2026 night: a practice page for the bar staff (Percy, 27 Nov 2026).
   The three drinks' tickets, torn and put back as often as they like. Nothing here talks to the server, and every
   ticket says ตัวอย่าง: a real coupon carries the guest's name. */
(function () {
  "use strict";
  const { ticketHTML, mount, startClocks } = window.R27;
  const box = document.getElementById("tickets");
  const SAMPLES = [
    { token: "DEMO1", serial: 1, drink: 1, torn_at: null },
    { token: "DEMO2", serial: 19, drink: 2, torn_at: null },
    { token: "DEMO3", serial: 31, drink: 3, torn_at: null }
  ];

  function fakeTear() {
    return new Promise(res => setTimeout(() => res({ ok: true, first: true, torn_at: new Date().toISOString() }), 150));
  }

  function place(sample, slot) {
    const c = Object.assign({}, sample, { torn_at: null });
    const holder = document.createElement("div");
    holder.innerHTML = ticketHTML(c, null);
    const el = holder.firstElementChild;
    el.classList.add("demo");
    el.querySelector(".t-owner").innerHTML = "<span>คูปองตัวอย่าง ใช้แลกไม่ได้</span>";
    el.querySelectorAll(".t-main, .t-stub").forEach(part => {
      const wm = document.createElement("div");
      wm.className = "wm";
      wm.textContent = "ตัวอย่าง";
      part.appendChild(wm);
    });
    const again = document.createElement("button");
    again.type = "button";
    again.className = "again";
    again.textContent = "ประกอบกลับ ลองใหม่";
    again.addEventListener("click", () => place(sample, wrap));
    const wrap = slot || document.createElement("div");
    wrap.className = "demo-slot";
    wrap.replaceChildren(el, again);
    if (!slot) box.appendChild(wrap);
    mount(el, c, { tear: fakeTear });
  }

  SAMPLES.forEach(s => place(s, null));
  document.getElementById("reset-all").addEventListener("click", () => {
    box.querySelectorAll(".demo-slot").forEach((slot, i) => place(SAMPLES[i], slot));
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  startClocks();
})();
