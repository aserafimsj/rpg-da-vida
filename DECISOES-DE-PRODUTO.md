# Decisões de produto — QuesTAH

> Registro vivo das decisões já tomadas. Serve para não reabrir discussões
> encerradas e para orientar as fases seguintes.
>
> Última atualização: 16/08/2026

---

## Filosofia

**O RPG se adapta à vida do usuário, e não o usuário se adapta ao RPG.**

Consequências práticas que valem como regra:

- **Zero punição.** Nada no app pode fazer o jogador se sentir devedor.
- **Começar é a parte difícil.** O app existe para facilitar o primeiro passo e celebrar o fim.
- **Nenhum mural de culpa.** Contadores de falha existem no dado, nunca na tela.
- **O app é multiusuário.** Nenhum usuário novo pode ver referências à vida do dono do projeto.
- **Progresso é sagrado.** Perder XP, streak ou vínculo do monstrinho é inaceitável em qualquer
  hipótese, em qualquer migração.

---

## Diretriz: o mundo nunca regride

> **Seu mundo espera por você. Ele não cobra sua ausência.**

Extensão direta do "pular sem culpa" da Fase 2, agora aplicada à paisagem. Se o mundo cresce
com o progresso, ele **não pode** encolher com a ausência — isso seria a punição mais
eficiente já criada no produto, contra a diretriz mais forte dele, e para o público em que a
culpa é mais tóxica.

Se o jogador ficar dias ou semanas fora:

- ❌ o progresso **não** é perdido
- ❌ construções **não** desaparecem
- ❌ regiões **não** ficam destruídas
- ❌ **não** existe degradação
- ❌ **não** existe punição visual
- ❌ **não** existe a sensação de "você abandonou seu mundo"

A ausência pode, no futuro, ser representada por estados **neutros ou atmosféricos** —
noite, menos movimento, clima diferente, silêncio. **Nunca destruição ou perda.** E voltar
acende tudo de novo, com boas-vindas em vez de cobrança.

## Diretriz de arquitetura: as quatro camadas

Esta separação vale como diretriz para todas as fases seguintes.

| Camada | O que representa | Quem define |
|---|---|---|
| **Classe** | A **identidade** do herói | Escolhida pelo jogador na Criação do Herói (Fase 5) |
| **Atributos** | A **evolução e os padrões de comportamento** ao longo do uso | Emergem do uso — o jogador não escolhe diretamente |
| **Categorias** | As **áreas da vida** do jogador | Criadas e personalizadas pelo jogador |
| **Missões** | As **ações concretas** que o jogador realiza | Criadas pelo jogador, dentro das categorias |

**Por que importa:** cada camada responde a uma pergunta diferente — *quem eu sou*, *como eu venho
me comportando*, *onde eu atuo*, *o que eu faço*. Misturá-las foi exatamente o problema do código
original, onde a "classe" era derivada da categoria mais usada.

---

## Requisito em aberto para a Fase 5

**Problema registrado:** se a classe é escolhida pelo jogador, os atributos correm o risco de
virar números decorativos, sem efeito visível no personagem.

**Requisito:** investigar uma forma de os atributos influenciarem a experiência do herói
**sem substituir a classe escolhida**.

Possibilidades a avaliar na Fase 5 (nenhuma decidida, nenhuma implementada):

- atributos refletidos visualmente na ficha do personagem
- habilidades desbloqueadas
- títulos
- equipamentos
- efeitos / passivas
- evolução visual
- características especiais da classe
- eventos ou conteúdos desbloqueados

**Não decidir nem implementar nada disso antes da Fase 5.**

### Hipótese de produto para a 5B (registrada, não decidida)

Surgiu do estudo do QuesTAH World uma resposta que não estava na lista acima:

> **Os atributos moldam o mundo, não o personagem.**

- **Classe** → a identidade escolhida pelo jogador (⚔️ Guerreiro)
- **Atributos** → os padrões desenvolvidos pelo comportamento (🎯 Foco, 🛡️ Disciplina, ⚡ Energia, 🔥 Constância)
- **Mundo** → a manifestação visual desses atributos

Manifestações imaginadas — **hipótese, não design final**:

