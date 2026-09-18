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

export function abrirVideo(item) {
  if (!dialog) return;
  const m = midiaDe(item);
  if (!m.video) return;

  montar(dialog, html`
    <button type="button" class="fechar" data-fechar aria-label="Fechar vídeo">${ICONE_X}</button>
    <div class="palco">
      <video playsinline muted autoplay loop preload="auto"
        poster="${m.foto ? caminhoFoto(m.id) : ''}" src="${caminhoVideo(m.id)}" aria-label="Vídeo: ${item.nome}"></video>
      <div class="carregando" aria-hidden="true"></div>
      <button type="button" class="som" data-som aria-pressed="false">${ICONE_MUDO}<span>Ligar som</span></button>
    </div>
    ${ficha(item)}
  `);

  const video = dialog.querySelector('video');
  const marcarPronto = () => dialog.classList.add('pronto');
  video.addEventListener('playing', marcarPronto, { once: true });
  video.addEventListener('canplay', marcarPronto, { once: true });
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

  dialog.classList.remove('pronto');
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
}

export function iniciarModal(el) {
  dialog = el;
  // a posição do scroll é restaurada por nós (destravarScroll), não pelo navegador
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-fechar]') || e.target === dialog) fechar();
  });
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); fechar(); }); // tecla Esc
  window.addEventListener('popstate', () => { if (dialog.open) fechar({ viaHistorico: true }); });
}
