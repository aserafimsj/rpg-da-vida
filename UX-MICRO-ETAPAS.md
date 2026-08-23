# Estudo de UX — Micro-etapas (Fase 4A)

> Investigação **antes** de implementar, a pedido do dono do projeto.
> Nada aqui foi codificado. O objetivo é fechar as decisões de experiência que
> afetam banco, componente de missão e a futura criação de hábitos.
>
> Base: `main` @ `8af3179` · 16/08/2026

---

## 1. Resumo executivo

**A recomendação central:** etapas devem ser **parte da missão**, não missões-filhas.

Parece detalhe técnico, mas é decisão de UX: se as etapas virarem missões de verdade,
elas entram na lista do dia, no Modo Foco, no filtro de rápidas, no contador de tarefas,
no bônus do dia e na penalidade do Modo Difícil. Uma missão com 5 etapas viraria
**6 linhas na lista diária** — exatamente o oposto do que a funcionalidade existe para fazer.

**Um achado que muda o planejamento:** a tabela `missoes` criada na Fase 3 **não tem** coluna
para etapas (`fase3.sql` linha 40). A 4A vai precisar de **um novo passo de SQL** — pequeno
(uma linha), mas é mais uma ida ao Supabase. Já está previsto na seção 8.

**A boa notícia:** existe um encaixe elegante no que já foi construído. Se a etapa concluída
for registrada em `doneToday` com um id composto (`t_abc#e1`), ela ganha de graça o reset
diário, a trava anti-farm e o comportamento em missões recorrentes — **sem uma linha de
código nova para isso**. Detalhes na seção 3.

---

## 2. A decisão estrutural (a que trava todas as outras)

### Opção A — Etapas como missões-filhas (`parent_id`)

Era o que o `DIAGNOSTICO.md` propôs. **Recomendo descartar.** Motivo: 8 lugares do código
iteram `data.tasks` e todos passariam a contar etapas como missões.

| O que quebra | Onde | Efeito |
|---|---|---|
| Contador do dia "2/5" | `RpgDaVida.tsx:1306, 1405` | Vira "2/11" numa missão de 5 etapas |
| Lista do Modo Foco | `:1086` | Etapas viram cartões separados no foco |
| Filtro "Missão Rápida" | `:1085` | Etapas curtas poluem o filtro |
| Bônus de dia completo | `:905` | Fica muito mais difícil de fechar o dia |
| Penalidade do Modo Difícil | `:709` | Multiplica a punição por missão grande |
| "Tarefas feitas" | `:834` | Infla a estatística e adianta o Chefe do Mês |
| Categoria favorita / classe | `:843` | Missão com muitas etapas distorce a classe |
| Agrupamento por categoria | `:1289` | Etapas aparecem soltas no grupo |

Corrigir isso significaria espalhar `if (!t.parent_id)` por todo o arquivo — o tipo de remendo
que reabre bug seis meses depois.

### Opção B — Etapas dentro da missão ✅ recomendada

```js
// dentro de uma missão, em data.tasks
{
  id: "t_quarto", name: "Arrumar o quarto", xp: 40, dificuldade: "epica",
  etapas: [
    { id: "e1", nome: "Recolher roupas", xp: 6 },
    { id: "e2", nome: "Arrumar cama",    xp: 6 },
  ],
  bonusEtapas: 10,
}
```

- A missão continua sendo **uma linha** na lista do dia. Nada acima quebra.
- Etapa não tem categoria, recorrência, dificuldade nem ícone próprios — **ela herda tudo
  da missão**. Menos campos para o usuário preencher, que é o espírito da regra de produto.
- `etapas` ausente ou vazio = missão simples de sempre.

**Trade-off honesto:** consultar "quais etapas eu mais deixo pela metade" fica mais difícil no
banco (dado dentro de JSON, não em coluna). Como isso não é necessário agora, é um custo
aceitável — e reversível no futuro.

---

## 3. Onde guarda o "já fiz esta etapa"

Aqui está o encaixe mais bonito com o que já existe.

**Recomendação: a etapa concluída entra em `doneToday` com id composto** — `"t_quarto#e1"`.

O que isso resolve **sem código novo**:

| Comportamento | Como ganha de graça |
|---|---|
| Reset diário das etapas | `doneToday = []` no reset (`:710`) já limpa tudo |
| Anti-farm da etapa | `scoredToday.ids` já impede pontuar 2× no mesmo dia |
| Missão recorrente | Amanhã as etapas voltam desmarcadas, automaticamente |
| Missão "a cada N dias" | Mesma coisa, sem caso especial |
| Apagar missão | `removeTask` já limpa `doneToday` (precisa só varrer o prefixo) |