| Atributo | Possível manifestação |
|---|---|
| 🎯 Foco | clareza, iluminação, pontos de interesse mais definidos |
| 🔥 Constância | vegetação, crescimento, florescimento, continuidade |
| 🛡️ Disciplina | construções, organização, estruturas bem cuidadas |
| ⚡ Energia | movimento, NPCs, atividade, partículas, vida |

Resolve a tensão de forma elegante: a classe continua sendo **quem você é**, os atributos
viram **como o seu mundo se parece**. Um não pisa no outro.

**A investigar na 5B.** Por isso o World 0 vem antes: para a 5B nascer sabendo que existe
uma camada World onde os atributos podem se manifestar.

---

## Decisões por fase

### Fase 1 — Categorias personalizáveis ✅ no ar

- Categorias são dado (`data.categories`), não constante.
- **Categorias de sistema** (`sistema: 'pet' | 'saude'`): renomeáveis, recoloríveis e reordenáveis,
  mas **nunca desativáveis nem apagáveis** — sustentam o monstrinho e a aba Saúde.
- **Categoria nunca é apagada**, só desativada: preserva histórico e estatísticas.
- **Máximo de 8 categorias ativas** (inativas ilimitadas), com aviso gentil ao atingir o teto.
- Mensagens de conclusão de categorias novas usam um conjunto genérico.

### Fase 2 — Missões ✅ no ar

- **Dificuldade é declarada**, nunca inferida do XP: `rapida | normal | epica`.
- **Recorrência** com 4 tipos: `sempre`, `dias_semana`, `a_cada_n_dias`, `unica`.
- **Pular não pune e não conta.** Missão pulada sai do dia, não gera XP, **não conta para a streak**
  e **não entra na penalidade do Modo Difícil**.
- O contador `skipsTotal` existe no dado e **de propósito não vira tela**.

### Fase 3 — Fundação no banco ✅ no ar

- Três tabelas: `categorias`, `missoes`, `conclusoes`. Nada além disso.
- **IDs continuam textuais** (`pet`, `casa`, `c_x9f2`), com PK composta `(user_id, id)` — elimina
  toda reindexação.
- A PK de `conclusoes` **é** a regra anti-farm de 1x/dia.
- **O JSON não foi abandonado**: `saves.data` continua sendo escrito e é a fonte da verdade de XP,
  ouro, gemas, streaks, monstrinho, conquistas e configurações.
- Migração automática por usuário (backfill no app), sem script manual.
- Virada da leitura por flag (`NEXT_PUBLIC_LEITURA_TABELAS`), reversível a qualquer momento.

### Fase 4A — Micro-etapas ✅ no ar

- Etapas são **parte da missão**, nunca missões-filhas — senão o contador do dia, o Modo Foco,
  o filtro de rápidas, o bônus do dia, a penalidade do Modo Difícil, "Tarefas feitas", a
  categoria favorita e o agrupamento passariam a contar etapa como tarefa.
- **Quebrar nunca aumenta o XP.** O XP da etapa não é armazenado: é sempre derivado do total
  da missão, então não existe estado onde a conta divirja. 40 XP em 4 etapas = 8+8+8+8 + 8 de bônus.
- Missões que já existem **mantêm o XP atual** ao serem quebradas.
- Etapa concluída entra em `doneToday` com id composto (`t_quarto#e1`) — ganha de graça o reset
  diário, a trava anti-farm e o comportamento em missões recorrentes.
- Etapa dá XP e mantém a chama acesa, mas **não conta como tarefa nem para a categoria**.
- Fechamento **automático** ao marcar a última etapa, com o bônus.
- **Comemoração forte só no fechamento** — sem confete ou som por etapa, para o clímax não diluir.
- Teto suave de **7 etapas** com sugestão gentil, nunca bloqueio.
- No Modo Difícil, missão quebrada **só custa as etapas que faltaram**.

### Fase 4B — Atributos ✅ no ar

