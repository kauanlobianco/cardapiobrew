import { criarVideo } from './modalVideo.js';

// Preview automático no feed, no estilo do app do YouTube: quando a rolagem
// para (e o usuário permanece ~0,6 s), a LINHA de cards com vídeo mais próxima
// do centro da tela ganha <video>s mudos em loop por cima das fotos — no
// celular são os 2 cards lado a lado. Regras de economia:
//   - só a linha em foco tem vídeo; ao trocar de linha, os anteriores são
//     pausados e destruídos (src removido) antes de os novos começarem a baixar;
//     quem continua na linha em foco não é reiniciado;
//   - só cards com >= 60% de área visível concorrem;
//   - o IntersectionObserver derruba o preview no instante em que o card sai
//     da tela (sem esperar a rolagem parar);
//   - desligado se o usuário pediu economia de dados, está em 2G ou prefere
//     menos movimento; pausa quando a aba sai de foco.
// A escolha é uma varredura de getBoundingClientRect no fim da rolagem
// (~70 elementos, uma vez por parada) — determinística e barata.

const LIMIAR_VISIVEL = 0.6;
const PERMANENCIA_MS = 600;     // quanto tempo parado antes de começar o preview
const MESMA_LINHA_PX = 12;      // cards cujo centro difere menos que isso estão na mesma linha
const MAXIMO_POR_LINHA = 4;     // 2 no celular, 3-4 em tablet/desktop

let porId, candidatos = [], atuais = []; // atuais = [{ id, botao, video }]
let observador, timer;
let bloqueado = false; // o navegador recusou autoplay (ex.: iOS em Modo de Baixa Energia)

// Por que o preview não roda agora? null = pode rodar.
function motivoDesligado() {
  const c = navigator.connection;
  if (c?.saveData) return 'economia de dados ligada no aparelho';
  if (c?.effectiveType && /2g/.test(c.effectiveType)) return `conexão ${c.effectiveType}`;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return '"reduzir movimento" ligado no aparelho';
  if (bloqueado) return 'navegador recusou autoplay (modo de baixa energia?)';
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
  painel.textContent = `preview: ${texto}`;
}

function destruir(p) {
  p.video.pause(); p.video.removeAttribute('src'); p.video.load(); p.video.remove();
}
export function pararTodos() { atuais.forEach(destruir); atuais = []; }

function iniciar(botao) {
  const item = porId.get(botao.dataset.video);
  if (!item) return;
  const video = criarVideo(item);
  video.classList.add('preview');
  video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1;
  video.addEventListener('playing', () => video.classList.add('tocando'), { once: true });
  botao.appendChild(video);
  const p = { id: item.id, botao, video };
  atuais.push(p);
  const tentar = () => video.play().catch((e) => {
    // NotAllowedError = política de autoplay (iOS Baixa Energia, etc.): não insiste, não gasta dados
    if (e?.name === 'NotAllowedError') { bloqueado = true; pararTodos(); diag(motivoDesligado()); }
  });
  tentar();
  video.addEventListener('canplay', () => { if (atuais.includes(p) && video.paused) tentar(); }, { once: true });
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

  // primeiro foco depois que a página assentou (fontes/imagens acima da dobra)
  setTimeout(atualizar, 900);
}
