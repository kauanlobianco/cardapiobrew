import { html } from '../util/dom.js';
import { formatarPreco, bandeiras, caminhoFoto } from '../util/formato.js';
import { midia } from '../dados/midia.js';

export const ICONE_PLAY = html`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;

// Que mídia este item usa? (item.midia permite reaproveitar a de outro id)
export function midiaDe(item) {
  const id = item.midia || item.id;
  const m = midia[id] || {};
  return { id, foto: !!m.foto, video: !!m.video };
}

export function precos(item, { comPontos = true } = {}) {
  const pontos = comPontos ? html`<span class="pontos"></span>` : '';
  if (item.precos) {
    return html`<div class="precos">${item.precos.map((p) => html`
      <div class="preco"><span class="rotulo-preco">${p.rotulo}</span>${pontos}<span class="valor"><small>R$</small>${formatarPreco(p.valor)}</span></div>`)}
    </div>`;
  }
  if (item.preco != null) {
    return html`<div class="precos"><div class="preco">${pontos}<span class="valor"><small>R$</small>${formatarPreco(item.preco)}</span></div></div>`;
  }
  return '';
}

export function sabores(item) {
  if (!item.sabores?.length) return '';
  return html`<ul class="sabores" aria-label="Sabores">${item.sabores.map((s) => html`<li>${s}</li>`)}</ul>`;
}

export function detalhes(item) {
  const d = item.detalhes;
  if (!d) return '';
  return html`<p class="detalhes">${[d.uvas, d.regiao && html`<b>${d.regiao}</b>`, d.teor].filter(Boolean).map((x, i) => html`${i ? ' · ' : ''}${x}`)}</p>`;
}

const nota = (item) => item.nota ? html`<span class="nota">${item.nota}</span>` : '';
const bandeira = (item) => item.pais ? html`<span class="bandeira" title="${item.detalhes?.pais || item.pais}">${bandeiras[item.pais] || ''}</span>` : '';

// Card com foto (e play se houver vídeo). `eager` para o que já está na tela.
export function cartao(item, { eager = false } = {}) {
  const m = midiaDe(item);
  const foto = html`<img src="${caminhoFoto(m.id)}" alt="${item.nome}" width="800" height="600"
      loading="${eager ? 'eager' : 'lazy'}" decoding="async" ${eager ? html`fetchpriority="high"` : ''}>`;
  const midiaEl = m.video
    ? html`<button type="button" class="foto" data-video="${item.id}" aria-label="Ver ${item.nome} em vídeo">
        ${foto}<span class="play" aria-hidden="true">${ICONE_PLAY}</span></button>`
    : html`<div class="foto">${foto}</div>`;

  return html`<article class="card" id="item-${item.id}">
    ${midiaEl}
    <div class="corpo">
      <h4 class="nome">${item.nome}${item.nota ? html` ${nota(item)}` : ''}</h4>
      ${item.desc ? html`<p class="desc">${item.desc}</p>` : ''}
      ${sabores(item)}
      ${precos(item)}
    </div>
  </article>`;
}

// Linha de vinho: miniatura da garrafa (inteira, sem corte) + ficha técnica
export function linhaVinho(item) {
  const m = midiaDe(item);
  return html`<li class="linha vinho" id="item-${item.id}">
    ${m.foto
      ? html`<img class="garrafa" src="${caminhoFoto(m.id)}" alt="" width="120" height="360" loading="lazy" decoding="async">`
      : html`<span class="garrafa vazia" aria-hidden="true"></span>`}
    <div class="texto">
      <div class="cabeca">
        <span class="nome">${item.nome}${bandeira(item)}</span>
        <span class="pontos"></span><span class="valor"><small>R$</small>${formatarPreco(item.preco)}</span>
      </div>
      ${detalhes(item)}
      ${item.desc ? html`<p class="desc">${item.desc}</p>` : ''}
    </div>
  </li>`;
}

// Linha de texto (item sem foto)
export function linha(item) {
  const unico = item.preco != null && !item.precos;
  return html`<li class="linha" id="item-${item.id}">
    <div class="cabeca">
      <span class="nome">${item.nome}${bandeira(item)}</span>
      ${nota(item)}
      ${unico ? html`<span class="pontos"></span><span class="valor"><small>R$</small>${formatarPreco(item.preco)}</span>` : ''}
    </div>
    ${item.desc ? html`<p class="desc">${item.desc}</p>` : ''}
    ${detalhes(item)}
    ${sabores(item)}
    ${unico ? '' : precos(item)}
  </li>`;
}