- Quatro atributos: **🎯 Foco · 🛡️ Disciplina · ⚡ Energia · 🔥 Constância**.
- Crescem do **comportamento**, não das categorias — coerente com a diretriz das quatro camadas:
  atributos são padrões de comportamento, categorias são áreas da vida. **Ninguém configura nada.**
  - **Foco** — etapas concluídas e conclusões dentro do Modo Foco
  - **Disciplina** — missões épicas e normais concluídas, dias de remédio em dia
  - **Energia** — volume de missões concluídas e missões rápidas
  - **Constância** — dias ativos e maior sequência
- **Nível 0–10** com barra, curva quadrática (nível 10 = 2500 pontos). Nunca regride.
- **O histórico conta desde já** onde é possível: Constância, Energia e Disciplina nascem do que
  já foi construído. **Foco começa em 0** de propósito — é o sinal que passou a ser medido agora.
  Na migração, as tarefas antigas entram como "normais": supor o meio-termo é mais honesto que zerar.
- Aparecem na **aba Avatar**, ao lado do personagem — a ficha do herói.
- **Sem efeito no jogo nesta fase.** Fazer os atributos influenciarem a experiência sem substituir
  a classe escolhida é requisito registrado da Fase 5 (veja acima).
- A **classe continua** sendo "Guardião de {categoria favorita}" até a Criação do Herói.
- Sem migração de banco: os sinais vivem no save.

### Fase 5A — Criação do Herói ✅ no ar

- **Onboarding pulável**, com um mundo pronto de reserva: quem não tem paciência para
  formulário começa a jogar na hora e configura depois.
- 7 passos: nome · classe · áreas da vida · missões iniciais · meta de sequência · glicemia · resumo.
- **A classe é escolhida**, entre 8 arquétipos de postura (Guardião, Mago, Domador…) — sem
  amarração com categorias. Sem classe escolhida, o app segue mostrando a categoria favorita.
- **Meta de sequência** do usuário (3/7/15/30 dias). Aparece como progresso no fogo e vira
  troféu quando batida — nunca cobrança.
- **Só a glicose virou opcional.** Remédios, água e refeições seguem para todo mundo. Para quem
  já jogava, a glicose continua ligada.
- **Quem já joga nunca é levado ao onboarding.** Recebe um convite discreto nos ajustes para
  escolher classe, meta e ligar/desligar a glicose — sem tocar em categorias, missões ou progresso.
- **Erro de rede jamais é confundido com usuário novo**: o onboarding só aparece quando a
  consulta ao save funcionou e não havia nada. É a trava que impede sobrescrever o jogo de alguém.
- O perfil vive no save (`data.perfil`), não em tabela: é configuração, não dado relacional —
  e evita mais uma ida ao SQL. Pode virar tabela no futuro sem prejuízo.

### Limpeza (16/08/2026)

- **Modo Game Boy removido.** Duplicava a renderização das missões e dobrava o trabalho de cada
  fase. Saiu inteiro: componente, paleta, mensagens sem acento e o botão nos ajustes.
- **Mestre da Vila removido.** A arte (`mestre_azul.png`) nunca existiu no repositório; o hotspot
  levava para Status, que já tem a Torre do Mago. Pode voltar quando houver arte e propósito.

---

## Roadmap

| Fase | Escopo | Situação |
|---|---|---|
| **4A** | **Micro-etapas** — quebrar missão grande em partes, cada etapa com XP próprio **+ bônus ao concluir a missão** | ✅ no ar |
| **4B** | **Atributos** — Foco, Disciplina, Energia e Constância | ✅ no ar |
| **5A** | **Criação do Herói** — onboarding, escolha de classe, meta de sequência e montagem do mundo | ✅ no ar |
| **World 0** | **Portal e fundação do QuesTAH World** — pareamento por QR, código de segurança, token temporário, snapshot versionado e a rota `/world`. **Sem 3D.** | ✅ no ar |
| **5B** | **Efeito dos atributos** — fazer Foco/Disciplina/Energia/Constância influenciarem a experiência **sem substituir a classe escolhida**. Hipótese principal: os atributos moldam o mundo | Próxima, com investigação própria |
| **World 1+** | Cena 3D, regiões, progressão visual, pet, exploração | Depois (veja `ARQUITETURA-QUESTAH-WORLD.md`) |

---

## Pendências pequenas

- **Auto-merge** no GitHub (Settings → General → Pull Requests) — opcional, só conveniência.
