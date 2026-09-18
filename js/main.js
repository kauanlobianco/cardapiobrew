import { restaurante, destaques as blocoDestaques, categorias } from './dados/cardapio.js';
import { html, montar } from './util/dom.js';
import { cabecalho, rodape } from './componentes/cabecalho.js';
import { navegacao, ativarScrollSpy } from './componentes/navegacao.js';
import { destaques } from './componentes/destaques.js';
import { categoria } from './componentes/categoria.js';
import { abrirVideo, preaquecer, cancelarPreaquecimento, iniciarModal } from './componentes/modalVideo.js';

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

iniciarModal(document.getElementById('modal-video'));
ativarScrollSpy(app.querySelector('.nav'), categorias);

// um único listener para todos os cards/capas
app.addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-video]');
  if (!alvo) return;
  const item = porId.get(alvo.dataset.video);
  if (item) abrirVideo(item);
});

// começa a baixar o vídeo no toque, antes de o click disparar
app.addEventListener('pointerdown', (e) => {
  const alvo = e.target.closest('[data-video]');
  if (!alvo) return;
  const item = porId.get(alvo.dataset.video);
  if (item) preaquecer(item);
}, { passive: true });
app.addEventListener('pointercancel', cancelarPreaquecimento, { passive: true });
