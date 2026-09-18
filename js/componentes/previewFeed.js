import { criarVideo } from './modalVideo.js';

// Preview automático no feed, no estilo do app do YouTube: quando a rolagem
// para, o card com vídeo mais próximo do centro da tela ganha um <video> mudo
// em loop por cima da foto. Regras de economia:
//   - existe no máximo UM preview por vez; ao trocar de foco, o anterior é
//     pausado e destruído (src removido) antes de o novo começar a baixar;
//   - só cards com >= 60% de área visível concorrem ao foco;
//   - o IntersectionObserver derruba o preview no instante em que o card sai
//     da tela (sem esperar a rolagem parar);
//   - desligado se o usuário pediu economia de dados, está em 2G ou prefere
//     menos movimento; pausa quando a aba sai de foco.
// A escolha do card é uma varredura de getBoundingClientRect no fim da rolagem
// (~70 elementos, uma vez por parada) — determinística e barata.

const LIMIAR_VISIVEL = 0.6;

let porId, candidatos = [], atual = null; // atual = { id, botao, video }
let observador, timer;

function desligado() {
  const c = navigator.connection;
  if (c?.saveData) return true;
  if (c?.effectiveType && /2g/.test(c.effectiveType)) return true;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function parar() {
  if (!atual) return;
  const { video } = atual;
  video.pause(); video.removeAttribute('src'); video.load(); video.remove();
  atual = null;
}

function iniciar(botao) {
  const item = porId.get(botao.dataset.video);
  if (!item) return;
  const video = criarVideo(item);
  video.classList.add('preview');
  video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1;
  video.addEventListener('playing', () => video.classList.add('tocando'), { once: true });
  botao.appendChild(video);
  atual = { id: item.id, botao, video };
  video.play().catch(() => {});
  video.addEventListener('canplay', () => { if (atual?.video === video && video.paused) video.play().catch(() => {}); }, { once: true });
}

// Fração do elemento dentro da janela (vertical e horizontal — a faixa de
// destaques rola de lado).
function fracaoVisivel(r) {
  if (!r.width || !r.height) return 0;
  const v = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
  const h = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
  return (v * h) / (r.width * r.height);
}

// Quem está mais perto do centro da tela entre os cards suficientemente visíveis?
function escolher() {
  const centro = innerHeight / 2;
  let melhor = null, menor = Infinity;
  for (const b of candidatos) {
    const r = b.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= innerHeight) continue;
    if (fracaoVisivel(r) < LIMIAR_VISIVEL) continue;
    const d = Math.abs((r.top + r.bottom) / 2 - centro);
    if (d < menor) { menor = d; melhor = b; }
  }
  return melhor;
}

export function atualizar() {
  if (desligado() || document.hidden || document.querySelector('dialog[open]')) return;
  const alvo = escolher();
  if (!alvo) { parar(); return; }
  if (atual?.botao === alvo) return;
  parar();
  iniciar(alvo);
}

function agendar() {
  clearTimeout(timer);
  timer = setTimeout(atualizar, 'onscrollend' in window ? 40 : 180);
}

// O modal pega o vídeo do preview (já carregado) em vez de baixar de novo.
export function pegar(id) {
  if (!atual || atual.id !== id) return null;
  const { video } = atual;
  video.classList.remove('preview', 'tocando');
  video.removeAttribute('aria-hidden'); video.removeAttribute('tabindex');
  video.remove();
  atual = null;
  return video;
}
export const tem = (id) => atual?.id === id;

export function iniciarPreviewFeed(raiz, indice) {
  porId = indice;
  if (desligado() || !('IntersectionObserver' in window)) return;

  candidatos = [...raiz.querySelectorAll('.foto[data-video], .capa[data-video]')];

  // saiu da tela (menos de 60% visível): derruba o preview na hora, sem esperar a rolagem parar
  observador = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (atual?.botao === e.target && e.intersectionRatio < LIMIAR_VISIVEL) parar();
    }
  }, { threshold: [LIMIAR_VISIVEL] });
  candidatos.forEach((b) => observador.observe(b));

  // scroll da página e da faixa de destaques (capture pega qualquer scroller)
  document.addEventListener('scroll', agendar, { capture: true, passive: true });
  if ('onscrollend' in window) document.addEventListener('scrollend', agendar, { capture: true, passive: true });
  addEventListener('resize', agendar, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) parar(); else agendar(); });

  // primeiro foco depois que a página assentou (fontes/imagens acima da dobra)
  setTimeout(atualizar, 900);
}
