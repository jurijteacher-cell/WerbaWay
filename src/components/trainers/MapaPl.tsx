'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Anim, TrainerShell, useSay, type TrainerBase } from './core';

type City = { n: string; x: number; y: number; f: { pl: string; uk: string; a: string }[] };
type Poi = { id: string; pl: string; uk: string; x: number; y: number; an?: string; t: string };
type MapGeo = {
  path: string;
  w: number;
  h: number;
  view: [number, number, number, number];
  sea: string;
  cities: Record<string, City>;
  edges: [string, string][];
  nb: Record<string, { n: string; d: string; c?: string; lx: number; ly: number }>;
  poi: Poi[];
  rivers: Record<string, { n: string; uk: string; d: string; lx: number; ly: number }>;
  terrain: {
    forest: string[];
    lakes: { cx: number; cy: number; rx: number; ry: number }[];
    sudety: string;
    karpaty: string;
    peaks: { x: number; y: number }[];
    regions: { n: string; x: number; y: number }[];
  };
};
export type MapaData = TrainerBase & { neighbour_uk?: string; start?: string; map: MapGeo };

const KIND: Record<string, string> = {
  mt: 'Góry',
  lake: 'Jeziora',
  coast: 'Nad morzem',
  nature: 'Przyroda',
  place: 'Ciekawe miejsce',
  sea: 'Morze',
};

type Card =
  | { k: 'city'; id: string }
  | { k: 'simple'; title: string; sub: string; slug: string; kind: string; anim?: string | null };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function buildSvg(M: MapGeo) {
  const C = M.cities;
  let s = `<svg viewBox="${M.view.join(' ')}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<path class="sea" d="${M.sea}"/>`;
  s += `<text class="sea-label" x="${(C.gdansk?.x ?? 300) - 20}" y="-48" text-anchor="middle">Morze Bałtyckie</text>`;
  for (const n of Object.values(M.nb)) s += `<path class="nb" d="${n.d}" fill="${n.c || '#efeee6'}"/>`;
  s +=
    '<defs><linearGradient id="relief" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#eaf4e4"/><stop offset="38%" stop-color="#f3f6e6"/>' +
    '<stop offset="68%" stop-color="#f7f1dd"/><stop offset="100%" stop-color="#eee0c8"/>' +
    `</linearGradient><clipPath id="plclip"><path d="${M.path}"/></clipPath></defs>`;
  s += `<path class="pl-land pl-base" d="${M.path}"/>`;
  const T = M.terrain;
  s += '<g clip-path="url(#plclip)">';
  s += `<path class="ridge" d="${T.sudety}"/><path class="ridge" d="${T.karpaty}"/>`;
  s += `<path class="ridge2" d="${T.sudety}"/><path class="ridge2" d="${T.karpaty}"/>`;
  for (const d of T.forest) s += `<path class="forest" d="${d}"/>`;
  for (const l of T.lakes) s += `<ellipse class="lake" cx="${l.cx}" cy="${l.cy}" rx="${l.rx}" ry="${l.ry}"/>`;
  for (const k of T.peaks) s += `<path class="peak" d="M${k.x - 7},${k.y + 5} L${k.x},${k.y - 7} L${k.x + 7},${k.y + 5} Z"/>`;
  s += '</g>';
  s += `<path class="pl-land" d="${M.path}" fill="none"/>`;
  for (const r of T.regions) s += `<text class="region-label" x="${r.x}" y="${r.y}" text-anchor="middle">${esc(r.n)}</text>`;
  for (const [id, r] of Object.entries(M.rivers)) {
    s += `<path class="river" d="${r.d}"/>`;
    s += `<text class="river-label" data-river="${id}" style="pointer-events:auto;cursor:pointer" x="${r.lx + 9}" y="${r.ly}">${esc(r.n)}</text>`;
  }
  for (const [a, b] of M.edges) {
    const A = C[a];
    const B = C[b];
    if (!A || !B) continue;
    s += `<line class="rail" id="r-${a}-${b}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
    s += `<line class="rail-tie" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
  }
  for (const p of M.poi) s += `<text class="poi-label" x="${p.x}" y="${p.y + 26}" text-anchor="middle">${esc(p.pl)}</text>`;
  for (const [id, c] of Object.entries(C)) {
    s += `<circle class="dot" id="dot-${id}" data-city="${id}" cx="${c.x}" cy="${c.y}" r="8"/>`;
    s += `<circle class="halo" cx="${c.x}" cy="${c.y}" r="9"/>`;
    const right = c.x < M.w * 0.78;
    s += `<text class="cname" x="${c.x + (right ? 14 : -13)}" y="${c.y + (c.y < 40 ? 18 : 5)}" text-anchor="${right ? 'start' : 'end'}">${esc(c.n)}</text>`;
  }
  for (const [id, n] of Object.entries(M.nb)) {
    s += `<text class="nb-label" x="${n.lx}" y="${n.ly}" text-anchor="middle">${esc(n.n)}</text>`;
    s += `<circle class="nb-hit" cx="${n.lx}" cy="${n.ly - 6}" r="36" data-nb="${id}"/>`;
  }
  return s + '</svg>';
}