E o mais importante: **a definição da missão nunca é mutada para marcar progresso**. Etapa
é definição (`nome`, `xp`); "feita hoje" é estado do dia. Misturar os dois é o que costuma
gerar bug de virada de dia.

**A alternativa** — um campo `feita: true` dentro da etapa — obrigaria a reescrever a missão
toda todo dia no reset e no banco. Descartada.

---

## 4. Respostas às nove perguntas

### 4.1 Onde o usuário cria as etapas

**Duas portas, e as duas importam:**

1. **No formulário da missão** (`TaskForm`), como uma seção opcional recolhida:
   *"⛏️ Quebrar em etapas (opcional)"*. Fechada por padrão — quem não precisa nem vê.
2. **Direto no card**, quando a missão já existe: um botão discreto **"quebrar em partes"**
   dentro da missão expandida.

A porta 2 é a mais importante para TDAH, e é a que costuma ser esquecida: a necessidade de
quebrar quase nunca aparece na hora de criar a missão — **aparece na hora em que a pessoa
trava nela**. Se quebrar exigir "editar missão → rolar formulário → achar a seção", o resgate
não acontece.

### 4.2 Como aparecem dentro da missão

Ver a seção 5 (o desenho da tela).

Em resumo: **recolhido por padrão**, mostrando nome, XP total, progresso e — em destaque —
o próximo passo. Um toque expande a lista completa.

### 4.3 Podem ser adicionadas depois?

**Sim, e é o caso de uso principal.** Ver 4.1.

Adicionar uma etapa a uma missão já iniciada hoje não deve mexer no que já foi feito: as
etapas concluídas continuam concluídas, o total sobe, e o progresso vira "2/6" em vez de "2/5".

### 4.4 Podem ser reordenadas?

**Sim**, com ▲▼ — igual à tela de Reinos da Fase 1. Consistência de linguagem, sem
drag & drop (que é ruim de acertar no celular e péssimo com tremor ou pressa).

A ordem importa muito aqui, porque é ela que define **qual é o próximo passo**.

### 4.5 Missão pode existir sem etapas?

**Sim — e esse é o padrão absoluto.** É a regra de produto que você formulou, e ela deve
aparecer no código como: `etapas` ausente ⇒ a missão se comporta exatamente como hoje,
sem nenhuma diferença visual.

Nada de "0/0 etapas", nada de seção vazia, nada de campo a mais no formulário.

### 4.6 Como fica uma missão recorrente?

**As etapas se repetem junto com a missão**, desmarcadas. É consequência automática da
decisão da seção 3.

*Exemplo:* "Arrumar o quarto", às segundas e quintas. Toda segunda as 5 etapas reaparecem
zeradas.

**Caso especial — missão `unica`:** ao concluir, ela é aposentada (`completedOnce`) e as
etapas vão junto. Sem tratamento adicional.

### 4.7 O que acontece ao editar uma etapa

| Ação | Regra proposta |
|---|---|
| **Renomear** | Livre. Não afeta o que já foi feito |
| **Mudar o XP** | Vale a partir da próxima vez. XP já creditado **nunca** é retirado (mesma regra do "desfazer" de missão) |
| **Apagar uma etapa** | Remove também de `doneToday`/`scoredToday`. Se estava concluída, o XP já ganho **fica** |
| **Apagar a última etapa** | A missão volta a ser simples — sem drama, sem aviso |
| **Reordenar** | Livre. Só muda qual é o próximo passo |

Princípio por trás: **nenhuma edição tira XP de ninguém.** Zero punição vale para o
formulário também.

### 4.8 Como mostrar XP de etapa e bônus

Ver a seção 7 — tem uma pergunta aberta importante ali sobre a aritmética.

### 4.9 Como evitar o cansaço visual

Ver a seção 6. É o ponto mais delicado do estudo.

---

## 5. O desenho da tela

Partindo do seu esboço, com o "próximo passo" incorporado:

### Estado recolhido (o padrão)

```
┌────────────────────────────────────────────┐
│ ☐  🧹  Arrumar o quarto          40 XP  🔥 │
│        ▓▓▓▓▓▓░░░░░░░░░  2/5                │
│        🎯 Agora: Recolher roupas      ✓    │
└────────────────────────────────────────────┘
```

Três informações, nesta ordem de peso visual:
1. **O próximo passo**, em destaque — é a única coisa que a pessoa precisa saber agora
2. O progresso, como barra + "2/5" (progresso visível é combustível)
3. O nome da missão e o XP

