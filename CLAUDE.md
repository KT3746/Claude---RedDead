# Poeira Vermelha — contexto do projeto

Jogo de faroeste no navegador inspirado em Red Dead Redemption 2, feito por um usuário
**iniciante em programação (vibe coding)**. Responda sempre em **português do Brasil**,
explique em linguagem simples e **deixe os links do jogo no fim de cada resposta**.

## Onde o jogo está

- Branch único (e padrão do repositório): `claude/red-dead-2-style-game-o0oin0`.
- Site público (GitHub Pages, atualiza sozinho alguns minutos depois de cada push nesse branch):
  - 3D: https://kt3746.github.io/Claude---RedDead/3d/
  - 2D: https://kt3746.github.io/Claude---RedDead/
- O usuário joga principalmente no **Safari do iPhone Air** (em pé ou deitado) e às vezes no Chrome do Windows.
  A versão 3D é a principal hoje.

## Estrutura

- `index.html`, `style.css`, `game.js`: versão **2D** (Canvas puro, visão de cima). Tem caça, eventos,
  entregas, fazendas, trem, clima, honra, procurado e save.
- `3d/index.html`, `3d/style.css`, `3d/main.js`: versão **3D** em Three.js 0.160 (carregado por importmap
  da CDN jsDelivr). Tudo é gerado por código, sem modelos externos. Um único arquivo `main.js` (~2.500 linhas),
  organizado em seções comentadas: texturas, terreno, construções, vegetação, céu/luz, personagens
  (`createHuman`/`poseHuman`, `createHorse`/`poseHorse`), estado `G`, áudio sintetizado, HUD/menus,
  entrada (teclado, mouse, toque), interações, combate (mira com trava no celular, balas, efeitos),
  bandidos e caçadas, a lei (testemunhas, ★ procurado, homens da lei), missões (`MISSIONS`), saque,
  câmera, minimapa, laço principal, save (`localStorage` chave `pv3d-save-v1`).
- `.nojekyll`: o Pages serve os arquivos sem processar.

## Estado da versão 3D (o que já existe)

Cidade com saloon, hotel, armazém, banco, barbeiro, igreja, xerife, estábulo, correio e casas; cavalo
montável; moradores; ciclo dia/noite com céu realista, sombras, lampiões; ajuste de gráficos e de brilho;
mira em anel sempre visível no celular + círculo de trava no alvo; balas acertam pessoas, paredes e chão;
caçadas de recompensa com bandidos que atiram de volta; vida, morte e respawn no hotel; saque de corpos e
venda de objetos no armazém; reação da lei a crimes (★ a ★★★, homens da lei, render-se no xerife);
6 missões de história até o bando de Dutch Callahan, com marcador dourado e diário (📜 / J).

Ideias ainda não feitas no 3D (existem no 2D): caça de animais, eventos na cidade, trem, clima, fazendas.

## Como trabalhar neste projeto

- Faça commits claros e **push no branch acima**; o Pages publica sozinho. Para confirmar a publicação,
  consulte `https://api.github.com/repos/KT3746/Claude---RedDead/actions/runs?per_page=1` até o commit
  aparecer como `completed success`.
- Não crie pull request a menos que o usuário peça.
- Testes no navegador: o ambiente não acessa a CDN nem o github.io. Para testar o 3D, sirva o repositório com
  `python3 -m http.server` e, no Playwright (Chromium em `/opt/pw-browsers`, flags
  `--use-angle=swiftshader --enable-unsafe-swiftshader`), redirecione
  `https://cdn.jsdelivr.net/npm/three@0.160.0/**` para uma cópia local de `npm pack three@0.160.0`.
  O jogo expõe `window.__pv3d` para testes. O WebGL por software roda a ~2 quadros/s, então use esperas longas.
- Verifique a sintaxe do 3D como módulo: copie `3d/main.js` para um arquivo `.mjs` e rode `node --check`
  (o `node --check` direto no `.js` não pega todos os erros).
- O usuário quer economizar limite de uso: evite testes e prints desnecessários, junte mudanças.
