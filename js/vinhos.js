// Carta de vinhos — página própria (/vinhos/), com QR Code dedicado.
// Os vinhos vêm da mesma fonte do cardápio: a categoria `adega-brew` em
// js/dados/cardapio.js. Editou lá, muda aqui e no cardápio ao mesmo tempo.
import { restaurante, categorias } from './dados/cardapio.js';
import { html, montar } from './util/dom.js';
import { bandeiras } from './util/formato.js';

const BASE = '../'; // a página mora em /vinhos/
const foto = (item) => `${BASE}media/fotos/${item.midia || item.id}.webp`;
const valor = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });

const adega = categorias.find((c) => c.vinhos);
const todos = adega.grupos.flatMap((g) => g.itens);
const porId = new Map(todos.map((i) => [i.id, i]));
const comFicha = (i) => !!i.detalhes;

// agrupa os grupos do cardápio em capítulos: Espumantes / Brancos / Tintos (por país) / Taça
const capitulos = [];
for (const g of adega.grupos) {
  const vinhos = g.itens.filter(comFicha);
  if (!vinhos.length) continue;
  const tinto = /^tintos?$/i.test(g.nome);
  const id = tinto ? 'tintos' : slug(g.nome);
  let cap = capitulos.find((c) => c.id === id);
  if (!cap) {
    cap = { id, nome: tinto ? 'Tintos' : g.nome.replace(/^Vinhos\s+/i, ''), nota: tinto ? 'Velho e Novo Mundo' : g.nota, paises: [] };
    capitulos.push(cap);
  }
  cap.paises.push({ nome: tinto ? g.nota : null, vinhos });
}
const taca = todos.find((i) => /ta[cç]a/i.test(i.id) && !comFicha(i));
const selecao = (adega.selecao || []).map((id) => porId.get(id)).filter(Boolean);

function slug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const origem = (i) => [i.detalhes?.regiao, i.detalhes?.pais].filter(Boolean).join(' · ');
const bandeira = (i) => i.pais ? html`<span class="bandeira" aria-hidden="true">${bandeiras[i.pais] || ''}</span>` : '';

const ORNAMENTO = html`<svg class="ornamento" viewBox="0 0 120 12" aria-hidden="true"><path d="M0 6h50M70 6h50" stroke="currentColor" stroke-width=".8"/><path d="M60 1.5 64.5 6 60 10.5 55.5 6z" fill="none" stroke="currentColor" stroke-width=".8"/><circle cx="60" cy="6" r="1.2" fill="currentColor"/></svg>`;

function cabecalho() {
  return html`<header class="abertura">
    <a class="marca" href="${BASE}" aria-label="Voltar ao cardápio do ${restaurante.nome}">
      <img src="${BASE}media/logo.webp" alt="${restaurante.nome}" width="360" height="360" fetchpriority="high">
    </a>
    <p class="sobretitulo">Adega Brew</p>
    <h1>Carta de <em>Vinhos</em></h1>
    ${ORNAMENTO}
    <p class="intro">Rótulos escolhidos para acompanhar a brasa — do frescor dos espumantes da Serra Gaúcha aos tintos do Douro, Dão e Mendoza.</p>
  </header>`;
}

function indice() {
  const itens = [
    selecao.length && { id: 'selecao', nome: 'Seleção' },
    ...capitulos.map((c) => ({ id: c.id, nome: c.nome })),
    taca && { id: 'taca', nome: 'Taça' },
  ].filter(Boolean);
  return html`<nav class="indice" aria-label="Seções da carta">
    <ul>${itens.map((c) => html`<li><a href="#${c.id}" data-sec="${c.id}">${c.nome}</a></li>`)}</ul>
  </nav>`;
}

function blocoSelecao() {
  if (!selecao.length) return '';
  return html`<section class="selecao" id="selecao" aria-labelledby="t-selecao">
    <header class="titulo-cap">
      <p class="sobretitulo">Novidades na adega</p>
      <h2 id="t-selecao">Seleção <em>Portugal</em></h2>
    </header>
    <div class="vitrine">${selecao.map((i, n) => html`
      <button type="button" class="destaque" data-vinho="${i.id}" aria-label="Ver ficha de ${i.nome}">
        <span class="palco"><img src="${foto(i)}" alt="" width="240" height="900" ${n < 3 ? html`fetchpriority="high"` : html`loading="lazy"`} decoding="async"></span>
        <span class="regiao">${origem(i)}</span>
        <span class="nome">${i.nome}</span>
        <span class="valor"><small>R$</small> ${valor(i.preco)}</span>
      </button>`)}
    </div>
  </section>`;
}

function vinho(i) {
  const d = i.detalhes || {};
  return html`<li>
    <button type="button" class="vinho" data-vinho="${i.id}" aria-label="Ver ficha de ${i.nome}">
      <span class="garrafa"><img src="${foto(i)}" alt="" width="120" height="360" loading="lazy" decoding="async"></span>
      <span class="texto">
        <span class="linha1"><span class="nome">${i.nome}</span><span class="pontos" aria-hidden="true"></span><span class="valor">${valor(i.preco)}</span></span>
        <span class="origem">${bandeira(i)}${origem(i)}${d.teor ? html` <span class="teor">· ${d.teor}</span>` : ''}</span>
        ${d.uvas ? html`<span class="uvas">${d.uvas}</span>` : ''}
        ${i.desc ? html`<span class="desc">${i.desc}</span>` : ''}
      </span>
    </button>
  </li>`;
}

