# Diagnóstico de Arquitetura — QuesTAH

> Auditoria de reconhecimento (somente leitura) para avaliar o preparo do código atual
> diante da nova filosofia: **o RPG se adapta à vida do usuário, não o contrário.**
>
> Base analisada: `main` @ `1c03395` · Next.js 14 + Supabase + Vercel · PWA
> Data: 16/08/2026

---

## 1. Resumo executivo

O QuesTAH é hoje um **jogo de conteúdo fixo com uma camada fina de personalização por cima**. O usuário
pode criar missões, recompensas, remédios e refeições — mas sempre **dentro de 5 categorias imutáveis
declaradas em código** (`CATS`, `RpgDaVida.tsx:43-49`). Tudo o que dá identidade ao jogo (categorias,
missões-semente, curva de XP, chefes, conquistas, evolução do monstrinho, textos) é constante literal
dentro de **um único arquivo de 2.634 linhas**.

No banco, a situação é mais extrema: **não existe modelo de dados de jogo**. O Supabase tem exatamente
duas tabelas — `saves` (uma linha por usuário, com o jogo inteiro num campo `jsonb`) e
`push_subscriptions`. **Não existe tabela de categorias, de missões, de perfil do herói ou de
configurações.** Todo o estado vive dentro de um objeto JavaScript salvo inteiro a cada mudança.

A boa notícia: a estrutura de **missões já é dados** (array `data.tasks`, editável em runtime, com id,
nome, XP, ícone, cor e dias da semana). O caminho para categorias livres é curto — mas há **três pontos
que quebram com exceção em tela** assim que uma categoria fora da lista fixa aparecer
(`Aventura` linha 1231, `Stats` linha 2322, e o agrupamento na 1119).

Veredito: **a fundação de dados precisa ser construída, não refatorada.** Não há dívida arquitetural
grave a desfazer — há uma ausência a preencher. O onboarding de Criação do Herói e as mecânicas novas
(atributos, subtarefas, pular sem culpa) não têm onde morar hoje: não existe nenhum conceito de "perfil"
ou "configuração" no código, apenas `playerName: "Herói"` solto no save.

---

## 2. Inventário do hardcoded

Todos os caminhos são `src/components/RpgDaVida.tsx` salvo indicação em contrário.

### 2.1 Categorias, missões e economia

| Elemento | Arquivo : linha | Como está | Onde é consumido | Class. |
|---|---|---|---|---|
| **Categorias de missão** (5: pet/casa/pessoal/trabalho/saude) | `43-49` | Objeto literal `CATS` com `label`, `emoji`, `color` | `taskColor` (67), `Aventura` (1231-1232), `TaskForm` (1305, 1351), `toggleTask` (693), `Stats` (2322), `addWater` (817) | 🔴 |
| **Ordem de exibição das categorias** | `1119` | Ordem das chaves do literal `grouped = { pet, casa, pessoal, trabalho }` | Render dos grupos (1228) | 🔴 |
| **Categoria "saude" oculta do formulário** | `1305` | `Object.entries(CATS).filter(([k]) => k !== "saude")` | `TaskForm` | 🔴 |
| **Ícone de fallback por categoria** | `63` | `CAT_FALLBACK_ICON` (mapa literal) | `taskIcon` (64) | 🔴 |
| **Missões iniciais** (14 tarefas) | `72-87` | `BASE_TASKS`, array literal com nome, desc, xp, categoria, `need`, ícone, `days` | `freshData()` (445), migração de save (519) | 🔴 |
| **Valores de XP das missões** | `72-87` (semente) · `1360-1363`, `1988-1991`, `2047-2050` (formulários) | Semente literal; formulários oferecem escalas fixas `[5,10,15,20]` e `[3,5,8,10]` | `TaskForm`, `AddMedForm`, `MealForm` | 🟡 |
| **Ouro = XP (1:1)** | `652-653` | `d.xpTotal += task.xp; d.gold += task.xp;` — regra implícita, sem constante | `toggleTask` | 🔴 |
| **Curva de níveis** | `362` | `xpToNext = 100 + (lvl-1)*60 + (lvl-1)²*10` | `levelFromXp` (363), todo cálculo de nível | 🔴 |
| **Recompensas da loja** (5) | `112-118` | `DEFAULT_REWARDS` literal | `DEFAULT_DATA.rewards` (402) — depois vira dado editável | 🟡 |
| **Conquistas** (9) | `121-131` | `ACHIEVEMENTS` com função `check(snap)` embutida | `checkAchievements` (2604), `Stats` (2358) | 🔴 |
| **Chefes** (2) | `134-137` | `BOSSES` com `metric` string | `checkBosses` (2611), `BossList` (2289) | 🔴 |
| **Métrica dos chefes** | `2614`, `2290` | Ternário fixo: `b.metric === "medStreak" ? d.medStreak : d.tasksCompleted` | `checkBosses`, `BossList` | 🔴 |
| **Economia de gemas** | `140-142` | `GEMS_PER_LEVEL=5`, `GEMS_DAY_BONUS=10`, `GAME_GEM_DAILY_CAP=10` | `toggleTask` (687,716), `endGame` (760) | 🔴 |
| **Cosméticos** (12) | `320-335` | `COSMETICS` literal com custo/slot/bônus | `Cosmeticos` (1528), `equippedGemBonus` (337) | 🔴 |
| **Mapa da jornada** (5 estágios) | `249-255` | `JOURNEY` literal — nomes presumem foco em casa ("Vila do Caos", "Lenda Doméstica") | `stageFor` (612), `Avatar` (1927) | 🔴 |
| **Catálogo de 48 ícones** | `52-56` | `TASK_ICONS` array literal | `TaskForm` (1331) | 🟡 |
| **Paleta de 8 cores** | `57` | `TASK_COLORS` array literal | `TaskForm` (1343) | 🟡 |

