import { configurarVideo } from './modalVideo.js';

// Preview automático no feed, no estilo do app do YouTube: quando a rolagem
// para (e o usuário permanece ~0,6 s), a LINHA de cards com vídeo mais próxima
// do centro da tela ganha <video>s mudos em loop por cima das fotos — no
// celular são os 2 cards lado a lado. Regras de economia:
//   - só a linha em foco tem vídeo; ao trocar de linha, os anteriores são
//     pausados e esvaziados (src removido) antes de os novos começarem a baixar;
//     quem continua na linha em foco não é reiniciado;
//   - só cards com >= 60% de área visível concorrem;
//   - o IntersectionObserver derruba o preview no instante em que o card sai
//     da tela (sem esperar a rolagem parar);
//   - desligado se o usuário pediu economia de dados, está em 2G ou prefere
//     menos movimento; pausa quando a aba sai de foco.
//
// iOS/WebKit: os <video> vêm de um POOL fixo e são reutilizados. No primeiro
// toque na tela cada elemento do pool recebe um play() dentro do gesto, o que
// o "destrava" no WebKit para tocar depois sem gesto (vale até em Modo de
// Baixa Energia, que ignora o atributo autoplay). O poster de cada preview é a
// própria foto do card, então o vídeo pode ficar visível desde o início — o
// WebKit não dá autoplay a vídeo escondido por CSS.
//
// A escolha da linha é uma varredura de getBoundingClientRect no fim da
// rolagem (~70 elementos, uma vez por parada) — determinística e barata.

const LIMIAR_VISIVEL = 0.6;
const PERMANENCIA_MS = 600;     // quanto tempo parado antes de começar o preview
const MESMA_LINHA_PX = 12;      // cards cujo centro difere menos que isso estão na mesma linha
const MAXIMO_POR_LINHA = 4;     // 2 no celular, 3-4 em tablet/desktop

let porId, candidatos = [], atuais = []; // atuais = [{ id, botao, video }]
let observador, timer;
let bloqueado = false;          // o navegador recusou autoplay
let destravado = false;         // já houve um gesto do usuário para destravar o pool

// ---- pool de elementos <video> reutilizáveis
const pool = [];
function novoDoPool() {
  const v = document.createElement('video');
  v.classList.add('preview');
  v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
  pool.push(v);
  return v;
}
function pegarDoPool() {
  return pool.find((v) => !v.dataset.emUso) || (pool.length < MAXIMO_POR_LINHA ? novoDoPool() : null);
}
function esvaziar(v) {
  v.pause(); v.removeAttribute('src'); v.removeAttribute('poster'); v.load(); v.remove();
  delete v.dataset.emUso;
  v.classList.remove('tocando');
}
// Primeiro gesto do usuário: play() em cada elemento do pool DENTRO do gesto.
// WebKit guarda a permissão por elemento; a partir daí play() sem gesto passa.
function destravarPool() {
  if (destravado) return;
  destravado = true;
  while (pool.length < 2) novoDoPool();          // 2 cobre a linha do celular
  for (const v of pool) {
    if (v.dataset.emUso) continue;
    v.muted = true;
    const p = v.play(); if (p && p.catch) p.catch(() => {});
    v.pause();
  }
  bloqueado = false;                             // com o pool destravado, vale tentar de novo
  agendar();
}

// Por que o preview não roda agora? null = pode rodar.
function motivoDesligado() {
  const c = navigator.connection;
  if (c && c.saveData) return 'economia de dados ligada no aparelho';
  if (c && c.effectiveType && /2g/.test(c.effectiveType)) return 'conexão ' + c.effectiveType;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return '"reduzir movimento" ligado no aparelho';
  if (bloqueado) return destravado
    ? 'navegador recusou autoplay mesmo após toque (modo de baixa energia?)'
    : 'navegador recusou autoplay; toque na tela uma vez';
  return null;
}
const desligado = () => motivoDesligado() !== null;

// Modo diagnóstico: ?debug na URL mostra na tela o estado do preview.
const DEBUG = /[?&]debug/.test(location.search);
let painel;
function diag(texto) {
  if (!DEBUG) return;
  if (!painel) {
    painel = document.createElement('div');
    painel.id = 'preview-debug';
    painel.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;max-width:80vw;padding:6px 10px;border-radius:8px;background:#000c;color:#f2e9d8;font:12px/1.3 monospace;pointer-events:none;white-space:pre-wrap';
    document.body.appendChild(painel);
  }
  painel.textContent = 'preview: ' + texto + (destravado ? '' : ' · (pool ainda não destravado)');
}

function destruir(p) { esvaziar(p.video); }
export function pararTodos() { atuais.forEach(destruir); atuais = []; }

