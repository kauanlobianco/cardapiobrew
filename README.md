# Brew Bar·B·Q Pub — Cardápio digital

Cardápio para o cliente abrir no celular pelo QR Code da mesa. Cada prato com
foto tem um botão ▶: ao tocar, abre o vídeo do prato em tela cheia.

Site estático puro: **sem build, sem framework, sem dependência**. Qualquer
host de arquivos estáticos serve. Abre em menos de 1 s no 4G porque a primeira
carga é só HTML + CSS + ~25 KB de JS + as 4–6 fotos que estão na tela; o resto
das fotos carrega conforme o scroll e **nenhum vídeo é baixado antes do toque**.

## Rodar localmente

ES modules não abrem por `file://`, então precisa de um servidor. Sem instalar nada:

```
powershell -File ferramentas/servir.ps1
```

e abra <http://localhost:8080>. (Ou `npx serve`, `python -m http.server`, Live Server do VS Code — qualquer um.)

## Publicar

É só subir a pasta `cardapio-digital/` inteira. Sem etapa de build.

| Plataforma | Como |
|---|---|
| **Netlify** | arraste a pasta em <https://app.netlify.com/drop> — pronto, já tem URL https |
| **Vercel** | `vercel` na pasta (ou importe o repositório e aponte o root para `cardapio-digital`) |
| **Cloudflare Pages** | "Upload assets" → envie a pasta |
| **GitHub Pages** | commit da pasta e ative Pages apontando para ela |

Aponte o QR Code para a URL final. O `index.html` tem `noindex` para o cardápio
não aparecer no Google enquanto estiver em teste — tire a linha `<meta name="robots">`
quando for pra valer.

Os vídeos já vêm com `faststart`, então começam a tocar antes de terminar o download.

## Estrutura

```
index.html                  a página (só o esqueleto; o conteúdo é montado pelo JS)
css/estilo.css              design system (paleta carvão/papel/ouro, Bevan + Archivo)
js/
  main.js                   monta a página e liga os cliques ao modal
  dados/cardapio.js         O CARDÁPIO — itens, descrições, preços (é aqui que se edita)
  dados/midia.js            gerado: quais ids têm foto/vídeo em media/
  componentes/
    cabecalho.js            logo, slogan, dica "toque na foto"
    navegacao.js            barra de categorias fixa + destaque da categoria atual
    destaques.js            faixa horizontal "Best BBQ"
    categoria.js            seção de categoria: rótulo, capa, grupos, grade + lista
    item.js                 card com foto / linha de texto / preços / sabores
    modalVideo.js           modal de vídeo (autoplay, som, fechar, botão voltar)
  util/dom.js, formato.js   template html seguro; preço, bandeiras, caminhos
media/
  fotos/<id>.webp           fotos otimizadas (≤ 800 px, ~40 KB cada)
  videos/<id>.mp4           vídeos otimizados (480p, ~700 KB cada)
  logo.webp
ferramentas/
  mapa-midia.json           id do item -> arquivo original de foto e de vídeo
  preparar-midia.ps1        converte fotos, copia vídeos, extrai capa, gera midia.js
  servir.ps1                servidor local para teste
```

## Editar o cardápio

**Preço, descrição, item novo, item que saiu:** `js/dados/cardapio.js`. Cada
item é uma linha:

```js
{ id: 'picanha-uruguaia', nome: 'Picanha Uruguaia', desc: 'Steak de picanha…', preco: 79 },
```

- `precos: [{ rotulo: 'Média 600g', valor: 99 }, …]` quando há mais de um preço
- `nota: 'Para 2 pessoas'` vira a etiqueta dourada ao lado do nome
- `sabores: ['Limão', …]` vira os chips
- `midia: 'outro-id'` reaproveita a foto/vídeo de outro item (ex.: a picanha "para 2")

O `id` é o que liga o item à mídia: `media/fotos/<id>.webp` e `media/videos/<id>.mp4`.

**Foto ou vídeo novo:**

1. Coloque o arquivo original na pasta de fotos ou de vídeos otimizados (as pastas estão no topo de `mapa-midia.json`).
2. Adicione a linha `"id-do-item": "Nome do arquivo.jpg"` em `ferramentas/mapa-midia.json`.
3. Rode `powershell -File ferramentas/preparar-midia.ps1`. Ele converte só o que mudou e regrava `midia.js`.

Vídeo sem foto? O script extrai um frame do vídeo e usa como capa do card.

Vídeo novo precisa passar antes pela otimização (480p, H.264, ~500 kbps,
`faststart`) — o comando está no histórico do projeto; vídeos de 5 MB no
cardápio matam a experiência no 3G.

## Como funciona o carregamento

- Fotos: `loading="lazy"` em todas menos as primeiras 4–6 (que estão na tela ao abrir).
- Vídeos: o `<video>` só é criado quando o modal abre, e é destruído ao fechar. `preload="auto"` nesse momento; poster = a foto do card (já em cache), então a transição foto → vídeo é imediata.
- Fontes do Google com `display=swap`: o texto aparece na fonte do sistema e troca quando a Bevan/Archivo chegam.
- Sem framework: o JS inteiro tem ~25 KB, sem minificar.

## O que ficou pendente / a confirmar

Ver o relatório de mapeamento na conversa em que este projeto foi criado. Em resumo:

- Vídeos `File Mignon.mp4` → **Filet à Francesa** e `steak_Chorizo_Angus.mp4` → **NY Stripe / Black Angus** foram inferidos pelo nome; confirmar.
- 4 itens usam um frame do vídeo como capa porque não têm foto própria: Cocada Cremosa, Short Rib Angus, Fish Fillet e a capa de Burgers.
- Vários itens (T Bone, Aipim, Farofas, burgers individuais, vinhos etc.) estão só em texto, como no impresso.
- `Brew Burguer.mp4` virou a capa em vídeo da categoria Burgers (não se sabe qual burger é).
