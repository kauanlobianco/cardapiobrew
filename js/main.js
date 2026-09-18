import { restaurante, destaques as blocoDestaques, categorias } from './dados/cardapio.js';
import { html, montar } from './util/dom.js';
import { cabecalho, rodape } from './componentes/cabecalho.js';
import { navegacao, ativarScrollSpy } from './componentes/navegacao.js';
import { destaques } from './componentes/destaques.js';
import { categoria } from './componentes/categoria.js';
import { abrirVideo, preaquecer, cancelarPreaquecimento, iniciarModal } from './componentes/modalVideo.js';
import * as preview from './componentes/previewFeed.js';

// índice id -> item (inclui as capas de categoria como pseudo-itens)
const porId = new Map();
for (const c of categorias) {
  for (const g of c.grupos) for (const i of g.itens) porId.set(i.id, i);
  if (c.capa && !porId.has(c.capa)) porId.set(c.capa, { id: c.capa, nome: c.nome });
}

const app = document.getElementById('app');
const eagerRestante = { n: 4 }; // primeiras fotos da 1ª categoria sem lazy

montar(app, html`
  ${cabecalho(restaurante)}
  ${navegacao(categorias)}
  ${destaques(blocoDestaques, porId)}
  <main>${categorias.map((c) => categoria(c, { eagerRestante }))}</main>
  ${rodape(restaurante)}
`);

// ao fechar o modal, o feed volta a dar preview no card centralizado
iniciarModal(document.getElementById('modal-video'), {
  aoFechar: (video) => { preview.devolver(video); setTimeout(preview.atualizar, 250); },
});
ativarScrollSpy(app.querySelector('.nav'), categorias);
preview.iniciarPreviewFeed(app, porId);

// um único listener para todos os cards/capas
app.addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-video]');
  if (!alvo) return;
  const item = porId.get(alvo.dataset.video);
  if (!item) return;
  const doPreview = preview.pegar(item.id); // o vídeo do preview vai para o modal…
  preview.pararTodos();                     // …e os outros previews param enquanto ele está aberto
  abrirVideo(item, { video: doPreview });
});

// começa a baixar o vídeo no toque, antes de o click disparar
// (se o card já está em preview, o vídeo já existe — nada a fazer)
app.addEventListener('pointerdown', (e) => {
  const alvo = e.target.closest('[data-video]');
  if (!alvo) return;
  const item = porId.get(alvo.dataset.video);
  if (item && !preview.tem(item.id)) preaquecer(item);
}, { passive: true });
app.addEventListener('pointercancel', cancelarPreaquecimento, { passive: true });