function iniciar(botao) {
  const item = porId.get(botao.dataset.video);
  const video = item && pegarDoPool();
  if (!video) return;
  video.dataset.emUso = '1';
  configurarVideo(video, item);
  video.addEventListener('playing', () => video.classList.add('tocando'), { once: true });
  botao.appendChild(video);
  const p = { id: item.id, botao, video };
  atuais.push(p);
  const tentar = () => {
    const pr = video.play();
    if (pr && pr.catch) pr.catch((e) => {
      // NotAllowedError = política de autoplay: não insiste, não gasta dados.
      // Se ainda não houve gesto, o primeiro toque destrava o pool e tenta de novo.
      if (e && e.name === 'NotAllowedError') { bloqueado = true; pararTodos(); diag(motivoDesligado()); }
    });
  };
  tentar();
  video.addEventListener('canplay', () => { if (atuais.includes(p) && video.paused && !bloqueado) tentar(); }, { once: true });
}

// Fração do elemento dentro da janela (vertical e horizontal — a faixa de
// destaques rola de lado).
function fracaoVisivel(r) {
  if (!r.width || !r.height) return 0;
  const v = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
  const h = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
  return (v * h) / (r.width * r.height);
}

// A linha de cards mais perto do centro da tela (entre os suficientemente visíveis).
function escolherLinha() {
  const centro = innerHeight / 2;
  const visiveis = [];
  for (const b of candidatos) {
    const r = b.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= innerHeight) continue;
    if (fracaoVisivel(r) < LIMIAR_VISIVEL) continue;
    visiveis.push({ b, cy: (r.top + r.bottom) / 2, x: r.left });
  }
  if (!visiveis.length) return [];
  const melhor = visiveis.reduce((m, v) => (Math.abs(v.cy - centro) < Math.abs(m.cy - centro) ? v : m));
  return visiveis
    .filter((v) => Math.abs(v.cy - melhor.cy) <= MESMA_LINHA_PX)
    .sort((a, c) => a.x - c.x)
    .slice(0, MAXIMO_POR_LINHA)
    .map((v) => v.b);
}

export function atualizar() {
  const motivo = motivoDesligado() || (document.hidden && 'aba em segundo plano') || (document.querySelector('dialog[open]') && 'modal aberto');
  if (motivo) { diag(motivo); return; }
  const linha = escolherLinha();
  if (!linha.length) { pararTodos(); diag('nenhum card com vídeo ≥60% visível'); return; }
  diag('tocando ' + linha.map((b) => b.dataset.video).join(' + '));
  // derruba quem saiu da linha em foco; mantém quem continua (sem reiniciar)
  const ficam = atuais.filter((p) => linha.includes(p.botao));
  atuais.filter((p) => !linha.includes(p.botao)).forEach(destruir);
  atuais = ficam;
  for (const b of linha) if (!atuais.some((p) => p.botao === b)) iniciar(b);
}

function agendar() {
  clearTimeout(timer);
  timer = setTimeout(atualizar, PERMANENCIA_MS);
}

// O modal pega o vídeo do preview (já carregado) em vez de baixar de novo.
export function pegar(id) {
  const i = atuais.findIndex((p) => p.id === id);
  if (i < 0) return null;
  const { video } = atuais[i];
  atuais.splice(i, 1);
  video.classList.remove('preview', 'tocando');
  video.removeAttribute('aria-hidden'); video.removeAttribute('tabindex');
  video.remove();
  return video;
}
export const tem = (id) => atuais.some((p) => p.id === id);

// O modal devolve o elemento ao fechar (ele tocou num clique: está destravado).
export function devolver(video) {
  if (!video) return;
  video.classList.add('preview');
  video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1;
  delete video.dataset.emUso;
  if (!pool.includes(video)) {
    if (pool.length >= MAXIMO_POR_LINHA) pool.shift();
    pool.push(video);
  }
}

export function iniciarPreviewFeed(raiz, indice) {
  porId = indice;
  if (!('IntersectionObserver' in window)) { diag('navegador sem IntersectionObserver'); return; }
  if (desligado()) { diag(motivoDesligado()); return; }
  diag('iniciado; role a página');

  candidatos = [...raiz.querySelectorAll('.foto[data-video], .capa[data-video]')];

  // saiu da tela (menos de 60% visível): derruba o preview na hora, sem esperar a rolagem parar
  observador = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (e.intersectionRatio >= LIMIAR_VISIVEL) continue;
      const i = atuais.findIndex((p) => p.botao === e.target);
      if (i >= 0) { destruir(atuais[i]); atuais.splice(i, 1); }
    }
  }, { threshold: [LIMIAR_VISIVEL] });
  candidatos.forEach((b) => observador.observe(b));

  // scroll da página e da faixa de destaques (capture pega qualquer scroller)
  document.addEventListener('scroll', agendar, { capture: true, passive: true });
  if ('onscrollend' in window) document.addEventListener('scrollend', agendar, { capture: true, passive: true });
  addEventListener('resize', agendar, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pararTodos(); else agendar(); });

  // primeiro gesto (inclusive o primeiro scroll com o dedo) destrava o pool no WebKit
  for (const ev of ['touchend', 'pointerup', 'keydown']) {
    document.addEventListener(ev, destravarPool, { capture: true, passive: true, once: true });
  }

  // primeiro foco depois que a página assentou (fontes/imagens acima da dobra)
  setTimeout(atualizar, 900);
}
