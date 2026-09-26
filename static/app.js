const variants = [
  { key: 'guide', name: 'Comprendre' },
  { key: 'orbit', name: 'Orbite' },
  { key: 'atlas', name: 'Atlas' },
  { key: 'depth', name: 'Couches' },
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
let lastEventId = null;
let lastSeason = null;
let transitionTimer = null;

const seasonLanguage = {
  exploration: {
    title: 'Un monde qui cherche.',
    story: "Les signaux s'écartent pour trouver ce qui mérite une question.",
    accent: '#a8e6ef',
    glow: 'rgba(94, 190, 214, .24)',
    night: '#07101b',
  },
  croissance: {
    title: 'Un monde qui prend racine.',
    story: 'Les relations se rapprochent et les possibilités cherchent une forme durable.',
    accent: '#91d5a2',
    glow: 'rgba(105, 199, 143, .25)',
    night: '#07150f',
  },
  récolte: {
    title: 'Un monde qui transforme.',
    story: 'Les futurs éprouvés deviennent des actes, puis des preuves partageables.',
    accent: '#e7ba74',
    glow: 'rgba(231, 172, 92, .25)',
    night: '#171008',
  },
  repos: {
    title: 'Un monde qui se souvient.',
    story: 'Le rythme ralentit pour relire les traces, restaurer les forces et laisser mûrir les croyances.',
    accent: '#afa8e8',
    glow: 'rgba(133, 124, 211, .25)',
    night: '#0b0b19',
  },
};

const phaseNames = { air: 'Air', eau: 'Eau', feu: 'Feu', terre: 'Terre' };

const cycleSteps = [
  { step: 1, phase: 'air', actor: 'Veilleurs', title: 'Observer', detail: "Les Veilleurs regardent l'Arbre racine et produisent un point de vue. Une observation reste une connaissance située, pas la réalité entière." },
  { step: 2, phase: 'air', actor: 'Gardiens des racines', title: 'Observer autrement', detail: "Les Gardiens observent le même Arbre. Le World conserve les deux regards pour mesurer ce qu'ils partagent et ce qui dépend de l'observateur." },
  { step: 3, phase: 'eau', actor: 'Veilleurs', title: 'Reconnaître un motif', detail: 'Les observations répétées forment un nuage d’enquête. Après trois occurrences, le World reconnaît enquête comme une nouvelle espèce de connaissance.' },
  { step: 4, phase: 'eau', actor: 'Jardinier', title: 'Imaginer un futur', detail: "Le Jardinier propose un rêve de soin, de récolte ou de migration. Ce futur est une possibilité. Il n'a encore rien changé au monde." },
  { step: 5, phase: 'eau', actor: 'Communautés', title: 'Comparer les croyances', detail: "Les Gardiens veulent préserver, les Récolteurs veulent transformer avec consentement et les Veilleurs demandent une preuve. Leur désaccord reste distinct des faits." },
  { step: 6, phase: 'feu', actor: 'Jardinier et World', title: 'Tenter une transformation', detail: "Le Jardinier demande un soin. Le World vérifie l'énergie, la saison et les futurs disponibles. Il accepte et produit un reçu, ou refuse sans modifier la Terre." },
  { step: 7, phase: 'air', actor: 'Arbre racine', title: 'Propager une vague', detail: "L'Arbre envoie un signal au Jardinier, aux Veilleurs puis aux Récolteurs. Son amplitude baisse quand les tensions de croyance augmentent." },
  { step: 0, phase: 'terre', actor: 'Jardinier', title: 'Se reposer', detail: "Le Jardinier récupère une unité d'énergie. Si trop de futurs se sont accumulés, le plus ancien retourne au compost." },
];

const actorExplanations = {
  world: {
    name: 'Le World',
    kind: 'système',
    role: 'Gardien des lois et du temps',
    summary: 'Il avance le cycle, vérifie les limites, accepte ou refuse les transformations et écrit les preuves.',
    actions: ['fait avancer un tick toutes les deux secondes', 'choisit l’étape du cycle', 'sépare état, observations, rêves et croyances', 'persiste state.json et ajoute chaque événement à events.jsonl'],
    limit: 'Il ne possède ni intention personnelle ni croyance dans cette expérience.',
  },
  'root-tree': {
    role: 'Mémoire fondatrice à protéger',
    summary: "Il représente la continuité du monde. Il reçoit les soins et propage une vague vers les autres habitants.",
    actions: ['reçoit les transformations acceptées', 'gagne de la vitalité après un soin', 'émet une vague à la septième étape'],
    limit: 'Il ne choisit pas lui-même le soin qui lui est appliqué.',
  },
  'river-stone': {
    role: 'Témoin de provenance',
    summary: 'Il montre qu’un artefact peut raconter son origine, du grès au sable puis au quartz.',
    actions: ['porte une chaîne d’origine', 'reste relié aux Veilleurs comme objet de preuve'],
    limit: 'Il ne déclenche encore aucune action dans la simulation.',
  },
  gardener: {
    role: 'Agent de soin et de transformation',
    summary: 'Il imagine les futurs, demande leur réalisation et récupère son énergie pendant le repos.',
    actions: ['fait naître un rêve à la quatrième étape', 'tente un soin à la sixième étape', 'dépense deux unités d’énergie si le soin est accepté', 'récupère une unité au repos'],
    limit: 'Il ne peut pas contourner un refus du World.',
  },
  rootkeepers: {
    role: 'Communauté de préservation',
    summary: "Ils observent l'Arbre et défendent la continuité de ce qui existe déjà.",
    actions: ['produisent le second regard du cycle', 'portent la croyance préserver', 'participent aux tensions avec les Récolteurs'],
    limit: 'Ils ne bloquent pas directement une transformation. Leur position reste une croyance exprimée.',
  },
  harvesters: {
    role: 'Communauté de transformation',
    summary: 'Ils défendent une transformation qui nourrit le monde et respecte le consentement.',
    actions: ['portent la croyance transformer avec consentement', 'reçoivent les vagues émises par l’Arbre', 'participent aux tensions de croyance'],
    limit: 'Ils ne récoltent rien directement dans la simulation actuelle.',
  },
  watchers: {
    role: 'Communauté d’observation',
    summary: 'Ils cherchent des preuves, regroupent les motifs répétés et maintiennent le doute visible.',
    actions: ['produisent le premier regard du cycle', 'créent les nuages d’enquête', 'demandent une preuve supplémentaire dans les débats'],
    limit: 'Leur observation est une connaissance située. Elle ne devient pas automatiquement une vérité.',
  },
};

function variantFromUrl() {
  const value = new URLSearchParams(location.search).get('variant');
  return variants.some((item) => item.key === value) ? value : 'guide';
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
    applyWorldExpression();
    render();
  } catch (error) {
    document.querySelector('#connection-dot').classList.remove('live');
  }
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function fallbackPosition(id) {
  const hash = [...id].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7);
  const angle = (hash % 360) * (Math.PI / 180);
  const radius = 19 + (hash % 17);
  return [50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius];
}

