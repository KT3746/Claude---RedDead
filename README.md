# Poeira Vermelha

Um pequeno jogo de faroeste em 2D (visão de cima), inspirado em *Red Dead Redemption 2*.
Você é um forasteiro na cidade de **Vale Esperança** (1899). Anda pela cidade, conversa com moradores,
bebe no saloon, cuida do seu cavalo e caça recompensas.

Feito com HTML5 Canvas e JavaScript puro, sem dependências nem etapa de build.

## Como jogar

Abra o `index.html` no navegador. Se preferir, rode um servidor local:

```bash
npx http-server .   # ou: python3 -m http.server
```

## No celular

O jogo detecta a tela de toque e troca os controles:

- **Andar:** arraste o dedo no lado esquerdo da tela (joystick virtual). Levar até a borda faz correr ou galopar.
- **Ações:** os botões aparecem sozinhos perto de portas, pessoas, do cavalo, dos bancos etc. É só tocar neles.
- **🔫 Atirar:** mira automática no bandido ou na garrafa mais próxima (nunca em moradores). Sem alvo, atira para a frente.
- **◎** Olho Morto · **↻** Recarregar · **🎒** Alforje (toque em um item para comer ou beber o tônico).

Funciona na vertical e na horizontal; a horizontal mostra mais do mapa.

## Controles (teclado e mouse)

| Tecla | Ação |
|---|---|
| WASD / Setas | Andar |
| Shift | Correr / Galopar |
| E | Interagir (portas, pessoas, cavalo, bancos, ervas...) |
| F | Ação secundária (provocar, acariciar o cavalo, dar cenoura) |
| Clique esquerdo | Atirar |
| Botão direito | Mirar |
| R | Recarregar |
| Q | Olho Morto (câmera lenta) |
| H | Assobiar para o cavalo |
| C | Comer feijão |
| T | Beber tônico |
| G | Tocar o chapéu |
| Tab | Alforje (inventário) |
| M | Som liga/desliga |

## O que dá para fazer

- **Saloon**: beber whisky ou cerveja (a tela gira quando você fica bêbado), jogar dados, tocar piano por gorjetas, começar uma briga.
- **Hotel**: dormir até de manhã, tomar banho ou banho de luxo.
- **Armazém**: comprar feijão, munição, tônico e cenouras; vender ervas colhidas fora da cidade.
- **Banco**: depositar e sacar. O dinheiro no banco não se perde quando você morre.
- **Barbeiro**: a barba cresce com o tempo, e o barbeiro faz ou apara.
- **Igreja**: rezar e fazer doações, que aumentam a honra.
- **Xerife**: aceitar caçadas de recompensa (os bandidos atiram de volta), receber o pagamento e pagar a multa se você for procurado.
- **Estábulo**: escovar e alimentar o cavalo *Tempestade*.
- **Correio**: ver cartas e enviar telegramas.
- **Na rua**: cumprimentar ou provocar moradores, acariciar o cachorro (ele passa a te seguir), sentar nos bancos, lavar o rosto no cocho, beber água do poço, atirar em garrafas atrás do xerife.
- **Fora da cidade**: colher ervas e acampar na fogueira a leste.

## Novidades

- **Progresso salvo** automaticamente neste navegador. Na tela inicial aparecem *Continuar jornada* e *Novo jogo*.
- **Caça**: coelhos, cervos e coiotes pelos arredores. Esfole o animal ([E] ou botão), venda as peles no Armazém e cozinhe a carne na fogueira do acampamento. Coiotes atacam, principalmente à noite.
- **Eventos na cidade**:
  - Um **ladrão** rouba a bolsa de alguém. Alcance-o (ou atire) e escolha entre devolver a bolsa (+honra, recompensa) ou ficar com ela (−honra).
  - Um morador **picado por cobra** pede ajuda. Dê a ele um tônico ou feijão, ou roube-o.
- **Entregas** pelo Correio: leve encomendas para casas, a igreja, o acampamento ou as duas **fazendas** novas (Braithwaite ao norte, Rancho Esmeralda ao sul).
- **Fazendas**: ajude na lida por $1.50, compre leite ou ovos.
- **Trem** passando pela ferrovia ao sul. Não fique nos trilhos!
- **Clima**: céu nublado e chuva com trovões. A chuva lava a sujeira.
- **Som** liga/desliga (botão 🔊 ou tecla M).

## Sistemas

- **Núcleos** de vida, stamina e Olho Morto, no estilo RDR2: o anel externo é o valor atual e o preenchimento interno é o núcleo, que esvazia com o tempo.
- **Honra**: sobe com boas ações e cai com crimes.
- **Procurado**: matar um inocente põe uma recompensa pela sua cabeça, e os moradores passam a fugir de você.
- **Ciclo de dia e noite**, com lampiões e janelas acesas à noite.
- **Higiene e barba**: os moradores comentam se você estiver sujo ou bêbado.
- **Minimapa** com ícones das lojas e marcador da caçada.
- Sons sintetizados com a Web Audio API.