### 2.2 Streak, recorrência e progresso

| Elemento | Arquivo : linha | Como está | Onde é consumido | Class. |
|---|---|---|---|---|
| **Streak de atividade** | `376-388` (`markActive`) | Campos soltos no save: `currentStreak`, `longestStreak`, `lastActiveDate`, `daysActive[]`. Incrementa se `lastActiveDate === ontem`, senão reseta para 1 | `toggleTask` (659), `addWater` (808) | 🟡 |
| **Quebra de streak** | `576-579` | No reset diário: zera `currentStreak` e liga `streakBrokenNote` (aviso gentil, 1179) | `Aventura` | 🟡 |
| **Meta de streak do usuário** | — | **Não existe.** As metas são fixas nas conquistas (7 e 30 dias, linhas 124-125) | — | 🔴 |
| **Streak de remédios** | `672-680`, `574` | `medStreak`, `medDaysTotal`, `lastMedDate` — lógica separada e duplicada da streak principal | `checkBosses`, `Saude` (2229) | 🔴 |
| **Recorrência de missão** | `375` (`isActiveToday`) | Só dias da semana: `t.days` = array de 0-6. Sem "a cada N dias", sem data-alvo, sem prazo | `todayTasks` (825), reset diário (559) | 🟡 |
| **Dificuldade da missão** | `826` | **Não existe campo.** "Missão Rápida" é inferida de `t.xp <= 5` | `visibleTasks`, badge "⚡ rápida" (1254) | 🔴 |
| **Subtarefas / micro-etapas** | — | **Não existem.** Missão é um objeto plano, sem `parent_id` nem lista de filhos | — | 🔴 |
| **Anti-farm (1x/dia)** | `647-654` | `scoredToday = { date, ids[] }` | `toggleTask` | 🟢 |
| **Pular missão sem culpa** | `1414-1416` | Só existe visualmente no Modo Foco ("Pular para a próxima") — **não registra nada** | `FocusOverlay` | 🔴 |
| **Modo Difícil (penalidade)** | `556-567` | Constante de comportamento no reset diário; penalidade = soma do XP das missões não feitas | carga inicial | 🟡 |

### 2.3 Monstrinho, pet e avatar

| Elemento | Arquivo : linha | Como está | Onde é consumido | Class. |
|---|---|---|---|---|
| **Tipos do monstrinho** (3) | `221-225` | `MON_TYPES` literal (fogo/água/planta) + sprites em `/public/mon/{tipo}_{estagio}.png` | `Pet` (1709), `monSrc` (229) | 🔴 |
| **Estágios de evolução** (4) | `226` | `MON_STAGES = ["Ovo Digital","Bebê","Treino","Amador"]` | `Pet` (1750, 1784), `GameBoyHome` (1050) | 🔴 |
| **Thresholds de vínculo** | `227-228` | `MON_EVO = [25, 70, 140]`, `MON_MAX_STAGE = 3` | `gainBond` (230-239) | 🔴 |
| **Ganho de vínculo por ação** | `669-670`, `776-780` | Números mágicos inline: `gainBond(d, 8)` categoria pet, `(d, 6)` need, `(d, 2/3/4/1)` carinho/remédio/brincar | `toggleTask`, `tamaCare` | 🔴 |
| **Decaimento dos medidores** | `171` | `TAMA_DECAY = { hunger: 2.6, thirst: 3.0, hygiene: 2.2, fun: 2.4 }` pts/hora | `decayTama` (178) | 🔴 |
| **Valores iniciais dos medidores** | `176` | `freshTama()`: hunger 80, thirst 80, hygiene 90, fun 80 | carga inicial | 🔴 |
| **Missões de cuidado ↔ `need`** | `73-76` (semente) · `540` (migração) | Campo `need` em 4 missões, com mapa `needByKey` na migração | `toggleTask` (665-670) | 🟡 |
| **Medidores e seus "nudges"** | `1730-1735` | `METERS` literal com textos que citam a Mona pelo nome | `Pet` | 🔴 |
| **Limiares de humor/doença** | `196`, `203-218` | Números mágicos (`<= 3` adoece; 12/20/45/70 para expressão) | `settleTama`, `tamaImageKey` | 🔴 |
| **Energia do pet** | `145-147` | `ENERGY_DECAY_PER_HOUR=1.4`, `RECOVER_TASK=8`, `RECOVER_WATER=2` | `bumpEnergy`, `currentEnergy` | 🔴 |
| **Pet genérico (espécies/cores/estágios)** | `258-272` | `PET_STAGES`, `PET_SPECIES`, `PET_COLORS`, `DEFAULT_PET = { name: "Mona" }` | **Só `PET_STAGES` é usado** (612). O resto é código morto | 🔴 |
| **Avatar customizável** | `296-317` | `SKIN_TONES`, `HAIR_COLORS`, `HAIRS`, `OUTFITS`, `ACCESSORIES` | **Código morto** — `AvatarFig` (1881) e `PetDisplay` (1672) nunca são chamados; a aba Avatar usa duas imagens fixas (284) | 🔴 |
| **Forma Suprema** | `285` | `AVATAR_SUPREMO_LEVEL = 10` | `Avatar` (1916), mini-game (938) | 🔴 |