function capitulo(c) {
  return html`<section class="capitulo" id="${c.id}" aria-labelledby="t-${c.id}">
    <header class="titulo-cap">
      ${c.nota ? html`<p class="sobretitulo">${c.nota}</p>` : ''}
      <h2 id="t-${c.id}">${c.nome}</h2>
      ${ORNAMENTO}
    </header>
    ${c.paises.map((p) => html`
      ${p.nome ? html`<h3 class="pais"><span>${p.nome}</span></h3>` : ''}
      <ul class="vinhos">${p.vinhos.map(vinho)}</ul>`)}
  </section>`;
}

function blocoTaca() {
  if (!taca) return '';
  return html`<section class="taca" id="taca" aria-label="Vinho em taça">
    <p class="sobretitulo">Também servimos</p>
    <p class="taca-linha"><span class="nome">${taca.nome}</span><span class="pontos" aria-hidden="true"></span><span class="valor"><small>R$</small> ${valor(taca.preco)}</span></p>
    <p class="obs">Pergunte ao garçom qual rótulo está aberto hoje.</p>
  </section>`;
}

function rodape() {
  return html`<footer class="fecho">
    ${ORNAMENTO}
    <a class="voltar" href="${BASE}">← Ver o cardápio completo</a>
    <p>${restaurante.nome} · ${restaurante.cidade}</p>
    <p><a href="${restaurante.instagramUrl}" target="_blank" rel="noopener">@${restaurante.instagram}</a></p>
    <p class="aviso-legal">Beba com moderação. Venda proibida para menores de 18 anos.</p>
  </footer>`;
}

const raiz = document.getElementById('carta');
montar(raiz, html`
  ${cabecalho()}
  ${indice()}
  <main>
    ${blocoSelecao()}
    ${capitulos.map(capitulo)}
    ${blocoTaca()}
  </main>
  ${rodape()}
`);

// ------------------------------------------------------------ ficha (toque no vinho)
const ficha = document.getElementById('ficha');

function abrirFicha(i) {
  const d = i.detalhes || {};
  montar(ficha, html`
    <button type="button" class="fechar" aria-label="Fechar">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </button>
    <div class="ficha-garrafa"><img src="${foto(i)}" alt="Garrafa de ${i.nome}" width="240" height="900"></div>
    <div class="ficha-texto">
      <p class="sobretitulo">${origem(i)}</p>
      <h2>${i.nome}</h2>
      ${ORNAMENTO}
      ${i.desc ? html`<p class="desc">${i.desc}</p>` : ''}
      <dl>
        ${d.uvas ? html`<div><dt>Uvas</dt><dd>${d.uvas}</dd></div>` : ''}
        ${d.regiao ? html`<div><dt>Região</dt><dd>${d.regiao}</dd></div>` : ''}
        ${d.pais ? html`<div><dt>País</dt><dd>${bandeira(i)} ${d.pais}</dd></div>` : ''}
        ${d.teor ? html`<div><dt>Teor</dt><dd>${d.teor}</dd></div>` : ''}
      </dl>
      <p class="valor"><small>R$</small> ${valor(i.preco)}</p>
    </div>
  `);
  ficha.showModal();
  history.pushState({ ficha: i.id }, '');
}

function fecharFicha() {
  if (!ficha.open) return;
  ficha.close();
}

raiz.addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-vinho]');
  if (!alvo) return;
  const i = porId.get(alvo.dataset.vinho);
  if (i) abrirFicha(i);
});
ficha.addEventListener('click', (e) => {
  // fecha no X ou tocando fora do conteúdo
  if (e.target === ficha || e.target.closest('.fechar')) history.back();
});
ficha.addEventListener('cancel', (e) => { e.preventDefault(); history.back(); });
window.addEventListener('popstate', fecharFicha);

// ------------------------------------------------------------ índice: marca a seção na tela
const nav = raiz.querySelector('.indice');
const links = new Map([...nav.querySelectorAll('a[data-sec]')].map((a) => [a.dataset.sec, a]));
const secoes = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
let ativo = null, agendado = false;
function marcar() {
  agendado = false;
  const limite = nav.offsetHeight + 40;
  let atual = secoes[0];
  for (const s of secoes) { if (s.getBoundingClientRect().top <= limite) atual = s; else break; }
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) atual = secoes[secoes.length - 1];
  if (atual === ativo) return;
  ativo = atual;
  for (const [id, a] of links) a.classList.toggle('ativo', id === atual.id);
  const a = links.get(atual.id), faixa = nav.querySelector('ul');
  if (a) faixa.scrollTo({ left: a.offsetLeft - faixa.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
}
window.addEventListener('scroll', () => { if (!agendado) { agendado = true; requestAnimationFrame(marcar); } }, { passive: true });
marcar();
