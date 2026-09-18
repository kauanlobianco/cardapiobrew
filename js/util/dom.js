// Template literal `html` com escape automático: tudo que é interpolado vira
// texto seguro, a não ser que seja outro `html`...`` (ou `raw()`).

class Bruto {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

export const raw = (s) => new Bruto(String(s));

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function render(v) {
  if (v == null || v === false) return '';
  if (v instanceof Bruto) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => { out += s + (i < vals.length ? render(vals[i]) : ''); });
  return new Bruto(out);
}

export function montar(alvo, conteudo) {
  alvo.innerHTML = String(conteudo);
  return alvo;
}
