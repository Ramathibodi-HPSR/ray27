# ray27

E-coupons for the RAY Lecture 2026 night talk, "ต้นทุนของการเปลี่ยนแปลง (Cost of Revolution)", Friday 27 November 2026 at #OBSESSION.BKK.

Each guest scans the QR code on their A5 handout and types the code printed there. Their drink coupon then opens, and bar staff tear it on screen by dragging a finger along the perforation. A coupon can be torn only once. Hosts use `host.html` with their own key to issue coupons, tear one for a guest, return a coupon torn by mistake, and see the counts for the bar.

- Static front end: `index.html` (guests) and `host.html` (hosts), served by GitHub Pages
- Back end: Postgres functions `night27_*` in a Supabase project, with tables in the `night27` schema, which is not exposed to the API
- No guest data in this repository. Names, tokens and keys live only in the database and the organisers' files

Fonts: Prompt (Cadson Demak), DM Serif Display and DM Sans, under the SIL Open Font License (`fonts/OFL-*.txt`).

To be taken down after the event.
