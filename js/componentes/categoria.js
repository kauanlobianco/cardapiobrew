import { html } from '../util/dom.js';
import { caminhoFoto } from '../util/formato.js';
import { midia } from '../dados/midia.js';
import { cartao, linha, linhaVinho, midiaDe, ICONE_PLAY, precos } from './item.js';

function capa(cat) {
  const m = midia[cat.capa];
  if (!m?.foto) return '';
  const img = html`<img src="${caminhoFoto(cat.capa)}" alt="" width="800" height="350" loading="lazy" decoding="async">`;
  if (!m.video) return html`<div class="capa">${img}</div>`;
  return html`<button type="button" class="capa" data-video="${cat.capa}" aria-label="Ver ${cat.nome} em vídeo">
    ${img}<span class="play grande" aria-hidden="true">${ICONE_PLAY}</span>
    <span class="legenda">▶ ${cat.nome} em vídeo</span>
  </button>`;
}

function grupo(g, { eagerRestante, vinhos = false }) {
  // carta de vinhos: tudo em linha com a garrafa, sem grade de cards
  const comFoto = vinhos ? [] : g.itens.filter((i) => midiaDe(i).foto);
  const semFoto = vinhos ? g.itens : g.itens.filter((i) => !midiaDe(i).foto);
  const linhaDe = vinhos ? (i) => (i.detalhes || midiaDe(i).foto ? linhaVinho(i) : linha(i)) : linha;

  const cards = comFoto.map((i) => {
    const eager = eagerRestante.n > 0;
    if (eager) eagerRestante.n--;
    return cartao(i, { eager });
  });

  return html`<div class="grupo">
    ${g.nome ? html`<h3>${g.nome}${g.nota ? html` <span class="nota">${g.nota}</span>` : ''}</h3>` : ''}
    ${g.precos ? html`<div class="precos-grupo">${g.precos.map((p) => html`<span>${p.rotulo} <b>R$ ${p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></span>`)}</div>` : ''}
    ${cards.length ? html`<div class="grade">${cards}</div>` : ''}
    ${semFoto.length ? html`<ul class="lista">${semFoto.map(linhaDe)}</ul>` : ''}
  </div>`;
}

// eagerRestante: contador compartilhado — as primeiras N fotos da página
// carregam sem lazy (estão acima da dobra); o resto espera o scroll.
export function categoria(cat, { eagerRestante = { n: 0 } } = {}) {
  const total = cat.grupos.reduce((n, g) => n + g.itens.length, 0);
  return html`<section class="secao ${cat.compacta ? 'compacta' : ''}" id="${cat.id}" aria-labelledby="t-${cat.id}">
    <header>
      <h2 class="rotulo" id="t-${cat.id}">${cat.nome}</h2><span class="contagem">${total} ${total === 1 ? 'item' : 'itens'}</span>
    </header>
    ${cat.capa ? capa(cat) : ''}
    ${cat.grupos.map((g) => grupo(g, { eagerRestante, vinhos: !!cat.vinhos }))}
  </section>`;
}

export { precos };
