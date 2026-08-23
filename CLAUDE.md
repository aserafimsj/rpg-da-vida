# QuesTAH — como trabalhar neste projeto

## Quem é o dono do projeto

O Adilson **não é programador**. Ele decide o produto; o código é comigo.

### Como falar com ele (regra número um)

**Sempre em português, e sempre mastigado.** Toda vez que ele precisar fazer algo fora
do chat — mexer no Supabase, na Vercel, no GitHub, no navegador — a explicação tem que ser:

- **passo a passo numerado**, um clique por passo;
- dizendo **onde exatamente** clicar ("no menu da esquerda", "no canto de cima à direita");
- dizendo **o que ele vai ver na tela** depois de cada passo, para ele saber se acertou;
- com o **texto literal dos botões** (`Run`, `Deployments`, `Redeploy`), porque a tela dele
  pode estar em inglês;
- **sem jargão**. Se um termo técnico for inevitável, explicar na mesma frase o que é.

Nunca escrever "é só publicar" ou "roda o build". Isso não é instrução para ele — é
instrução para outro programador.

Quando o passo depender de rodar SQL no Supabase, o guia vai num arquivo `MIGRACAO*.md`
com instruções literais de copiar-e-colar, na ordem exata.

## Regras de produto que não se negociam

- **Perder progresso é inaceitável em qualquer hipótese.** Toda migração é aditiva e
  reversível; nada de apagar ou reescrever dado do jogador.
- **O mundo nunca regride.** Ausência não é punida. "Seu mundo espera por você."
- As decisões de produto vivem em `DECISOES-DE-PRODUTO.md`. A visão do QuesTAH World
  vive em `ARQUITETURA-QUESTAH-WORLD.md`. Ler antes de propor mudança.

## As quatro camadas do jogo

1. **Classe** — identidade escolhida pelo jogador na Criação do Herói.
2. **Atributos** — evolução e padrões de comportamento (Foco, Disciplina, Energia, Constância).
3. **Categorias** — as áreas da vida do jogador.
4. **Missões** — as ações concretas do dia.

## Armadilhas deste código (já quebraram produção)

- **`Map` neste projeto é o ícone do `lucide-react`**, importado no topo de
  `RpgDaVida.tsx`. Usar `new Map()` nesse arquivo quebra em runtime. Use objeto simples.
- **`RpgDaVida.tsx` tem `@ts-nocheck`** no topo: o build **não** pega erro de tipo lá.
  Só teste de verdade pega.
- **O Next cacheia `fetch` por padrão.** Qualquer coisa que consulta a mesma URL repetidas
  vezes (polling) precisa de `cache: "no-store"`, senão recebe a primeira resposta para sempre.
- **`NEXT_PUBLIC_*` é congelado no momento do build**, não lido em tempo de execução.
  Mudou a variável na Vercel? Precisa publicar de novo.

## Antes de implementar algo grande

Investigar primeiro, implementar depois. Esse padrão já pegou coluna faltando no banco e
conta de XP que não fechava. Vale a pena.