function positionFor(id, index) {
  const [baseX, baseY] = positions[id] ?? fallbackPosition(id);
  const pressure = state?.climate?.pressure ?? 0;
  const entropy = state?.climate?.entropy ?? 0;
  const tick = state?.tick ?? 0;
  const driftX = Math.sin((tick + index * 11) / 9) * (0.5 + pressure * 3.2);
  const driftY = Math.cos((tick + index * 7) / 11) * (0.5 + entropy * 2.6);
  return [clamp(baseX + driftX, 10, 90), clamp(baseY + driftY, 10, 90)];
}

function expressionForWorld() {
  const recent = events.slice(-16);
  const counts = { air: 0, eau: 0, feu: 0, terre: 0 };
  recent.forEach((event) => { counts[event.phase] = (counts[event.phase] ?? 0) + 1; });
  const dominant = Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'terre';
  const entropy = state.climate.entropy;
  const pressure = state.climate.pressure;
  const vitalityValues = Object.values(state.beings).map((being) => being.health ?? 0.7);
  const vitality = vitalityValues.reduce((total, value) => total + value, 0) / Math.max(1, vitalityValues.length);
  const mood = entropy > 0.66 ? 'tendu' : entropy > 0.36 ? 'attentif' : 'calme';
  const rhythm = pressure > 0.66 ? 'dense' : pressure > 0.28 ? 'en mouvement' : 'ample';
  const season = seasonLanguage[state.season] ?? seasonLanguage.exploration;
  return { ...season, dominant, vitality, mood, rhythm };
}