O **✓ à direita do próximo passo** conclui *só aquela etapa*, sem expandir nada. É o caminho
de um toque: abrir o app → ver o que fazer → marcar → ver o próximo aparecer.

### Estado expandido (um toque no card)

```
┌────────────────────────────────────────────┐
│ ☐  🧹  Arrumar o quarto                    │
│        30 XP nas etapas + 10 XP ao fechar  │
│        ▓▓▓▓▓▓░░░░░░░░░  2/5                │
│ ─────────────────────────────────────────  │
│  ☑  Guardar objetos              +6 XP     │
│  ☑  Arrumar cama                 +6 XP     │
│  🎯 Recolher roupas              +6 XP     │
│  ☐  Tirar lixo                   +6 XP     │
│  ☐  Varrer chão                  +6 XP     │
│ ─────────────────────────────────────────  │
│  ⛏️ editar etapas                          │
└────────────────────────────────────────────┘
```

Detalhe deliberado: **as concluídas sobem para o topo**, esmaecidas. Isso faz a lista
"encolher" visualmente conforme avança, e o próximo passo fica sempre logo abaixo da linha
do que já foi feito — em vez de perdido no meio.

### No Modo Foco

O Modo Foco (`FocusOverlay`) hoje mostra uma missão por vez, gigante. Com etapas, ele deve
mostrar **a etapa, não a missão**:

```
        FOCO · missão 1 de 3

              🧹
       Recolher roupas
   de "Arrumar o quarto" · 2/5

         Recompensa: +6 XP

        [ ✓ Concluir ]
       ↷ Pular esta hoje
```

Essa é, na minha leitura, a combinação mais forte do app inteiro: o Modo Foco já existia para
tirar o ruído da tela, e a micro-etapa dá a ele um alvo do tamanho certo.

---

## 6. Anti-cansaço visual (o ponto crítico para TDAH)

Uma missão de 10 etapas **não pode** virar 10 linhas na tela. Regras propostas:

1. **Recolhido é o padrão.** Sempre. Inclusive depois de expandir e sair da tela.
2. **Nunca mais de uma missão expandida por vez.** Abrir uma fecha a outra.
3. **Só o próximo passo tem destaque visual.** Os demais ficam em cinza, tamanho menor.
   Uma lista onde tudo grita é uma lista onde nada é lido.
4. **Concluídas sobem e esmaecem** — a lista parece encolher.
5. **Teto suave em 7 etapas.** Ao criar a oitava, um aviso gentil:
   *"Sete passos já é bastante. Que tal virar duas missões?"* — sugestão, nunca bloqueio.
   (7 é o limite prático de memória de trabalho, e ainda mais apertado com TDAH.)
6. **Sem porcentagem.** "2/5" é concreto; "40%" exige conta mental.
7. **Nada de contagem de etapas puladas.** Vale a mesma regra do `skipsTotal`: existe no
   dado, nunca na tela.

E uma decisão sobre o que **não** fazer: nada de animação de check em cascata, confete por
etapa, ou som a cada passo. A recompensa sonora/visual forte fica para o **fechamento da
missão** — senão o clímax se dilui e o cérebro para de registrar a diferença entre avançar
e terminar.

---

## 7. XP e bônus — com uma pergunta em aberto

No seu esboço:

```
⚔️ ARRUMAR O QUARTO
40 XP + 10 XP bônus
☐ Recolher roupas +6 XP   (× 5 etapas = 30 XP)
```

**A conta não fecha:** 5 × 6 = 30, mas o cabeçalho diz 40. Isso revela uma escolha que
precisa ser feita, e ela tem consequência real na experiência.

### Opção 1 — XP da missão é derivado das etapas ✅ recomendada

`XP total = soma das etapas + bônus`. No exemplo: 30 + 10 = **40 XP**.

- O número sempre fecha, e o usuário nunca faz conta.
- Ao criar uma etapa, o total sobe sozinho.
- **Custo:** ao quebrar uma missão existente de 40 XP em 5 etapas, o app precisa distribuir
  os 40 entre elas (8 cada) ou avisar que o valor vai mudar.

### Opção 2 — A missão mantém o XP próprio

Missão vale 40 independente das etapas, e as etapas dão XP "extra" por cima.

- Quebrar uma missão não mexe no valor dela.
- **Custo:** o total real vira 40 + 30 + 10 = 80, e a economia do jogo infla sem o usuário
  perceber. Missão quebrada passa a valer o dobro de uma não quebrada — o que **premia
  quebrar**, e distorce o equilíbrio.