### 2.4 Saúde

| Elemento | Arquivo : linha | Como está | Onde é consumido | Class. |
|---|---|---|---|---|
| **Refeições padrão** (5) | `91-97` | `MEAL_DEFAULTS` literal | `freshData()` (447) — depois editável | 🟡 |
| **Remédios** | `90`, `400` | Começam vazios; o usuário cadastra (manhã/noite) | `Saude` (2196-2200) | 🟢 |
| **Períodos de remédio** | `2186-2187` | Strings fixas `"manha"` / `"noite"` — só dois turnos possíveis | `Saude` | 🔴 |
| **Água** | `98-100` | `CUP_ML=250`, `WATER_XP=2`, meta padrão 3 L; meta escolhível em `[2, 2.5, 3, 3.5]` (2028) | `addWater` (792), `WaterCard` | 🟡 |
| **Glicose** | `101-108` | `GLUCOSE_TAGS` (5 fixas), intervalo escolhível em `[2,3,4,6]` h (2128) | `GlucosePanel` (2061) | 🟡 |
| **Categoria de saúde forçada** | `2197`, `2253` | Remédios e refeições recebem `category: "saude"` no código, não por escolha | `Saude` | 🔴 |

### 2.5 Textos, navegação e dados pessoais

| Elemento | Arquivo : linha | Como está | Onde é consumido | Class. |
|---|---|---|---|---|
| **Mensagens por categoria** | `353-359` | `FUN_MSGS` — chaveado pelas 5 categorias fixas; fallback `FUN_MSGS.pessoal` | `toggleTask` (696) | 🔴 |
| **Mensagens do Modo Game Boy** | `999-1003` | `CAT_MSG` — mesma estrutura, sem acentos | `GameBoyHome` (1020) | 🔴 |
| **Paleta Game Boy** | `994-997` | `GB` literal | `GBBox`, `GameBoyHome` | 🟢 |
| **Nomes das classes de herói** | `2596-2603` | `getPlayerClass` — destructuring das 5 categorias + mapa literal de nomes | `RpgDaVida` (610), `Stats`, `Aventura` | 🔴 |
| **Abas de navegação** (7) | `914-922` | Array literal inline (`vila, aventura, pet, avatar, loja, saude, stats`) | `nav` (911) | 🔴 |
| **Hotspots da Vila** (5 + mestre) | `964-970` | `spots` literal com coordenadas `%` amarradas à imagem `/vila.jpg` e a abas fixas | `VillageMap` | 🔴 |
| **Textos de notificação push** | `src/app/api/send-reminders/route.ts:45-50` | `messageFor(tz)` — 3 mensagens fixas por faixa de horário; a da tarde cita **glicose** | rota de cron | 🔴 |
| **Horários de lembrete** | `supabase/push_subscriptions.sql:11` | Default `['08:00','14:00','20:00']` na coluna `times` | rota de cron (`isDue`) | 🟡 |
| **Textos do service worker** | `public/sw.js:40` | Título/corpo padrão da push | `push` listener | 🟢 |

### 2.6 Referências pessoais ao dono do projeto embutidas no código

Isto é o que mais conflita com "o RPG se adapta à vida do usuário": o app tem a vida de uma pessoa
específica escrita no código-fonte.

| Referência | Onde |
|---|---|
| **"Mona"** como nome da categoria pet | `44` (`CATS.pet.label = "Mona"`) |
| **"Mona"** em 5 nomes de missão | `73-77` (`BASE_TASKS`) |
| **"Mona"** como nome padrão do pet | `272` (`DEFAULT_PET`) |
| **"Mona"** nos nudges dos medidores | `1731-1734` (`METERS`) |
| **"Mona"** nas mensagens de conclusão | `354`, `998`, e o texto explicativo em `1865` |
| **Conquista "Mestre da Mona"** | `128` |
| **Glicemia / glicose** (diabetes) | `358` (`FUN_MSGS.saude`), painel inteiro `2061-2174`, e a push da tarde em `route.ts:48` |
| **Caixa de areia, guarda-roupa, filtro** (rotina doméstica específica) | `75`, `77`, `79` |
| **Lixo às ter/qui/sáb** | `83` (`days: [2,4,6]`) |
| **Conquista "Guardião da Geladeira"** | `129` — atrelada à chave de tarefa `geladeira` |
| **Nomes da jornada centrados em casa** | `249-255` ("Vila do Caos", "Lenda Doméstica") |

### 2.7 Achados incidentais (não bloqueiam a visão, mas convém saber)

- **Imagem inexistente:** `VillageMap` renderiza `/mestre_azul.png` (linha 985), mas o arquivo **não existe**
  em `public/`. O hotspot "Mestre" aparece quebrado.
