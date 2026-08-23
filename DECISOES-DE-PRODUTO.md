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

### Limpeza (16/08/2026)

- **Modo Game Boy removido.** Duplicava a renderização das missões e dobrava o trabalho de cada
  fase. Saiu inteiro: componente, paleta, mensagens sem acento e o botão nos ajustes.
- **Mestre da Vila removido.** A arte (`mestre_azul.png`) nunca existiu no repositório; o hotspot
  levava para Status, que já tem a Torre do Mago. Pode voltar quando houver arte e propósito.

---

## Roadmap

| Fase | Escopo | Situação |
|---|---|---|
| **4A** | **Micro-etapas** — quebrar missão grande em partes, cada etapa com XP próprio **+ bônus ao concluir a missão** | Próxima |
| **4B** | **Atributos** — Foco, Disciplina, Energia e Constância | Depois |
| **5** | **Criação do Herói** — onboarding, personalização inicial, escolha de classe e montagem do mundo em torno da vida do jogador | Por último |

---

## Pendências pequenas

- **Auto-merge** no GitHub (Settings → General → Pull Requests) — opcional, só conveniência.