function signalTransition(event) {
  if (!lastEventId || event.event_id === lastEventId) return;
  const body = document.body;
  body.classList.remove('event-burst', 'birth-burst', 'refusal-burst', 'season-burst');
  body.style.setProperty('--phase-burst', {
    air: 'rgba(168, 230, 239, .24)',
    eau: 'rgba(85, 116, 201, .28)',
    feu: 'rgba(244, 123, 69, .28)',
    terre: 'rgba(184, 146, 102, .26)',
  }[event.phase] ?? 'rgba(168, 230, 239, .2)');
  body.classList.add('event-burst');
  if (event.species === 'naissance-espèce') body.classList.add('birth-burst');
  if (event.species === 'feu-refusé') body.classList.add('refusal-burst');
  if (lastSeason && state.season !== lastSeason) body.classList.add('season-burst');
  clearTimeout(transitionTimer);
  transitionTimer = setTimeout(() => body.classList.remove('event-burst', 'birth-burst', 'refusal-burst', 'season-burst'), 1700);
}

function applyWorldExpression() {
  const expression = expressionForWorld();
  const root = document.documentElement;
  const body = document.body;
  const event = state.last_event ?? events.at(-1);
  root.style.setProperty('--world-accent', expression.accent);
  root.style.setProperty('--world-glow', expression.glow);
  root.style.setProperty('--world-night', expression.night);
  root.style.setProperty('--world-temperature', state.climate.temperature);
  root.style.setProperty('--world-pressure', state.climate.pressure);
  root.style.setProperty('--world-entropy', state.climate.entropy);
  root.style.setProperty('--world-vitality', expression.vitality.toFixed(3));
  const pulseDuration = 5.8 - state.climate.entropy * 3.1;
  root.style.setProperty('--pulse-duration', `${pulseDuration.toFixed(2)}s`);
  root.style.setProperty('--pulse-offset', `${(-pulseDuration / 2).toFixed(2)}s`);
  root.style.setProperty('--world-overlay-opacity', (0.08 + state.climate.pressure * 0.24).toFixed(3));
  root.style.setProperty('--world-noise-opacity', (0.16 + state.climate.entropy * 0.24).toFixed(3));
  root.style.setProperty('--world-aura-opacity', (0.08 + state.climate.pressure * 0.42).toFixed(3));
  root.style.setProperty('--world-scale', (1 + state.climate.entropy * 0.06).toFixed(3));
  root.style.setProperty('--turn-duration', `${(90 - state.climate.entropy * 55).toFixed(1)}s`);
  root.style.setProperty('--globe-breathe-scale', (1 + state.climate.pressure * 0.018).toFixed(4));
  root.style.setProperty('--vitality-opacity', (0.55 + expression.vitality * 0.45).toFixed(3));
  root.style.setProperty('--vitality-brightness', (0.9 + expression.vitality * 0.35).toFixed(3));
  root.style.setProperty('--world-life-glow', `rgba(139, 209, 154, ${(0.06 + expression.vitality * 0.18).toFixed(3)})`);
  root.style.setProperty('--globe-shadow', `${Math.round(60 + state.climate.pressure * 90)}px`);
  body.dataset.season = state.season;
  body.dataset.dominant = expression.dominant;
  body.dataset.mood = expression.mood;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', expression.night);
  document.querySelector('#world-mood').textContent = `${expression.mood} · ${phaseNames[expression.dominant]} domine`;
  if (event) signalTransition(event);
  lastEventId = event?.event_id ?? lastEventId;
  lastSeason = state.season;
}