- **Código morto significativo:** `PetDisplay` (1672), `PetAvatar` (1614), `AvatarFig` (1881), `petEars` (1590),
  `hairEl` (1873) e as constantes `PET_SPECIES`, `PET_COLORS`, `SKIN_TONES`, `HAIR_COLORS`, `HAIRS`,
  `OUTFITS`, `ACCESSORIES`, `IMG_SPECIES`, `CAT_IMG`, `CAT_STAGE_IMG`, `catImageKey` — nada disso é
  chamado. São ~180 linhas de um sistema de avatar/pet que foi substituído por imagens fixas.
- **`SAVE_KEY` (linha 458) nunca é usado** — resquício da versão localStorage. O comentário do topo do
  arquivo (linha 19) ainda diz "Salvamento via window.storage", o que hoje é falso.
- **Bug no Modo Game Boy:** linha 1033 faz `playerClass?.name`, mas `getPlayerClass` retorna **string**.
  O resultado é sempre `undefined` → mostra "AVENTUREIRO" para todo mundo, em qualquer classe.
- **`data.glucose` cresce sem limite** (2085). Diferente de `purchases`, que é cortado em 50 (736).
  Como o save inteiro é reescrito a cada mudança, isso encarece cada gravação com o tempo.
- **`@ts-nocheck` no topo** (linha 1) — o arquivo inteiro está fora da checagem de tipos.

---

## 3. Modelo de dados atual

### 3.1 Tabelas que existem no Supabase

Inferidas de `supabase/*.sql` e das queries em `src/lib/`:

**`public.saves`** (`supabase/schema.sql:7-11`)

| Coluna | Tipo | Observação |
|---|---|---|
| `user_id` | `uuid` PK → `auth.users(id)` | 1 linha por usuário |
| `data` | `jsonb` | **O jogo inteiro.** Sem schema, sem validação |
| `updated_at` | `timestamptz` | |

RLS ligado, 3 políticas (select/insert/update do próprio dono). **Não há política de DELETE.**
Acesso via `loadSave`/`persistSave` (`src/lib/save.ts`), com upsert do objeto completo.

