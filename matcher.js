/* Mo's Dash - Label Check matcher
   Reads the avoid list, checks ingredient text against it,
   and pulls out gluten-free claims and "may contain" warnings. */
(function (root) {

  /* ---------- text cleanup ---------- */
  function normalize(s) {
    return ' ' + String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')   // jalapeño -> jalapeno
      .toLowerCase()
      .replace(/[‘’ʼ]/g, "'")              // curly apostrophes
      .replace(/-\s*\n\s*/g, '-')                         // OCR line-break hyphens: "corn-\nstarch" -> "corn-starch"
      .replace(/[^a-z0-9']+/g, ' ')                       // all other punctuation -> space
      .replace(/\s+/g, ' ')
      .trim() + ' ';
  }

  function singular(w) { return w.replace(/('s|es|s)$/, ''); }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // whole-word match, plural optional
  function termRegex(term) {
    const t = normalize(term).trim().split(' ').map(escapeRe).join('\\s+');
    return new RegExp('(?<![a-z0-9])' + t + "(?:s|es|'s)?(?![a-z0-9])", 'g');
  }

  /* ---------- avoid list parsing ---------- */
  function parseList(text) {
    const rules = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      line = line.trim();
      if (!line || line[0] === '#') return;
      const colon = line.indexOf(':');
      if (colon < 1) return;
      let name = line.slice(0, colon).trim();
      let maybe = false;
      if (name[0] === '?') { maybe = true; name = name.slice(1).trim(); }
      const terms = [], exceptions = [];
      line.slice(colon + 1).split(',').forEach(function (raw) {
        let t = raw.trim();
        if (!t) return;
        if (t[0] === '!') { t = t.slice(1).trim(); if (t) exceptions.push(t); }
        else terms.push(t);
      });
      if (!terms.length) return;
      // longest exceptions first so "gluten free soy sauce" beats "gluten free"
      exceptions.sort(function (a, b) { return b.length - a.length; });
      rules.push({
        name: name, maybe: maybe, terms: terms, exceptions: exceptions,
        termRes: terms.map(function (t) { return { term: t, re: termRegex(t) }; }),
        excRes: exceptions.map(termRegex)
      });
    });
    return rules;
  }

  /* ---------- find the ingredients section ---------- */
  // Photos include the whole label. "No corn syrup!" on the front
  // shouldn't count, so try to isolate the actual ingredient list.
  function extractIngredients(raw) {
    const text = String(raw || '');
    const start = text.search(/ingred[il1]ents?\s*[:;.]?/i);
    if (start < 0) return { text: text, found: false };
    let rest = text.slice(start).replace(/^ingred[il1]ents?\s*[:;.]?\s*/i, '');
    const stop = rest.search(/\b(contains\s*:|allergen|distributed by|manufactured by|made by|packed by|produced by|may contain|processed in|produced in a|manufactured in a|manufactured on|made in a|keep refrigerated|best by|nutrition facts)/i);
    if (stop > 0) rest = rest.slice(0, stop);
    return { text: rest.trim(), found: true };
  }

  /* ---------- check ingredients against the list ---------- */
  function checkIngredients(text, rules) {
    const norm = normalize(text);
    const hits = [];
    rules.forEach(function (rule) {
      let t = norm;
      rule.excRes.forEach(function (re) { re.lastIndex = 0; t = t.replace(re, ' # '); });
      const found = [];
      rule.termRes.forEach(function (tr) {
        tr.re.lastIndex = 0;
        let m;
        while ((m = tr.re.exec(t)) !== null) {
          const word = m[0].trim();
          if (!found.some(function (f) { return singular(f) === singular(word); })) found.push(word);
        }
      });
      // drop a short find if a longer one already covers it ("corn" inside "corn syrup")
      const trimmed = found.filter(function (f) {
        return !found.some(function (g) { return g !== f && g.length > f.length && (' ' + g + ' ').indexOf(' ' + f) >= 0; });
      });
      if (trimmed.length) hits.push({ name: rule.name, maybe: rule.maybe, found: trimmed });
    });
    return hits;
  }

  /* ---------- gluten-free claim + cross-contamination warnings ---------- */
  const WARN_PATTERNS = [
    /may\s+contain/i,
    /may\s+also\s+contain/i,
    /(processed|produced|manufactured|made|packed|packaged)\s+(in|on|at)\s+(a\s+)?(facility|plant|site|equipment|shared|the\s+same)/i,
    /(shared|same)\s+(equipment|facility|production\s+line|line)/i,
    /cross[\s-]*contact/i
  ];

  function sentenceAround(text, idx) {
    let s = idx;
    const back = Math.max(0, idx - 120);
    while (s > back && !/[.\n]/.test(text[s - 1])) s--;
    let e = idx;
    const fwd = Math.min(text.length, idx + 220);
    while (e < fwd && text[e] !== '.') e++;
    return text.slice(s, e).replace(/\s+/g, ' ').trim();
  }

  function findWarnings(raw) {
    const text = String(raw || '');
    const out = [];
    WARN_PATTERNS.forEach(function (re) {
      const m = re.exec(text);
      if (m) {
        const s = sentenceAround(text, m.index);
        if (s && out.indexOf(s) < 0) out.push(s);
      }
    });
    return out;
  }

  function findContains(raw) {
    const m = /\b(contains|allergens?)\s*:\s*([^\n.]+)/i.exec(String(raw || ''));
    return m ? m[2].trim() : '';
  }

  function hasGfClaim(raw) {
    return /gluten\s*[-–]?\s*free|certified\s+gluten|\bno\s+gluten\b|\bglutenfree\b/i.test(String(raw || ''));
  }

  const GLUTEN_WORDS = /wheat|gluten|barley|\brye\b|oat|spelt|malt/i;

  /* ---------- the full verdict ---------- */
  // src: { text, gfLabel (bool|null), containsGluten (bool), traces: [str], allergens: [str] }
  function analyze(src, rules) {
    const raw = src.text || '';
    const section = src.fromBarcode ? { text: raw, found: true } : extractIngredients(raw);
    const hits = checkIngredients(section.text, rules);

    // also run the "Contains:" line, since it's the label's own summary
    const containsLine = src.fromBarcode ? '' : findContains(raw);
    if (containsLine) {
      checkIngredients(containsLine, rules).forEach(function (h) {
        const existing = hits.filter(function (x) { return x.name === h.name; })[0];
        if (existing) h.found.forEach(function (f) {
          if (!existing.found.some(function (g) { return singular(g) === singular(f) || (' ' + g + ' ').indexOf(' ' + f + ' ') >= 0; })) existing.found.push(f);
        });
        else hits.push(h);
      });
    }

    const warnings = src.fromBarcode ? (src.traces || []).map(function (t) { return 'May contain: ' + t; }) : findWarnings(raw);

    const glutenHit = hits.some(function (h) { return !h.maybe && /gluten/i.test(h.name); }) || !!src.containsGluten;
    const gfClaim = src.fromBarcode ? !!src.gfLabel : hasGfClaim(raw);
    const glutenMaybe = hits.some(function (h) { return h.maybe && /gluten/i.test(h.name); });

    let gf;
    if (glutenHit && gfClaim) gf = { level: 'warn', text: 'Says gluten-free, but I found a gluten ingredient. Read it yourself.' };
    else if (glutenHit) gf = { level: 'bad', text: 'Contains gluten' };
    else if (gfClaim) gf = { level: 'good', text: 'Labeled gluten-free' };
    else if (glutenMaybe) gf = { level: 'warn', text: 'No obvious gluten, not labeled GF, and has a maybe' };
    else gf = { level: 'meh', text: 'No gluten ingredients spotted, but not labeled GF' };

    const glutenWarnings = warnings.filter(function (w) { return GLUTEN_WORDS.test(w); });
    let facility;
    if (glutenWarnings.length) facility = { level: 'warn', text: 'Shared facility or may-contain warning for gluten' };
    else if (warnings.length) facility = { level: 'meh', text: 'Has a may-contain warning (not gluten)' };
    else facility = { level: 'meh', text: 'No may-contain warning found. Not a guarantee, plenty of brands just don\'t print one.' };

    return {
      hits: hits,
      hard: hits.filter(function (h) { return !h.maybe; }),
      maybes: hits.filter(function (h) { return h.maybe; }),
      gf: gf,
      facility: facility,
      warnings: warnings,
      containsLine: containsLine,
      sectionFound: section.found,
      ingredientsText: section.text
    };
  }

  const api = { normalize: normalize, parseList: parseList, extractIngredients: extractIngredients,
    checkIngredients: checkIngredients, findWarnings: findWarnings, findContains: findContains,
    hasGfClaim: hasGfClaim, analyze: analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MoMatcher = api;
})(this);