**Minha recomendação é a Opção 1**, e o bônus sugerido automaticamente em **25% da soma**
(mínimo 5, arredondado), editável. No exemplo: 30 → bônus 8. O bônus existe para dizer
*"terminar vale mais do que a soma das partes"*, que é a mensagem central do app.

### Regras de contagem (importantes e invisíveis)

Concluir uma **etapa**:
- ✅ dá XP e ouro
- ✅ marca o dia como ativo (mantém a chama viva — quem fez uma etapa se mexeu)
- ❌ **não** incrementa "Tarefas feitas"
- ❌ **não** conta para categoria favorita / classe

Concluir a **missão** (última etapa marcada):
- ✅ dá o bônus, incrementa "Tarefas feitas", conta para a categoria, dispara conquistas

Sem essa separação, uma missão de 10 etapas valeria 10 tarefas nas estatísticas, adiantaria
o Chefe do Mês e distorceria a classe do herói.

---

## 8. Impacto no banco (o novo passo de SQL)

A tabela `missoes` da Fase 3 não tem onde guardar etapas. A 4A precisa de:

```sql
alter table public.missoes
  add column if not exists etapas jsonb not null default '[]'::jsonb;
alter table public.missoes
  add column if not exists bonus_etapas int not null default 0;
```

Duas linhas, idempotentes, sem risco de perda — mas **é mais uma ida ao SQL Editor**.
Vai precisar de um `MIGRACAO-4A.md` no mesmo formato do anterior.

**`conclusoes` não muda.** A coluna `missao_id` é `text` livre, sem chave estrangeira — se um
dia quisermos histórico por etapa, `"t_quarto#e1"` cabe ali sem alterar nada. **Não recomendo
fazer isso na 4A**: só a conclusão da missão vai para o histórico, como hoje. Histórico por
etapa quando houver uma pergunta real para responder com ele.

---

## 9. Recorte proposto para a 4A

**Entra:**
- Campo `etapas` + `bonusEtapas` na missão (JSON e banco)
- Criar/editar/reordenar/apagar etapas, pelo formulário e pelo card
- Card recolhido com progresso e **próximo passo em destaque**, expansão por toque
- Concluir etapa com XP próprio; bônus ao fechar a missão
- Modo Foco operando por etapa
- Teto suave de 7 etapas com sugestão gentil
- `MIGRACAO-4A.md` com o passo de SQL

**Fica de fora (proposital):**
- Histórico por etapa no banco
- Etapas com recorrência, categoria ou dificuldade próprias
- Sub-etapas (aninhamento) — um nível só, e essa decisão já estava tomada
- Qualquer coisa de atributos (é a 4B)
- Modelos de missão / etapas sugeridas por IA (assunto da Fase 5 em diante)

---

## 10. O que só você pode decidir

1. **A aritmética do XP** (seção 7): total derivado das etapas (recomendo) ou missão com XP
   próprio + etapas por cima? É a decisão de maior impacto no equilíbrio do jogo.

2. **Ao quebrar uma missão que já existe**, o que fazer com o XP atual dela? Distribuir entre
   as etapas, ou deixar o total crescer e avisar?

3. **O bônus é sempre automático (25%)** ou você quer poder escolher o valor a cada missão?

4. **Concluir a última etapa fecha a missão automaticamente**, ou a pessoa ainda dá um toque
   final no "concluir missão"? *(Minha inclinação: fecha sozinho e comemora — pedir um toque
   a mais depois de terminar tudo é anticlímax. Mas há quem goste do ritual de bater o martelo.)*

5. **Marcar uma etapa mantém a chama do dia acesa?** Recomendo que sim — quem fez uma etapa
   se mexeu. Mas é uma decisão sua sobre o que "dia ativo" significa.

6. **Quebrar uma missão em etapas muda a dificuldade dela?** Uma missão épica quebrada em 5
   passos rápidos ainda é épica? *(Inclinação: sim, a dificuldade é da missão, não das partes.)*

---

## 11. Uma observação sobre o mundo aberto

Você mencionou que isso aproxima a missão de uma *quest guiada*, e concordo — mas vale
registrar o limite: uma missão com etapas é uma **sequência linear**. Quest de mundo aberto
costuma ter ramificação, pré-requisitos e ordem livre.

A estrutura proposta aqui suporta bem o linear, e nada nela impede o resto depois. Mas se o
mundo aberto for para valer, o que vai importar não é a etapa — é a **relação entre missões**
(esta desbloqueia aquela). Isso é outro modelo, e vale uma investigação própria quando chegar
a hora. Não precisa influenciar a 4A.