**`public.push_subscriptions`** (`supabase/push_subscriptions.sql:4-14`)

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` → `auth.users(id)` | |
| `endpoint` | `text` UNIQUE | chave de conflito do upsert |
| `subscription` | `jsonb` | |
| `enabled` | `boolean` | |
| `times` | `text[]` | default `{08:00,14:00,20:00}` — **sem UI para editar** |
| `timezone` | `text` | preenchido pelo browser (`push.ts:47`) |
| `created_at` / `updated_at` | `timestamptz` | |

RLS ligado, 4 políticas. Lida pela rota de cron com `SUPABASE_SERVICE_ROLE_KEY`.

**É isso.** Não há mais nenhuma tabela.

### 3.2 Onde vive cada conceito do jogo

| Conceito | Banco | Código | localStorage | Veredito |
|---|---|---|---|---|
| Missões | `saves.data.tasks` (JSON) | semente `BASE_TASKS` | — | **Misto** — dado, mas dentro do blob |
| **Categorias** | ❌ | `CATS` (constante) | — | **Só código** |
| Recompensas | `saves.data.rewards` | semente `DEFAULT_REWARDS` | — | Misto |
| Remédios / refeições | `saves.data.meds` / `.meals` | semente `MEAL_DEFAULTS` | — | Misto |
| Progresso (XP, ouro, gemas, nível) | `saves.data.*` | curva em `xpToNext` | — | Misto |
| Streak | `saves.data.currentStreak` etc. | regra em `markActive` | — | Misto |
| Monstrinho | `saves.data.tama` | tipos/estágios/decay em constantes | — | Misto |
| Conquistas / chefes | `saves.data.achievements` / `.bossesDefeated` (só os IDs) | **definições em código** | — | **Só código** |
| Cosméticos | `saves.data.cosmetics` (posse) | **catálogo em código** | — | Misto |
| **Perfil do herói / config** | ❌ | `playerName: "Herói"` no save | — | **Não existe** |
| **Onboarding** | ❌ | ❌ | — | **Não existe** |
| **Atributos do personagem** | ❌ | ❌ | — | **Não existe** |
| Push (inscrição/horários) | `push_subscriptions` | textos em `route.ts` | — | 🟢 no banco |
| Sessão de auth | Supabase Auth | — | ✅ (SDK) | 🟢 |

**Não existe tabela de configurações do usuário nem de perfil do herói.** O que mais se aproxima é
`data.playerName` (`391:393`) e um punhado de flags soltas no mesmo objeto: `soundOn`, `hardMode`,
`gbMode`, `waterGoalL`, `glucoseIntervalH`. Não há agrupamento, nem nome, nem lugar para as respostas
de um onboarding.

**Nada é persistido em localStorage pelo app.** O comentário do cabeçalho está desatualizado: a
persistência é 100% Supabase, com debounce de 500 ms (`587-595`) que reescreve o documento inteiro.

---

## 4. Modelo de dados proposto

### 4.1 Recomendação de estratégia

Há duas rotas, e a escolha é de produto, não técnica:

**Rota A — normalizar (proposta abaixo).** Categorias, missões e perfil viram tabelas de verdade.
Ganha integridade referencial, consultas, histórico e espaço para atributos/subtarefas. Custo: reescrever
a camada de estado do `RpgDaVida.tsx`, que hoje assume um único objeto `data` com `update(patch)`.

**Rota B — evoluir dentro do JSON.** Criar `data.categories[]` no save e trocar as leituras de `CATS`
por esse array. Entrega categorias livres em uma tarde, risco quase zero de perda de dados, sem migration.

**Minha recomendação: começar pela Rota B para categorias (Fase 1), e migrar para a Rota A na Fase 3,
quando subtarefas e atributos tornarem o JSON insustentável.** O motivo é específico deste projeto:
subtarefas e histórico de atributos são relacionais por natureza e fazem o documento crescer — e o app
reescreve o save inteiro a cada toque. O `data.glucose` sem limite já mostra para onde isso vai.

O schema abaixo é o **alvo** (Rota A).

### 4.2 Schema alvo

```sql
-- ---------- Perfil e onboarding ----------
create table public.perfil_heroi (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  nome_heroi        text not null default 'Herói',
  meta_streak       int  not null default 7,        -- escolhida pelo usuário (hoje: fixa em 7/30)
  onboarding_em     timestamptz,                    -- null = ainda não fez a Criação do Herói
  respostas         jsonb not null default '{}'::jsonb,  -- respostas cruas do questionário
  horarios_energia  jsonb not null default '{}'::jsonb,  -- ex.: {"pico":"manha","vale":"tarde"}
  preferencias      jsonb not null default '{}'::jsonb,  -- soundOn, hardMode, gbMode, metas de água…
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

-- ---------- Categorias (o coração da mudança) ----------
create table public.categorias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  emoji       text not null default '⚔️',
  cor         text not null default '#e8b339',
  ordem       int  not null default 0,
  ativa       boolean not null default true,
  sistema     text,          -- null p/ categorias do usuário; 'pet'|'saude' p/ as de comportamento especial
  criado_em   timestamptz not null default now(),
  unique (user_id, nome)
);
create index on public.categorias (user_id, ordem);
```

> **Sobre a coluna `sistema`:** é o que resolve o caso especial do monstrinho e da aba Saúde (ver §5).
> A categoria continua sendo dado editável (nome, emoji, cor, ordem), mas o app sabe que aquela é a
> categoria que alimenta os medidores do bichinho ou que aparece na aba Saúde. Sem isso, ou o
> monstrinho perde o vínculo com as missões, ou as categorias não são de fato livres.

```sql
-- ---------- Missões ----------
create table public.missoes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  categoria_id  uuid references public.categorias(id) on delete set null,
  parent_id     uuid references public.missoes(id) on delete cascade,  -- micro-etapas
  nome          text not null,
  descricao     text default '',
  xp            int  not null default 10,
  dificuldade   smallint not null default 2,   -- 1 rápida · 2 normal · 3 desafio
  icone         text,
  cor           text,
  recorrencia   jsonb not null default '{"tipo":"diaria"}'::jsonb,
  -- {"tipo":"diaria"} | {"tipo":"semanal","dias":[2,4,6]} | {"tipo":"unica","data":"2026-09-01"}
  need          text,          -- 'hunger'|'thirst'|'hygiene'|'fun' — cuidado do monstrinho
  ordem         int not null default 0,
  ativa         boolean not null default true,
  arquivada_em  timestamptz,
  criado_em     timestamptz not null default now()
);
create index on public.missoes (user_id, categoria_id, ativa);
create index on public.missoes (parent_id);
```

**Subtarefas: auto-referência (`parent_id`) e não tabela própria.** Motivo: uma micro-etapa é uma missão
com XP próprio — mesmos campos, mesmo ciclo de conclusão, mesma tela. Tabela separada duplicaria tudo.
Regra a aplicar na aplicação: **um nível só** (uma missão com `parent_id` não pode ter filhas).

```sql
-- ---------- Conclusões (histórico, substitui doneToday/scoredToday) ----------
create table public.conclusoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  missao_id   uuid not null references public.missoes(id) on delete cascade,
  dia         date not null,
  xp_ganho    int  not null default 0,
  pulada      boolean not null default false,   -- "pular sem culpa": registra sem punir
  criado_em   timestamptz not null default now(),
  unique (user_id, missao_id, dia)              -- anti-farm vira constraint de banco
);
create index on public.conclusoes (user_id, dia);

-- ---------- Atributos do herói ----------
create table public.atributos (
  user_id     uuid not null references auth.users(id) on delete cascade,
  chave       text not null,          -- 'foco' | 'disciplina' | 'energia' | 'constancia'
  valor       int  not null default 0,
  primary key (user_id, chave)
);

