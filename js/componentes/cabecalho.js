import { html } from '../util/dom.js';
import { ICONE_PLAY } from './item.js';

export function cabecalho(r) {
  return html`<header class="topo">
    <a class="marca" href="${r.instagramUrl}" target="_blank" rel="noopener" aria-label="Instagram do ${r.nome}">
      <img class="logo" src="media/logo.webp" alt="${r.nome}" width="360" height="360" fetchpriority="high">
    </a>
    <p class="slogan">${r.slogan}</p>
    <h1>Cardápio</h1>
    <p class="boas-vindas">${r.boasVindas}</p>
    <p class="dica"><span class="play" style="position:static" aria-hidden="true">${ICONE_PLAY}</span> Toque na foto para ver o prato em vídeo</p>
  </header>`;
}

export function rodape(r) {
  return html`<footer class="rodape">
    <a class="marca" href="${r.instagramUrl}" target="_blank" rel="noopener" aria-label="Instagram do ${r.nome}">
      <img class="logo" src="media/logo.webp" alt="" width="360" height="360" loading="lazy">
    </a>
    <p><a href="${r.instagramUrl}" target="_blank" rel="noopener">@${r.instagram}</a></p>
    <p>${r.nome} · ${r.cidade}</p>
    <a class="qr" href="${r.instagramUrl}" target="_blank" rel="noopener">
      <img src="media/qr-instagram.png" alt="QR Code do Instagram @${r.instagram}" width="480" height="543" loading="lazy">
      <span>Siga no Instagram</span>
    </a>
  </footer>`;
}
