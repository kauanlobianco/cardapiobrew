// Cardápio de evento — versão para impressão (PDF A4), montada a partir dos
// mesmos dados do cardápio digital. Só fotos: sem botão play e sem vídeo.
// Com preços; abra com ?sem-precos para ocultá-los.
import { restaurante, categorias } from '../js/dados/cardapio.js';
import { html, montar } from '../js/util/dom.js';
import { caminhoFoto, formatarPreco } from '../js/util/formato.js';
import { midiaDe, precos, sabores } from '../js/componentes/item.js';

const comPrecos = !new URLSearchParams(location.search).has('sem-precos');

const porId = {};
for (const c of categorias) for (const g of c.grupos) for (const i of g.itens) porId[i.id] = i;
const itens = (ids) => ids.map((id) => {
  if (typeof id === 'object') return id;
  if (!porId[id]) throw new Error(`item não encontrado: ${id}`);
  return porId[id];
});
const cat = (id) => categorias.find((c) => c.id === id);

// O que entra no evento
const secoes = [
  { nome: 'Entradas e Petiscos', grupos: [{ itens: cat('entradas-e-petiscos').grupos[0].itens
    .filter((i) => i.id !== 'provolone-sticks') }] },
  {
    nome: 'Carnes',
    grupos: [
      { itens: itens(['baby-beef-cheese', 'picanha-uruguaia', 'milanesa-napolitana', 'pork-ribs',
        'fraldinha-red', 'ny-stripe-black-angus', 'file-mignon-grelhado']) },
      cat('carnes').grupos.find((g) => g.nome === 'Sugestões para 2 pessoas'),
    ],
  },
  {
    nome: 'Acompanhamentos',
    grupos: [{ itens: itens(['fries', 'rock-fries', 'arroz-a-piamontese', 'arroz-branco',
      { id: 'farofa', nome: 'Farofa' },
      { id: 'molho-a-campanha', nome: 'Molho à Campanha' }]) }],
  },
];

const nota = (item) => item.nota ? html` <span class="nota">${item.nota}</span>` : '';
const valores = (item) => comPrecos ? precos(item) : '';

const cartao = (item) => html`<article class="card">
  <div class="foto"><img src="../${caminhoFoto(midiaDe(item).id)}" alt="${item.nome}" width="800" height="600"></div>
  <div class="corpo">
    <h4 class="nome">${item.nome}${nota(item)}</h4>
    ${item.desc ? html`<p class="desc">${item.desc}</p>` : ''}
    ${sabores(item)}
    ${valores(item)}
  </div>
</article>`;

// preço único fica na mesma linha do nome, com pontilhado (como no site)
const linha = (item) => {
  const unico = comPrecos && item.preco != null && !item.precos;
  return html`<li class="linha">
    <div class="cabeca">
      <span class="nome">${item.nome}</span>${nota(item)}
      ${unico ? html`<span class="pontos"></span><span class="valor"><small>R$</small>${formatarPreco(item.preco)}</span>` : ''}
    </div>
    ${item.desc ? html`<p class="desc">${item.desc}</p>` : ''}
    ${unico ? '' : valores(item)}
  </li>`;
};

function grupo(g) {
  const comFoto = g.itens.filter((i) => midiaDe(i).foto);
  const semFoto = g.itens.filter((i) => !midiaDe(i).foto);
  return html`<div class="grupo">
    ${g.nome ? html`<h3>${g.nome}</h3>` : ''}
    ${comFoto.length ? html`<div class="grade">${comFoto.map(cartao)}</div>` : ''}
    ${semFoto.length ? html`<ul class="lista">${semFoto.map(linha)}</ul>` : ''}
  </div>`;
}

const r = restaurante;
montar(document.getElementById('app'), html`
  <header class="topo">
    <img class="logo" src="../media/logo.webp" alt="${r.nome}" width="360" height="360">
    <p class="slogan">${r.slogan}</p>
    <h1>Cardápio</h1>
    <p class="evento"><span class="rotulo ouro">Menu do Evento</span></p>
    <p class="boas-vindas">${r.boasVindas}</p>
  </header>
  ${secoes.map((s) => html`<section class="secao">
    <header><h2 class="rotulo">${s.nome}</h2></header>
    ${s.grupos.map(grupo)}
  </section>`)}
  <footer class="rodape">
    <img class="logo" src="../media/logo.webp" alt="" width="360" height="360">
    <p><b>@${r.instagram}</b></p>
    <p>${r.nome} · ${r.cidade}</p>
    <div class="qr">
      <img src="../media/qr-instagram.png" alt="QR Code do Instagram @${r.instagram}" width="480" height="543">
      <span>Siga no Instagram</span>
    </div>
  </footer>
`);

// sinal para o gerador de PDF: fontes e fotos prontas
Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))])
  .then(() => document.body.setAttribute('data-pronto', ''));