-- vínculo categoria → atributo (uma categoria pode treinar mais de um)
create table public.categoria_atributos (
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  atributo     text not null,
  peso         numeric not null default 1.0,
  primary key (categoria_id, atributo)
);
```

**Como os atributos evoluem:** ao concluir uma missão, some `xp * peso` no atributo de cada linha de
`categoria_atributos` daquela categoria. Isso mantém a regra **fora do código** — hoje o equivalente
(`getPlayerClass`, `2596`) é um `switch` literal sobre as 5 categorias fixas.

**O que fica onde:** `saves.data` **continua existindo** para o estado volátil e de baixo valor
relacional (medidores do monstrinho, energia, gemas, cosméticos equipados, glicose, contadores). A
migração normaliza só o que a nova visão exige. Tentar mover tudo de uma vez é o caminho mais rápido
para perder progresso.

### 4.3 Migrations necessárias e estratégia sem perda de progresso

O risco real: **todo o progresso do Adilson (XP, nível, ouro, gemas, streak, vínculo do monstro,
conquistas) está num único `jsonb`.** Qualquer erro de migração apaga anos de constância — que, num app
para TDAH, é exatamente o que não pode acontecer.

**Princípios inegociáveis:**

1. **Nunca destruir `saves.data`.** As novas tabelas são preenchidas *a partir* dele; a coluna
   permanece intacta como fonte de verdade histórica.
2. **Snapshot antes de tudo:**
   `create table saves_backup_2026_08 as select * from public.saves;`
3. **Migração idempotente**, capaz de rodar duas vezes sem duplicar (usar `on conflict do nothing`).
4. **Dual-read com feature flag:** o app lê das tabelas novas se existirem; senão, cai no JSON. Só depois
   de a leitura nova estar validada é que a escrita muda de lugar.
5. **Campos de progresso não migram na Fase 1** — `xpTotal`, `gold`, `gems`, streaks e `tama` continuam
   no JSON. Isso reduz a superfície de risco a quase zero.

**Passo a passo da migração de categorias (o único caso não trivial):**

- As 5 chaves atuais (`pet`, `casa`, `pessoal`, `trabalho`, `saude`) viram 5 linhas em `categorias`,
  com `sistema` preenchido em `pet` e `saude` e `ordem` na sequência atual.
- Cada item de `data.tasks` vira uma linha em `missoes`, com `categoria_id` resolvido pela chave antiga.
- **Preservar o `id` textual antigo** (`t_comida`, `c_xxxx`) numa coluna `legado_id`, porque
  `data.doneToday` e `data.scoredToday.ids` referenciam esses ids. Sem isso, o dia em curso "desmarca"
  sozinho na virada.
- `catCounts` (chaveado por string de categoria) precisa ser **reindexado por `categoria_id`** —
  senão a estatística "Categoria favorita" e `getPlayerClass` param de bater.
- Renomear uma categoria depois disso passa a ser inofensivo (o vínculo é por id, não por nome) — que é
  exatamente o ganho que a nova visão pede.

---

## 5. Riscos e casos especiais

### 5.1 O que quebra na hora em que a categoria deixar de ser fixa

Três pontos **lançam exceção em tela** (não degradam: quebram) assim que existir uma missão com
categoria fora de `CATS`:

| # | Local | Código | Efeito |
|---|---|---|---|
| 1 | `1231-1232` | `CATS[cat].emoji` / `CATS[cat].label` | **Tela de Missões inteira quebra.** `grouped` aceita qualquer chave (1120), mas o render assume que ela existe em `CATS` |
| 2 | `2322` | `CATS[fav[0]].emoji` | **Aba Status quebra** se a categoria mais usada não estiver em `CATS` |
| 3 | `1119` | `grouped = { pet, casa, pessoal, trabalho }` | Categorias novas aparecem **sempre no fim** e em ordem imprevisível; a ordem escolhida pelo usuário é ignorada |

Degradam em silêncio (não quebram, mas ficam errados):

| Local | Código | Efeito |
|---|---|---|
| `67` | `CATS[t?.category]?.color \|\| C.gold` | Cai para dourado — aceitável |
| `693` | `(CATS[task.category] \|\| CATS.pessoal).color` | Partículas sempre douradas |
| `696`, `1020` | `FUN_MSGS[...] \|\| FUN_MSGS.pessoal` | Toda categoria nova recebe as mensagens de "Pessoal" — **o Modo GBC e as celebrações perdem a personalidade** |
| `2596-2602` | `getPlayerClass` | Destructuring das 5 chaves fixas: categorias novas **não contam** para a classe do herói, e o "Herói Lendário" (equilíbrio entre áreas) fica matematicamente errado |
| `63` | `CAT_FALLBACK_ICON` | Cai para "⚔️" |
| `1305` | filtro `!== "saude"` | Precisa virar filtro por `sistema`, não por string |

**Vila do Herói:** os hotspots (`964-970`) apontam para **abas**, não para categorias — então categorias
livres **não quebram a Vila**. O acoplamento real ali é outro: as coordenadas em `%` estão casadas com o
desenho de `/vila.jpg`. Trocar a arte exige recalibrar os 6 hotspots à mão. (E `/mestre_azul.png` já está
quebrado hoje.)

**Notificações:** não conhecem categorias — as 3 mensagens são fixas por faixa de horário
(`route.ts:45-50`). Não quebram; só continuam genéricas e citando glicose para todo mundo.

### 5.2 O caso especial das missões do monstrinho

Este é o ponto mais delicado do redesenho. Hoje o vínculo missão↔monstrinho acontece por **duas vias
distintas**, e uma delas morre num mundo de categorias livres:

```js
// toggleTask, linhas 665-670
if (task.need) d.tama[task.need] = 100;                       // via 1: campo need  ✅ sobrevive
if (task.category === "pet") d.tama.fun = cl100(d.tama.fun+12); // via 2: string fixa ❌ quebra
if (task.category === "pet") gainBond(d, 8);                   // via 2               ❌ quebra
if (task.need) gainBond(d, 6);                                 // via 1               ✅ sobrevive
```

A **via 1 (`need`) já é a solução correta** e deve virar a única: é um atributo da missão, independente
de categoria. Um usuário sem gato pode marcar "regar as plantas" como `need: fun` e o monstrinho responde.

Para a **via 2**, três opções — recomendo a primeira:

1. **Coluna `sistema = 'pet'` na categoria** (proposta em §4.2). O usuário renomeia "Mona" para "Thor" ou
   "Plantas", muda emoji e cor, e o vínculo continua. Preserva o comportamento atual sem prender ninguém.
2. Eliminar a via 2 e depender só de `need` — mais limpo, mas o bônus de vínculo por *qualquer* cuidado
   com o pet se perde.
3. Um campo `bond_bonus` por categoria — mais flexível, mais conceito para o usuário entender.

**Além disso:** o painel `METERS` (`1730-1735`) tem "Mona" escrito nos nudges, e o texto explicativo
(`1865`) cita "comida, água, areia e brincar" nominalmente. Ambos precisam ser derivados das missões que
tiverem `need`, não escritos à mão. Sem isso, o usuário que trocou o pet continua lendo sobre caixa de
areia.

**A aba Saúde** tem o mesmo problema pela via oposta: remédios e refeições recebem `category: "saude"`
por código (`2197`, `2253`) e são excluídos do formulário de missões (`1305`). Com `sistema = 'saude'`
isso passa a ser configuração.

### 5.3 Riscos de migração do progresso existente

| Risco | Por quê | Mitigação |
|---|---|---|
| **Perder o dia em curso** | `doneToday`/`scoredToday.ids` guardam ids textuais das missões | Preservar `legado_id` na tabela `missoes` |
| **Zerar a "Categoria favorita" e a classe** | `catCounts` é chaveado por string de categoria | Reindexar por `categoria_id` na mesma transação |
| **Perder conquistas** | `data.achievements` guarda só ids; as definições estão em código (`121-131`) | Não mexer nos ids das conquistas. `fridge_guard` depende de `taskCounts.geladeira` — preservar `key` das missões |
| **Perder o vínculo do monstro** | `tama.bond`/`tama.stage` no JSON | Não migrar `tama` na Fase 1 |
| **Escritas concorrentes** | O save inteiro é reescrito com debounce de 500 ms (`587-595`); sem controle de versão | Migrar com o app fechado, ou adicionar checagem de `updated_at` antes do upsert |
| **Save sem `DELETE` policy** | `schema.sql` não tem política de delete | Só relevante se a migração precisar limpar — evitar |
| **`freshData()` é destrutivo** | O botão "Recomeçar aventura" (`2415`) chama `update(freshData())` sem backup | Antes de qualquer fase, considerar snapshot automático — hoje um toque acidental apaga tudo |

---

## 6. Plano em fases

Cinco fases, cada uma entregável e testável sozinha, da fundação ao onboarding.

### Fase 1 — Categorias viram dado *(fundação)*

**Objetivo:** o usuário cria, renomeia, reordena, colore e desativa as áreas da própria vida. Sem tocar
em banco: `data.categories[]` dentro do save.

**Arquivos:** `RpgDaVida.tsx` — substituir `CATS` (43) por leitura de `data.categories`; blindar os 3
pontos de quebra (1119, 1231, 2322); tornar `getPlayerClass` (2596) genérico sobre a lista;
`FUN_MSGS`/`CAT_MSG` com fallback seguro; `TaskForm` (1305) filtrar por `sistema`; nova tela de gestão
de categorias.

**Pronto quando:** dá para criar "Estudos 📚", reordenar acima de "Casa", renomear "Mona"→"Thor" e
desativar "Trabalho" — e nenhuma tela quebra; o save antigo do Adilson abre com as 5 categorias atuais
intactas e o XP/streak inalterados.

---

### Fase 2 — Missões mais ricas: dificuldade, recorrência e pular sem culpa

**Objetivo:** tirar a dificuldade da gambiarra do `xp <= 5` e ampliar a recorrência.

**Arquivos:** `RpgDaVida.tsx` — campo `dificuldade` na missão e no `TaskForm` (1295); `isActiveToday`
(375) passa a ler um objeto `recorrencia`; `visibleTasks` (826) filtra por dificuldade; registrar
"pulada" no `FocusOverlay` (1414) sem punição.

**Pronto quando:** existe missão semanal e única (não só por dia da semana); "Missão Rápida" filtra por
dificuldade declarada; pular registra o evento e a streak **não** quebra por isso.

---

### Fase 3 — Fundação no banco: `categorias`, `missoes`, `conclusoes`

**Objetivo:** sair do blob JSON para tabelas de verdade, com dual-read e sem perder nada.

**Arquivos:** `supabase/` (migrations novas + RLS), `src/lib/` (novos módulos de acesso), `RpgDaVida.tsx`
(camada de estado). **A maior fase — vale quebrar em duas se o dual-read ficar pesado.**

**Pronto quando:** o app lê e escreve missões/categorias nas tabelas; o save do Adilson foi migrado com
XP, nível, ouro, gemas, streak, conquistas e vínculo do monstro **conferidos um a um** antes e depois;
`saves.data` continua intacto como backup.

---

### Fase 4 — Subtarefas e atributos do herói

**Objetivo:** micro-etapas com XP próprio (`parent_id`) e os quatro atributos (Foco, Disciplina, Energia,
Constância) evoluindo por categoria.

**Arquivos:** `supabase/` (`atributos`, `categoria_atributos`), `RpgDaVida.tsx` (UI de subtarefas na lista
e no Modo Foco; painel de atributos na aba Status, substituindo `getPlayerClass`).

**Pronto quando:** uma missão grande pode ser expandida em etapas, cada uma dá XP, e concluir todas fecha
a mãe; os atributos sobem conforme a categoria trabalhada e aparecem no Status.

---

### Fase 5 — Criação do Herói (onboarding)

**Objetivo:** o fluxo de perguntas que **gera** a configuração inicial — o fecho da nova filosofia.

**Arquivos:** nova rota/tela de onboarding, `perfil_heroi` (schema + acesso), `page.tsx` (redirecionar
quem tem `onboarding_em` nulo), `RpgDaVida.tsx` (ler `meta_streak` do perfil em vez das constantes 7/30).

**Pronto quando:** um usuário novo responde às perguntas e **cai num jogo com as próprias categorias,
missões e meta de streak** — sem nunca ver "Mona", "geladeira" ou "glicose", a não ser que tenha pedido.
Só nesta fase o `BASE_TASKS` (72) pode ser aposentado.

---

## 7. Perguntas em aberto

Decisões de produto que só você pode tomar. Estão em ordem de impacto — as 4 primeiras travam a Fase 1.

**Sobre categorias**

1. **Categorias do sistema:** você aceita que "Mona" (pet) e "Saúde" continuem *especiais por dentro*
   (alimentando o monstrinho e a aba Saúde) mesmo sendo renomeáveis e recolorizáveis? Ou prefere que
   sejam categorias 100% comuns, aceitando que o monstrinho passe a depender **só** do campo `need`?
2. **Excluir categoria com histórico:** o que acontece com as missões e o XP já ganho quando uma
   categoria é apagada? *(sugestão: só permitir desativar, nunca apagar — preserva estatística e é mais
   gentil com quem tem TDAH)*
3. **Limite de categorias:** existe um teto? Muitas categorias podem virar sobrecarga visual —
   justamente o que o app tenta evitar.
4. **Mensagens por categoria:** hoje cada categoria tem frases próprias (`FUN_MSGS`). Numa categoria
   criada pelo usuário: (a) frases genéricas, (b) o usuário escreve as próprias, ou (c) um pequeno
   catálogo por "tipo" de categoria escolhido no onboarding?

**Sobre o herói e os atributos**

5. **Mapeamento categoria→atributo:** quem decide que "Trabalho" treina Foco — você (regra fixa), o
   usuário (na criação da categoria), ou o onboarding (sugerindo e deixando ajustar)?
6. **Classe do herói:** `getPlayerClass` hoje dá nomes fixos por categoria dominante ("Guardião da Casa").
   Com categorias livres isso não escala. As classes passam a vir dos **atributos** ("Mestre do Foco"),
   o usuário escolhe a própria classe, ou a mecânica sai de cena?
7. **Meta de streak escolhida:** o que ela muda de fato — só as conquistas de 7/30 dias, ou também os
   chefes e a intensidade dos lembretes?

**Sobre missões e subtarefas**

8. **XP da missão-mãe:** ao quebrar uma missão em micro-etapas, a mãe dá XP extra ao fechar todas, ou o
   XP dela é apenas a soma das etapas?
9. **Níveis de subtarefa:** um nível só (recomendo) ou aninhamento livre?
10. **Pular sem culpa:** a missão pulada some do dia, fica marcada como "pulada", ou volta mais tarde?
    Ela conta como dia ativo para a streak?

**Sobre o onboarding**

11. **Obrigatório ou pulável?** Quem pular começa com o quê — nada, ou um conjunto genérico de
    categorias?
12. **Refazer a Criação do Herói:** deve ser possível depois? Se sim, isso **substitui** as categorias
    atuais ou apenas **sugere** novas?
13. **Dados de saúde:** glicose, remédios e água são hoje presença fixa na aba Saúde. Viram **opcionais
    ativados no onboarding** ("você acompanha alguma condição de saúde?"), ou continuam sempre visíveis?

**Sobre o legado**

14. **O seu save é o caso de teste.** Posso considerar que **perder progresso é inaceitável em qualquer
    hipótese** (e portanto toda fase carrega dual-read + backup), ou existe um ponto em que um reset
    limpo seria aceitável em troca de simplicidade?
15. **Código morto (~180 linhas):** o sistema de avatar customizável (`AvatarFig`, `HAIRS`, `OUTFITS`,
    `ACCESSORIES`…) e o pet SVG genérico nunca são chamados. Era intenção futura ou pode ser removido?
16. **Modo Game Boy:** vale mantê-lo em pé durante a refatoração? Ele duplica a renderização das missões
    (`GameBoyHome`, 1009) e vai dobrar o trabalho em cada fase.
