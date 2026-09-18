import { html } from '../util/dom.js';

export function navegacao(categorias) {
  return html`<nav class="nav" aria-label="Categorias">
    <ul>${categorias.map((c) => html`<li><a href="#${c.id}" data-cat="${c.id}">${c.nome}</a></li>`)}</ul>
  </nav>`;
}

// Marca na barra a categoria que está na tela e a mantém visível na faixa.
export function ativarScrollSpy(nav, categorias) {
  const links = new Map([...nav.querySelectorAll('a[data-cat]')].map((a) => [a.dataset.cat, a]));
  const secoes = categorias.map((c) => document.getElementById(c.id)).filter(Boolean);
  const navH = nav.offsetHeight;
  let ativo = null, agendado = false;

  function atualizar() {
    agendado = false;
    const limite = navH + 12;
    let atual = secoes[0];
    for (const s of secoes) {
      if (s.getBoundingClientRect().top <= limite) atual = s; else break;
    }
    // no fim da página, a última categoria vence mesmo que o topo dela não tenha chegado
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) atual = secoes[secoes.length - 1];
    if (atual === ativo) return;
    ativo = atual;
    for (const [id, a] of links) a.classList.toggle('ativo', id === atual.id);
    const a = links.get(atual.id);
    if (a) {
      const faixa = nav.querySelector('ul');
      faixa.scrollTo({ left: a.offsetLeft - faixa.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
    }
  }

  window.addEventListener('scroll', () => {
    if (!agendado) { agendado = true; requestAnimationFrame(atualizar); }
  }, { passive: true });
  atualizar();
}