function expressionPanel() {
  const expression = expressionForWorld();
  const species = state.earth.species.length;
  return `<section class="world-expression" aria-label="Expression actuelle du monde">
    <div class="expression-head"><span>Forme sensible</span><strong>${escapeHtml(expression.mood)}</strong></div>
    <p>${escapeHtml(expression.story)}</p>
    <div class="expression-facts">
      <span><i class="phase-seed ${expression.dominant}"></i>${phaseNames[expression.dominant]} domine</span>
      <span>${escapeHtml(expression.rhythm)}</span>
      <span>${species} espèces connues</span>
    </div>
  </section>`;
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

function actorName(actor) {
  const fixed = {
    world: 'Le World',
    constitution: 'La Constitution',
    communities: 'Les communautés',
  };
  return state.beings[actor]?.name ?? fixed[actor] ?? actor;
}

function proposalName(value) {
  return value ? String(value).replace(/^dream-/, 'proposition ') : 'proposition choisie';
}

function explainEvent(event) {
  const payload = event.payload ?? {};
  const explanations = {
    observation: {
      title: `${actorName(event.actor)} ${['watchers', 'rootkeepers', 'communities'].includes(event.actor) ? 'ont observé' : 'a observé'} l’Arbre`,
      type: 'connaissance',
      text: `Un nouveau point de vue a été enregistré. ${payload.distinct_events ?? 0} événements distincts sont connus après ${payload.views ?? 0} regards. Cela décrit ce que l’observateur a vu, pas toute la réalité.`,
    },
    'nuage-enquête': {
      title: 'Un motif répété devient une enquête',
      type: 'connaissance',
      text: `Le motif observation, preuve, question est apparu ${payload.occurrences ?? 0} fois. Le World le regroupe pour pouvoir le suivre sans le déclarer vrai pour autant.`,
    },
    'naissance-espèce': {
      title: `Une nouvelle espèce est reconnue: ${payload.name ?? 'inconnue'}`,
      type: 'réalité',
      text: 'Le motif a franchi le seuil prévu par les lois. Il entre dans les espèces que la Terre sait relire.',
    },
    'rêve-né': {
      title: `Le Jardinier imagine un futur de ${payload.kind ?? 'transformation'}`,
      type: 'possibilité',
      text: payload.story ?? 'Un futur possible rejoint l’Eau. Rien n’est encore appliqué.',
    },
    'tension-croyances': {
      title: 'Les communautés ne donnent pas le même sens au fait',
      type: 'croyance',
      text: 'Elles partagent le constat que l’Arbre demande un soin. Elles divergent sur la réponse: préserver, transformer avec consentement ou attendre une preuve.',
    },
    soin: {
      title: 'Le Jardinier tente un soin',
      type: 'action',
      text: `Il présente la ${proposalName(payload.dream)} au Feu et engage ${payload.energy_cost ?? 0} unités d’énergie. La Terre doit encore confirmer le résultat.`,
    },
    'reçu-transformation': {
      title: 'Le soin est devenu une réalité vérifiable',
      type: 'réalité',
      text: `La vitalité de l’Arbre est passée de ${payload.before ?? '?'} à ${payload.after ?? '?'}. Le reçu relie le résultat à la ${proposalName(payload.dream)}.`,
    },
    'feu-refusé': {
      title: 'Le World refuse la transformation',
      type: 'réalité',
      text: `Motif: ${payload.reason ?? 'limite inconnue'}. La Terre n’a pas été modifiée. Le refus protège une limite au lieu de simuler une réussite.`,
    },
    vague: {
      title: 'L’Arbre propage un signal',
      type: 'connaissance',
      text: `La vague traverse ${(payload.path ?? []).map(actorName).join(' puis ')}. Son amplitude finale est ${payload.amplitude_at_edge ?? '?'}.`,
    },
    repos: {
      title: 'Le Jardinier récupère son énergie',
      type: 'réalité',
      text: `Son énergie passe de ${payload.energy_before ?? '?'} à ${payload.energy_after ?? '?'}. ${payload.composted_dream ? `Le futur ${payload.composted_dream} retourne au compost.` : 'Aucun futur n’a été composté.'}`,
    },
    genèse: {
      title: 'Le monde a été initialisé',
      type: 'réalité',
      text: `La version ${payload.laws_version ?? '?'} des lois a créé le premier état et son premier reçu.`,
    },
  };
  return explanations[event.species] ?? {
    title: event.species.replaceAll('-', ' '),
    type: event.phase === 'eau' ? 'possibilité' : 'connaissance',
    text: `${actorName(event.actor)} a produit cet événement pendant la phase ${phaseNames[event.phase] ?? event.phase}.`,
  };
}

function actorMetric(id, being) {
  if (id === 'world') return `tick ${state.tick} · ${state.status}`;
  if (id === 'gardener') return `${being.energy ?? 0} unités d’énergie`;
  if (id === 'root-tree') return `${Math.round((being.health ?? 0) * 100)} % de vitalité`;
  if (id === 'watchers') return `${state.air.views} observations cumulées`;
  if (being.belief) return `croyance: ${being.belief}`;
  return 'état stable';
}

function actorCard(id) {
  const being = id === 'world' ? actorExplanations.world : state.beings[id];
  const explanation = actorExplanations[id] ?? {};
  const relations = id === 'world' ? Object.values(state.beings).map((item) => item.name) : (being.relations ?? []).map((relation) => state.beings[relation]?.name ?? relation);
  const actions = (explanation.actions ?? []).map((action) => `<li>${escapeHtml(action)}</li>`).join('');
  return `<article class="actor-card${id === 'world' ? ' system-card' : ''}" data-phase="${being.phase ?? 'terre'}">
    <div class="actor-card-head">
      <div><span>${escapeHtml(being.kind ?? explanation.kind ?? 'habitant')}</span><h3>${escapeHtml(being.name ?? explanation.name ?? id)}</h3></div>
      <strong>${escapeHtml(explanation.role ?? being.why)}</strong>
    </div>
    <p>${escapeHtml(explanation.summary ?? being.why)}</p>
    <div class="actor-now">Maintenant: ${escapeHtml(actorMetric(id, being))}</div>
    <details open>
      <summary>Voir ses actions exactes</summary>
      <ul>${actions}</ul>
      <p><b>Limite:</b> ${escapeHtml(explanation.limit ?? 'Aucune limite décrite.')}</p>
      ${relations.length ? `<p><b>Relié à:</b> ${escapeHtml(relations.join(', '))}</p>` : ''}
    </details>
  </article>`;
}

function guideView() {
  const completedStep = cycleSteps.find((item) => item.step === state.tick % 8) ?? cycleSteps[0];
  const completedIndex = cycleSteps.indexOf(completedStep);
  const nextStep = cycleSteps[(completedIndex + 1) % cycleSteps.length];
  const latest = state.last_event ?? events.at(-1);
  const latestExplanation = latest ? explainEvent(latest) : null;
  const cycle = cycleSteps.map((step, index) => `<li class="cycle-step${step.step === completedStep.step ? ' current' : ''}" data-phase="${step.phase}">
    <span class="cycle-number">${index + 1}</span>
    <div><strong>${escapeHtml(step.title)}</strong><small>${escapeHtml(step.actor)} · ${phaseNames[step.phase]}</small><p>${escapeHtml(step.detail)}</p></div>
  </li>`).join('');
  const actors = ['world', ...Object.keys(state.beings)].map(actorCard).join('');
  const recent = events.slice(-8).reverse().map((event) => {
    const explanation = explainEvent(event);
    return `<article class="plain-event" data-type="${explanation.type}"><div><span>${escapeHtml(explanation.type)}</span><small>tick ${event.tick}</small></div><h3>${escapeHtml(explanation.title)}</h3><p>${escapeHtml(explanation.text)}</p></article>`;
  }).join('');
  return `<section class="guide-layout">
    <header class="guide-hero">
      <div class="guide-title"><span class="season-kicker">mode comprendre · saison ${escapeHtml(state.season)}</span><h1>Voici ce qui tourne réellement.</h1><p>World Lab répète un cycle de huit étapes. Des habitants observent, imaginent, débattent et tentent des transformations. Le World applique les lois et écrit ce qui s’est vraiment passé.</p></div>
      <aside class="now-card">
        <span>Étape terminée au tick ${state.tick}</span>
        <h2>${escapeHtml(latestExplanation?.title ?? completedStep.title)}</h2>
        <p>${escapeHtml(latestExplanation?.text ?? completedStep.detail)}</p>
        <div class="now-next">Ensuite: <strong>${escapeHtml(nextStep.actor)} va ${escapeHtml(nextStep.title.toLowerCase())}</strong></div>
      </aside>
    </header>

    <section class="guide-block cycle-block">
      <div class="guide-heading"><span>01</span><div><h2>Comment le monde avance</h2><p>Une boucle fixe rend chaque cause visible. L’étape éclairée est celle qui vient de finir.</p></div></div>
      <ol class="cycle-list">${cycle}</ol>
    </section>

    <section class="guide-block actors-block">
      <div class="guide-heading"><span>02</span><div><h2>Qui fait quoi</h2><p>Chaque carte sépare le rôle annoncé, les actions réellement codées et les limites actuelles.</p></div></div>
      <div class="actor-grid">${actors}</div>
    </section>

    <section class="guide-block events-block">
      <div class="guide-heading"><span>03</span><div><h2>Ce qui vient de se passer</h2><p>Les événements techniques sont traduits en conséquences lisibles.</p></div></div>
      <div class="guide-columns">
        <div class="plain-events">${recent}</div>
        <aside class="truth-legend">
          <h3>Quatre statuts à ne pas confondre</h3>
          <div data-type="réalité"><strong>Réalité</strong><p>État écrit ou reçu vérifiable. Il décrit ce qui a effectivement changé.</p></div>
          <div data-type="connaissance"><strong>Connaissance</strong><p>Observation ou motif tiré du monde. Elle garde sa provenance et peut être incomplète.</p></div>
          <div data-type="croyance"><strong>Croyance</strong><p>Position défendue par une communauté. Plusieurs croyances peuvent partager les mêmes faits.</p></div>
          <div data-type="possibilité"><strong>Possibilité</strong><p>Futur imaginé dans l’Eau. Il ne devient réel qu’après le Feu et un reçu de la Terre.</p></div>
        </aside>
      </div>
    </section>
  </section>`;
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
  const expression = expressionForWorld();
  const nodes = Object.entries(state.beings).map(([id, being], index) => {
    const [x, y] = positionFor(id, index);
    const health = being.health ?? 0.7;
    return `<button class="being-node${selected === id ? ' selected' : ''}" data-being="${id}" data-phase="${being.phase ?? 'terre'}" data-label="${escapeHtml(being.name)}" style="left:${x}%;top:${y}%;--health:${health};--node-scale:${(.76 + health * .36).toFixed(3)};--node-delay:${index * -.7}s" aria-label="Observer ${escapeHtml(being.name)}, vitalité ${Math.round(health * 100)} pour cent"></button>`;
  }).join('');
  return `<section class="orbit-layout">
    <div class="observatory">
      <div class="observatory-copy"><span class="season-kicker">saison ${escapeHtml(state.season)}</span><h1>${escapeHtml(expression.title)}</h1><p>${escapeHtml(expression.story)} Chaque point reste un être que vous pouvez écouter.</p></div>
      <div class="globe-shell"><div class="world-aura aura-one"></div><div class="world-aura aura-two"></div><div class="climate-ring"></div><div class="globe"></div>${nodes}</div>
    </div>
    <aside class="world-sidebar">
      <p>Le monde maintenant</p>
      <blockquote class="bulletin">${escapeHtml(state.bulletin)}</blockquote>
      ${expressionPanel()}
      ${elements()}
      ${climate()}
      <section class="inspector" id="inspector">${beingInspector()}</section>
    </aside>
  </section>`;
}

function atlasView() {
  const beingButtons = Object.entries(state.beings).map(([id, being]) => `<button class="being-button" data-being="${id}"><i></i><span>${escapeHtml(being.name)}<small>${escapeHtml(being.where)}</small></span></button>`).join('');
  const placed = Object.entries(state.beings).map(([id, being], index) => ({ id, being, position: positionFor(id, index) }));
  const fieldNodes = placed.map(({ id, being, position: [x, y] }) => {
    return `<button class="field-node" data-being="${id}" data-phase="${being.phase ?? 'terre'}" style="left:${x}%;top:${y}%;--health:${being.health ?? .7}"><i></i><span>${escapeHtml(being.name)}</span><small>${escapeHtml(being.archetype)}</small></button>`;
  }).join('');
  const placedById = Object.fromEntries(placed.map((item) => [item.id, item]));
  const relationLines = placed.flatMap(({ id, being, position: [x1, y1] }) => (being.relations ?? []).map((relation) => {
    const target = placedById[relation];
    if (!target || id > relation) return '';
    return `<line x1="${x1}" y1="${y1}" x2="${target.position[0]}" y2="${target.position[1]}"></line>`;
  })).join('');
  const recent = events.slice(-12).reverse().map((event) => `<div class="event" data-phase="${event.phase}"><strong>${eventLabel(event)}</strong><small>tick ${event.tick} · ${escapeHtml(event.actor)}</small></div>`).join('');
  return `<section class="atlas-layout">
    <aside class="being-list"><h1>Les habitants</h1>${beingButtons}</aside>
    <div class="field-map">
      <svg class="relation-field" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${relationLines}</svg>
      <div class="contour" style="inset:12% 8% 18% 16%;transform:rotate(8deg)"></div>
      <div class="contour" style="inset:25% 24% 30% 28%;transform:rotate(-16deg)"></div>
      <div class="contour" style="inset:39% 37% 40% 42%"></div>
      ${fieldNodes}
      <div class="map-narrative">${expressionPanel()}<blockquote class="map-bulletin">${escapeHtml(state.bulletin)}</blockquote></div>
    </div>
    <aside class="event-river"><h2>La rivière du temps</h2>${recent}</aside>
  </section>`;
}

function depthLayer(phase, name, value) {
  const chips = phaseEvents(phase, 5).map((event) => `<div class="event-chip"><strong>${eventLabel(event)}</strong><small>tick ${event.tick}<br>${escapeHtml(event.actor)}</small></div>`).join('') || '<div class="event-chip"><strong>Silence</strong><small>Aucun événement récent</small></div>';
  return `<section class="layer ${phase}"><div class="layer-name">${name}</div><div class="layer-value">${value}</div><div class="layer-events">${chips}</div></section>`;
}

function depthView() {
  const expression = expressionForWorld();
  return `<section class="depth-layout">
    <header class="depth-header"><span class="season-kicker">${escapeHtml(expression.mood)} · ${escapeHtml(expression.rhythm)}</span><h1>${escapeHtml(expression.title)}</h1><p>${escapeHtml(expression.story)} Un signal traverse ensuite les couches de garantie: l'Air perçoit, l'Eau imagine, le Feu transforme et la Terre se souvient.</p></header>
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
  const views = { guide: guideView, orbit: orbitView, atlas: atlasView, depth: depthView };
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
