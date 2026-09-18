import { html, montar } from '../util/dom.js';
import { caminhoFoto, caminhoVideo } from '../util/formato.js';
import { precos, sabores, detalhes, midiaDe } from './item.js';

// Modal de vídeo em tela cheia.
//  - o <video> só existe enquanto o modal está aberto (nada é baixado antes)
//  - autoplay mudo (regra dos celulares) com botão para ligar o som
//  - trava o scroll da página e devolve o usuário ao ponto exato ao fechar
//  - o botão "voltar" do celular fecha o modal em vez de sair do cardápio

const ICONE_X = html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const ICONE_MUDO = html`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3l3-3-1.4-1.4-3 3-3-3L10.7 9l3 3-3 3 1.4 1.4 3-3 3 3 1.4-1.4-3-3z"/></svg>`;
const ICONE_SOM = html`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>`;

let dialog, scrollSalvo = 0, abertoPorHistorico = false;

// Pré-aquecimento: no celular o `click` só dispara quando o dedo solta, ~100 ms
// depois do `pointerdown`. Criamos o <video> (e começamos o download) já no
// toque; abrirVideo() reaproveita o elemento. Só um por vez, para não baixar
// vídeos em paralelo à toa.
let aquecido = null; // { id, video }

export function criarVideo(item) {
  const m = midiaDe(item);
  const video = document.createElement('video');
  video.playsInline = true; video.muted = true; video.loop = true; video.autoplay = true;
  video.preload = 'auto';
  video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
  video.setAttribute('aria-label', `Vídeo: ${item.nome}`);
  if (m.foto) video.poster = caminhoFoto(m.id);
  video.src = caminhoVideo(m.id);
  return video;
}

export function preaquecer(item) {
  if (!midiaDe(item).video || aquecido?.id === item.id) return;
  cancelarPreaquecimento();
  aquecido = { id: item.id, video: criarVideo(item) };
}

// O toque virou rolagem (pointercancel): não gasta dados com um vídeo que não vai abrir.
export function cancelarPreaquecimento() {
  if (!aquecido) return;
  aquecido.video.removeAttribute('src'); aquecido.video.load();
  aquecido = null;
}

function travarScroll() {
  scrollSalvo = window.scrollY;
  Object.assign(document.body.style, { position: 'fixed', top: `-${scrollSalvo}px`, left: '0', right: '0', width: '100%' });
}
function destravarScroll() {
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '' });
  window.scrollTo({ top: scrollSalvo, behavior: 'instant' });
}

function ficha(item) {
  return html`<div class="ficha">
    <h2>${item.nome}${item.nota ? html`<span class="nota">${item.nota}</span>` : ''}</h2>
    ${item.desc ? html`<p class="desc">${item.desc}</p>` : ''}
    ${detalhes(item)}
    ${sabores(item)}
    ${precos(item)}
  </div>`;
}

// opcoes.video: um <video> já existente (o preview do feed), para não baixar de novo
export function abrirVideo(item, opcoes = {}) {
  if (!dialog) return;
  const m = midiaDe(item);
  if (!m.video) return;

  montar(dialog, html`
    <button type="button" class="fechar" data-fechar aria-label="Fechar vídeo">${ICONE_X}</button>
    <div class="palco">
      <div class="carregando" aria-hidden="true"></div>
      <button type="button" class="som" data-som aria-pressed="false">${ICONE_MUDO}<span>Ligar som</span></button>
    </div>
    ${ficha(item)}
  `);

  // reaproveita o <video> do preview do feed ou o pré-aquecido no toque; senão cria agora
  let video;
  if (opcoes.video) { video = opcoes.video; cancelarPreaquecimento(); }
  else if (aquecido?.id === item.id) { video = aquecido.video; aquecido = null; } // não cancelar: é este elemento
  else { cancelarPreaquecimento(); video = criarVideo(item); }
  dialog.querySelector('.palco').prepend(video);
  dialog.classList.remove('pronto'); // estado limpo ANTES de decidir se já está pronto
  const marcarPronto = () => dialog.classList.add('pronto');
  // vídeo vindo do preview/pré-aquecimento já passou por canplay/playing (esses
  // eventos não se repetem): dispensa o "carregando" na hora
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA || !video.paused) marcarPronto();
  video.addEventListener('playing', marcarPronto, { once: true });
  video.addEventListener('timeupdate', marcarPronto, { once: true }); // rede de segurança: tempo avançou = está tocando
  // Na rede real o play() de abertura pode acontecer antes de o arquivo chegar
  // e ser ignorado; quando há dados suficientes, tenta de novo.
  video.addEventListener('canplay', () => {
    marcarPronto();
    if (video.paused) video.play().catch(() => {});
  }, { once: true });
  video.addEventListener('error', () => {
    dialog.classList.add('pronto');
    dialog.querySelector('.carregando').textContent = 'Não foi possível carregar o vídeo.';
  }, { once: true });

  dialog.querySelector('[data-som]').addEventListener('click', (e) => {
    const b = e.currentTarget;
    video.muted = !video.muted;
    b.setAttribute('aria-pressed', String(!video.muted));
    montar(b, video.muted ? html`${ICONE_MUDO}<span>Ligar som</span>` : html`${ICONE_SOM}<span>Som ligado</span>`);
    if (video.paused) video.play().catch(() => {});
  });

  // pushState ANTES de travar o scroll: o navegador guarda a posição atual
  // na entrada anterior do histórico, e queremos que seja a posição real.
  history.pushState({ videoAberto: item.id }, '');
  abertoPorHistorico = true;
  travarScroll();
  dialog.showModal();
  video.play().catch(() => {}); // iOS às vezes ignora o autoplay do atributo
}

function fechar({ viaHistorico = false } = {}) {
  if (!dialog?.open) return;
  const video = dialog.querySelector('video');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  dialog.close();
  dialog.innerHTML = '';
  destravarScroll();
  if (!viaHistorico && abertoPorHistorico) { abertoPorHistorico = false; history.back(); }
  abertoPorHistorico = false;
  fecharCallback?.();
}
let fecharCallback;

export function iniciarModal(el, { aoFechar } = {}) {
  dialog = el;
  fecharCallback = aoFechar;
  // a posição do scroll é restaurada por nós (destravarScroll), não pelo navegador
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-fechar]') || e.target === dialog) fechar();
  });
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); fechar(); }); // tecla Esc
  window.addEventListener('popstate', () => { if (dialog.open) fechar({ viaHistorico: true }); });
}
