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

## Controles

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

## Sistemas

- **Núcleos** de vida, stamina e Olho Morto, no estilo RDR2: o anel externo é o valor atual e o preenchimento interno é o núcleo, que esvazia com o tempo.
- **Honra**: sobe com boas ações e cai com crimes.
- **Procurado**: matar um inocente põe uma recompensa pela sua cabeça, e os moradores passam a fugir de você.
- **Ciclo de dia e noite**, com lampiões e janelas acesas à noite.
- **Higiene e barba**: os moradores comentam se você estiver sujo ou bêbado.
- **Minimapa** com ícones das lojas e marcador da caçada.
- Sons sintetizados com a Web Audio API.