const LAYERS: [string, string][] = [
  ['poi', '⛰️ Przyroda i miejsca'],
  ['nb', '🧭 Sąsiedzi'],
  ['riv', '💧 Rzeki'],
  ['anim', '🎬 Animacje'],
  ['terrain', '🌲 Lasy i góry'],
];

/** Карта Польщі: клік на місто — потяг їде маршрутом, візитівка з озвученими фактами; природа, сусіди, річки. */
export function MapaPl({ data }: { data: MapaData }) {
  const M = data.map;
  const base = data.asset_base;
  const say = useSay(base);
  const svg = useMemo(() => buildSvg(M), [M]);
  const areaRef = useRef<HTMLDivElement>(null);
  const trainRef = useRef<HTMLDivElement>(null);
  const [off, setOff] = useState<Record<string, boolean>>({});
  const start = data.start && M.cities[data.start] ? data.start : Object.keys(M.cities)[0];
  const at = useRef(start);
  const moving = useRef(false);
  const [card, setCard] = useState<Card>({ k: 'city', id: start });
  const [V0, V1, VW, VH] = M.view;
  const pct = (x: number, y: number) => [((x - V0) / VW) * 100, ((y - V1) / VH) * 100];

  const graph = useMemo(() => {
    const G: Record<string, string[]> = {};
    for (const k of Object.keys(M.cities)) G[k] = [];
    for (const [a, b] of M.edges) {
      G[a]?.push(b);
      G[b]?.push(a);
    }
    return G;
  }, [M]);

  const route = (from: string, to: string) => {
    if (from === to) return [to];
    const prev: Record<string, string> = {};
    const q = [from];
    const seen: Record<string, boolean> = { [from]: true };
    while (q.length) {
      const v = q.shift()!;
      for (const w of graph[v] ?? []) {
        if (seen[w]) continue;
        seen[w] = true;
        prev[w] = v;
        if (w === to) {
          const p = [to];
          let x = to;
          while (prev[x] !== undefined) {
            x = prev[x];
            p.unshift(x);
          }
          return p;
        }
        q.push(w);
      }
    }
    return [to];
  };

  const place = (x: number, y: number) => {
    const t = trainRef.current;
    if (!t) return;
    const [l, tp] = pct(x, y);
    t.style.left = `${l}%`;
    t.style.top = `${tp}%`;
  };

  const markDot = (id: string | null) => {
    const area = areaRef.current;
    if (!area) return;
    area.querySelectorAll('.dot').forEach((d) => d.classList.remove('on'));
    if (id) area.querySelector(`#dot-${id}`)?.classList.add('on');
  };

  const highlight = (path: string[]) => {
    const area = areaRef.current;
    if (!area) return;
    area.querySelectorAll('.rail').forEach((r) => r.classList.remove('hot'));
    for (let i = 0; i < path.length - 1; i++) {
      const el = area.querySelector(`#r-${path[i]}-${path[i + 1]}`) || area.querySelector(`#r-${path[i + 1]}-${path[i]}`);
      el?.classList.add('hot');
    }
  };

  const ride = (path: string[], done: () => void) => {
    moving.current = true;
    highlight(path);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let seg = 0;
    const leg = () => {
      if (seg >= path.length - 1) {
        moving.current = false;
        done();
        return;
      }
      const A = M.cities[path[seg]];
      const B = M.cities[path[seg + 1]];
      trainRef.current?.classList.toggle('flip', B.x < A.x);
      const dur = reduce ? 1 : Math.max(420, Math.hypot(B.x - A.x, B.y - A.y) * 3.2);
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        place(A.x + (B.x - A.x) * e, A.y + (B.y - A.y) * e);
        if (t < 1) requestAnimationFrame(step);
        else {
          seg++;
          window.setTimeout(leg, reduce ? 0 : 230);
        }
      };
      requestAnimationFrame(step);
    };
    leg();
  };

  useEffect(() => {
    const c = M.cities[at.current];
    if (c) place(c.x, c.y);
    markDot(at.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClick = (e: React.MouseEvent) => {
    const el = e.target as Element;
    const city = el.closest('[data-city]')?.getAttribute('data-city');
    if (city) {
      if (moving.current || city === at.current) {
        setCard({ k: 'city', id: city });
        markDot(city);
        return;
      }
      ride(route(at.current, city), () => {
        at.current = city;
        setCard({ k: 'city', id: city });
        markDot(city);
        say(city, M.cities[city].n);
      });
      return;
    }
    const nb = el.closest('[data-nb]')?.getAttribute('data-nb');
    if (nb && M.nb[nb]) {
      const n = M.nb[nb];
      setCard({ k: 'simple', title: n.n, sub: data.neighbour_uk ?? '', slug: nb, kind: 'Sąsiad', anim: null });
      markDot(null);
      say(nb, n.n);
      return;
    }
    const riv = el.closest('[data-river]')?.getAttribute('data-river');
    if (riv && M.rivers[riv]) {
      const r = M.rivers[riv];
      setCard({ k: 'simple', title: r.n, sub: r.uk, slug: riv, kind: 'Rzeka', anim: 'woda' });
      markDot(null);
      say(riv, r.n);
      return;
    }
    const poi = el.closest('[data-poi]')?.getAttribute('data-poi');
    const p = poi ? M.poi.find((x) => x.id === poi) : null;
    if (p) {
      setCard({ k: 'simple', title: p.pl, sub: p.uk, slug: p.id, kind: KIND[p.t] ?? 'Miejsce', anim: p.an });
      markDot(null);
      say(p.id, p.pl);
    }
  };

  const offCls = Object.entries(off)
    .filter(([, v]) => v)
    .map(([k]) => `off-${k}`)
    .join(' ');
  const cityId = card.k === 'city' ? card.id : '';
  const cityCard = cityId ? M.cities[cityId] : null;

  return (
    <TrainerShell data={data}>
      <div className="layers">
        {LAYERS.map(([k, label]) => (
          <button
            type="button"
            key={k}
            className="lay"
            aria-pressed={!off[k]}
            onClick={() => setOff((o) => ({ ...o, [k]: !o[k] }))}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={`maparea ${offCls}`} ref={areaRef} onClick={onClick}>
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        {!off.anim &&
          M.poi.map((p) => {
            const [l, t] = pct(p.x, p.y);
            if (!p.an) return null;
            return (
              <div key={`pa-${p.id}`} className="poi-anim" style={{ left: `${l}%`, top: `${t}%` }}>
                <Anim base={base} slug={p.an} />
              </div>
            );
          })}
        {M.poi.map((p) => {
          const [l, t] = pct(p.x, p.y);
          return (
            <div
              key={`ph-${p.id}`}
              className="poi-hit"
              data-poi={p.id}
              data-role="option"
              data-item-id={`mapa:${p.id}`}
              title={p.pl}
              style={{ left: `${l}%`, top: `${t}%` }}
            />
          );
        })}
        {!off.anim &&
          Object.entries(M.cities).map(([id, c]) => {
            const [l, t] = pct(c.x - 17, c.y - 17);
            return (
              <div key={`ca-${id}`} className="city-anim" style={{ left: `${l}%`, top: `${t}%` }}>
                <Anim base={base} slug={`c_${id}`} />
              </div>
            );
          })}
        <div className="train" ref={trainRef}>
          <Anim base={base} slug="pociag" eager />
        </div>
      </div>

      <div className="cityc">
        {cityCard ? (
          <>
            <Anim base={base} slug={`c_${cityId}`} className="anim" eager key={`cc-${cityId}`} />
            <div className="body">
              <div className="vis">Wizytówka · stacja {cityCard.n}</div>
              <h4>
                {cityCard.n}{' '}
                <button type="button" className="ww-btn ww-btn-sm" onClick={() => say(cityId, cityCard.n)}>
                  🔊 Posłuchaj
                </button>
              </h4>
              <div className="facts">
                {cityCard.f.map((f) => (
                  <button type="button" key={f.a} className="fact" data-role="play" onClick={() => say(f.a, f.pl)}>
                    <b>{f.pl}</b>
                    <span>{f.uk}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : card.k === 'simple' ? (
          <>
            {card.anim && <Anim base={base} slug={card.anim} className="anim" eager key={`sc-${card.slug}`} />}
            <div className="body">
              <div className="vis">{card.kind}</div>
              <h4>
                {card.title}{' '}
                <button type="button" className="ww-btn ww-btn-sm" onClick={() => say(card.slug, card.title)}>
                  🔊 Posłuchaj
                </button>
              </h4>
              <div className="facts">
                <button type="button" className="fact" data-role="play" onClick={() => say(card.slug, card.title)}>
                  <b>{card.title}</b>
                  <span>{card.sub}</span>
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </TrainerShell>
  );
}
