const variants = [
  { key: 'orbit', name: 'Orbite' },
  { key: 'atlas', name: 'Atlas' },
  { key: 'depth', name: 'Profondeur' },
];

const positions = {
  'root-tree': [47, 42],
  'river-stone': [36, 65],
  gardener: [66, 58],
  rootkeepers: [28, 38],
  harvesters: [73, 33],
  watchers: [55, 20],
};

let state = null;
let events = [];
let selected = 'root-tree';

function variantFromUrl() {
  const value = new URLSearchParams(location.search).get('variant');
  return variants.some((item) => item.key === value) ? value : 'orbit';
}

function setVariant(key) {
  const url = new URL(location.href);
  url.searchParams.set('variant', key);
  history.replaceState({}, '', url);
  render();
}

function cycleVariant(step) {
  const current = variants.findIndex((item) => item.key === variantFromUrl());
  const next = (current + step + variants.length) % variants.length;
  setVariant(variants[next].key);
}

async function refresh() {
  try {
    const [stateResponse, eventResponse] = await Promise.all([
      fetch('/api/state', { cache: 'no-store' }),
      fetch('/api/events?limit=60', { cache: 'no-store' }),
    ]);
    if (!stateResponse.ok || !eventResponse.ok) throw new Error('World unavailable');
    state = await stateResponse.json();
    events = (await eventResponse.json()).events;
    document.querySelector('#connection-dot').classList.add('live');
    render();
  } catch (error) {
    document.querySelector('#connection-dot').classList.remove('live');
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function phaseEvents(phase, limit = 4) {
  return events.filter((event) => event.phase === phase).slice(-limit).reverse();
}

function eventLabel(event) {
  return escapeHtml(event.species.replaceAll('-', ' '));
}

function beingInspector(id = selected) {
  const being = state.beings[id] ?? state.beings['root-tree'];
  const agency = being.agency
    ? `<div class="agency-mini">${Object.entries(being.agency).map(([name, value]) => `<span title="${escapeHtml(name)}" style="opacity:${Math.max(.25, value)}">${escapeHtml(name)}</span>`).join('')}</div>`
    : '';
  const origin = (being.origin ?? []).map((item) => `<span>${escapeHtml(item)}</span>`).join('');
  return `
    <div class="being-kind">${escapeHtml(being.kind)} · ${escapeHtml(being.archetype)}</div>
    <h2>${escapeHtml(being.name)}</h2>
    ${being.belief ? `<p class="bulletin">${escapeHtml(being.belief)}</p>` : ''}
    <dl class="reflection">
      <div><dt>Que suis-je ?</dt><dd>${escapeHtml(being.kind)}, forme ${escapeHtml(being.archetype)}.</dd></div>
      <div><dt>Où suis-je ?</dt><dd>${escapeHtml(being.where)}</dd></div>
      <div><dt>Pourquoi suis-je ici ?</dt><dd>${escapeHtml(being.why)}</dd></div>
      <div><dt>D'où viens-je ?</dt><dd class="origin-chain">${origin}</dd></div>
      <div><dt>Que deviens-je ?</dt><dd>${escapeHtml(being.becoming)}</dd></div>
      <div><dt>À quoi suis-je relié ?</dt><dd>${escapeHtml((being.relations ?? []).map((relation) => state.beings[relation]?.name ?? relation).join(', '))}</dd></div>
    </dl>
    ${agency}
  `;
}

function elements() {
  return `
    <div class="element-grid">
      <div class="element-meter air"><span>Air · signaux</span><strong>${state.air.signals}</strong></div>
      <div class="element-meter water"><span>Eau · futurs</span><strong>${state.water.dreams.length}</strong></div>
      <div class="element-meter fire"><span>Feu · actes</span><strong>${state.fire.accepted}</strong></div>
      <div class="element-meter earth"><span>Terre · preuves</span><strong>${state.earth.receipts}</strong></div>
    </div>`;
}

function climate() {
  return `<div class="climate">
    ${Object.entries(state.climate).map(([name, value]) => `<div class="climate-row"><span>${escapeHtml(name)}</span><div class="track"><i style="width:${value * 100}%"></i></div><b>${Math.round(value * 100)}</b></div>`).join('')}
  </div>`;
}

function orbitView() {
  const nodes = Object.entries(state.beings).map(([id, being]) => {
    const [x, y] = positions[id] ?? [50, 50];
    return `<button class="being-node" data-being="${id}" data-phase="${being.phase ?? 'terre'}" data-label="${escapeHtml(being.name)}" style="left:${x}%;top:${y}%" aria-label="Observer ${escapeHtml(being.name)}"></button>`;
  }).join('');
  return `<section class="orbit-layout">
    <div class="observatory">
      <div class="observatory-copy"><h1>Un monde qui se souvient.</h1><p>Chaque point est un être. Touchez-le pour écouter son histoire, ses croyances et ce qu'il devient.</p></div>
      <div class="globe-shell"><div class="climate-ring"></div><div class="globe"></div>${nodes}</div>
    </div>
    <aside class="world-sidebar">
      <p>Le monde maintenant</p>
      <blockquote class="bulletin">${escapeHtml(state.bulletin)}</blockquote>
      ${elements()}
      ${climate()}
      <section class="inspector" id="inspector">${beingInspector()}</section>
    </aside>
  </section>`;
}

function atlasView() {
  const beingButtons = Object.entries(state.beings).map(([id, being]) => `<button class="being-button" data-being="${id}"><i></i><span>${escapeHtml(being.name)}<small>${escapeHtml(being.where)}</small></span></button>`).join('');
  const fieldNodes = Object.entries(state.beings).map(([id, being]) => {
    const [x, y] = positions[id] ?? [50, 50];
    return `<button class="field-node" data-being="${id}" style="left:${x}%;top:${y}%"><i></i><span>${escapeHtml(being.name)}</span><small>${escapeHtml(being.archetype)}</small></button>`;
  }).join('');
  const recent = events.slice(-12).reverse().map((event) => `<div class="event" data-phase="${event.phase}"><strong>${eventLabel(event)}</strong><small>tick ${event.tick} · ${escapeHtml(event.actor)}</small></div>`).join('');
  return `<section class="atlas-layout">
    <aside class="being-list"><h1>Les habitants</h1>${beingButtons}</aside>
    <div class="field-map">
      <div class="contour" style="inset:12% 8% 18% 16%;transform:rotate(8deg)"></div>
      <div class="contour" style="inset:25% 24% 30% 28%;transform:rotate(-16deg)"></div>
      <div class="contour" style="inset:39% 37% 40% 42%"></div>
      ${fieldNodes}
      <blockquote class="map-bulletin">${escapeHtml(state.bulletin)}</blockquote>
    </div>
    <aside class="event-river"><h2>La rivière du temps</h2>${recent}</aside>
  </section>`;
}

function depthLayer(phase, name, value) {
  const chips = phaseEvents(phase, 5).map((event) => `<div class="event-chip"><strong>${eventLabel(event)}</strong><small>tick ${event.tick}<br>${escapeHtml(event.actor)}</small></div>`).join('') || '<div class="event-chip"><strong>Silence</strong><small>Aucun événement récent</small></div>';
  return `<section class="layer ${phase}"><div class="layer-name">${name}</div><div class="layer-value">${value}</div><div class="layer-events">${chips}</div></section>`;
}

function depthView() {
  return `<section class="depth-layout">
    <header class="depth-header"><h1>Descendre dans le réel.</h1><p>Un signal traverse des couches de garantie. L'Air perçoit, l'Eau imagine, le Feu transforme et la Terre se souvient.</p></header>
    <div class="strata">
      <div class="layers">
        ${depthLayer('air', 'Air', state.air.signals)}
        ${depthLayer('eau', 'Eau', state.water.dreams.length)}
        ${depthLayer('feu', 'Feu', state.fire.accepted)}
        ${depthLayer('terre', 'Terre', state.earth.receipts)}
      </div>
      <aside class="depth-inspector">${beingInspector()}</aside>
    </div>
  </section>`;
}

function render() {
  if (!state) return;
  const variant = variantFromUrl();
  document.querySelector('#season').textContent = `saison ${state.season}`;
  document.querySelector('#tick').textContent = `tick ${state.tick}`;
  document.querySelector('#variant-name').textContent = variants.find((item) => item.key === variant).name;
  const views = { orbit: orbitView, atlas: atlasView, depth: depthView };
  document.querySelector('#app').innerHTML = views[variant]();
  document.querySelectorAll('[data-being]').forEach((button) => button.addEventListener('click', () => {
    selected = button.dataset.being;
    render();
  }));
}

document.querySelectorAll('[data-view-step]').forEach((button) => button.addEventListener('click', () => cycleVariant(Number(button.dataset.viewStep))));
document.addEventListener('keydown', (event) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
  if (event.key === 'ArrowLeft') cycleVariant(-1);
  if (event.key === 'ArrowRight') cycleVariant(1);
});
window.addEventListener('popstate', render);

refresh();
setInterval(refresh, 2000);

