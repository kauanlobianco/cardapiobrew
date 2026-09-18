import { html } from '../util/dom.js';
import { cartao } from './item.js';

// Faixa horizontal com os itens em destaque (a página "Best BBQ" do impresso).
export function destaques(bloco, porId) {
  const itens = bloco.itens.map((id) => porId.get(id)).filter(Boolean);
  if (!itens.length) return '';
  return html`<section class="destaques" aria-label="${bloco.titulo}">
    <header><h2 class="rotulo ouro">${bloco.titulo}</h2></header>
    <div class="faixa">${itens.map((i, n) => cartao(i, { eager: n < 2 }))}</div>
  </section>`;
}
