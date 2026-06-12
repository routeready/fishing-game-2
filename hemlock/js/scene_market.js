'use strict';
// The town strip: daily gossip, prices, and the four buyers.
HM.scenes.market = {
  enter() {},
  update(dt) {},
  draw(c) {
    bizChrome(c, 'TOWN STRIP', '#ffd24a', 'ONE BAR, ONE BAIT SHOP, NINETY SECRETS.');
    const S = G.save, M = G.market;

    // ---- gossip / prices card ----
    UI.card(c, 60, 150, 380, 470, { title: 'TOWN GOSSIP' });
    txt(c, M.event.name, 90, 218, { size: 18, weight: 900, color: '#ffd24a', spacing: 1 });
    let gy = 244;
    for (const l of HM.wrapLines(M.event.txt, 34)) { txt(c, l, 90, gy, { size: 14, weight: 600, color: '#c4d2e8' }); gy += 22; }
    gy += 10;
    txt(c, 'STREET PRICES', 90, gy, { size: 13, weight: 800, color: 'rgba(190,210,235,0.5)', spacing: 2 }); gy += 12;
    for (const id of ['shine', 'heroin', 'meth', 'coke']) {
      const p = PRODUCTS[id];
      const mult = M.prices[id];
      const up = mult >= 1;
      const hot = M.hot === id;
      gy += 38;
      c.fillStyle = p.color;
      c.beginPath(); c.arc(104, gy - 6, 7, 0, TAU); c.fill();
      txt(c, p.name, 124, gy, { size: 15, weight: 800, color: hot ? '#ffd24a' : '#eaf2ff' });
      if (hot) txtGlow(c, 'HOT', 230, gy, { size: 12, weight: 900, color: '#ffd24a', glow: '#ffd24a', blur: 8 });
      txt(c, money(HM.priceOf(id)), 366, gy, { size: 15, weight: 900, color: up ? '#7dffa8' : '#ff8a7a', align: 'right' });
      txt(c, up ? '▲' : '▼', 392, gy, { size: 13, weight: 900, color: up ? '#7dffa8' : '#ff8a7a', align: 'center' });
    }
    gy += 44;
    for (const l of HM.wrapLines('TIP: ' + M.tip, 36)) { txt(c, l, 90, gy, { size: 12.5, weight: 600, color: 'rgba(190,210,235,0.5)' }); gy += 20; }
    if (S.records.cleanStreak > 0) txt(c, 'CLEAN STREAK BONUS: +' + Math.min(20, S.records.cleanStreak * 2) + '%', 90, 596, { size: 13, weight: 700, color: '#7dffa8' });

    // ---- buyers ----
    let by = 150;
    for (const b of BUYERS) {
      const locked = b.needs === 'lodge' && !S.biz.lodge.lvl;
      const h = 104;
      UI.card(c, 480, by, 740, h, {});
      txt(c, b.name, 510, by + 34, { size: 18, weight: 900, color: locked ? 'rgba(234,242,255,0.35)' : '#eaf2ff', spacing: 1 });
      txt(c, locked ? 'NEEDS THE LODGE OPEN' : b.desc, 510, by + 56, { size: 12.5, weight: 600, color: 'rgba(190,210,235,0.5)' });
      txt(c, 'PAYS X' + b.mult + (b.heatX >= 2 ? ' · HEAT HEAVY' : ''), 510, by + 78, { size: 12.5, weight: 700, color: b.mult >= 1.4 ? '#ffd24a' : 'rgba(190,210,235,0.6)' });
      if (!locked) {
        let px = 760;
        for (const prod of b.buys) {
          const have = S.inv[prod];
          const p = PRODUCTS[prod];
          const unit = Math.round(HM.priceOf(prod) * b.mult * (1 + Math.min(10, S.records.cleanStreak) * 0.02));
          const w = 148;
          fillRR(c, px, by + 16, w, 72, 10, 'rgba(8,12,22,0.6)');
          strokeRR(c, px, by + 16, w, 72, 10, rgba(p.color, have > 0 ? 0.45 : 0.12), 1);
          txt(c, p.name, px + 12, by + 36, { size: 12, weight: 800, color: have > 0 ? p.color : 'rgba(190,210,235,0.3)' });
          txt(c, money(unit), px + 12, by + 54, { size: 13, weight: 900, color: have > 0 ? '#eaf2ff' : 'rgba(190,210,235,0.3)' });
          const qty = Math.min(have, b.cap * ((M.event.fx.peteCap && b.id === 'barfly') ? 2 : 1));
          if (UI.button(c, 'sell_' + b.id + '_' + prod, px + 76, by + 24, 62, 26, { label: 'SELL 1', size: 11, color: p.color, disabled: qty < 1, silent: true })) {
            doSell(b.id, prod, 1, px + w / 2, by + 16);
          }
          if (UI.button(c, 'sellall_' + b.id + '_' + prod, px + 76, by + 56, 62, 26, { label: 'ALL (' + qty + ')', size: 11, color: p.color, disabled: qty < 1, silent: true })) {
            doSell(b.id, prod, qty, px + w / 2, by + 16);
          }
          px += w + 10;
        }
      }
      by += h + 14;
    }
    invStrip(c);
    vignette(c);

    function doSell(buyerId, prod, qty, x, y) {
      const res = HM.sellTo(buyerId, prod, qty, { x, y });
      if (res && res.crit) toast('BIG SPENDER! TRIPLE PAYOUT!', '#ffd24a');
    }
  },
};
