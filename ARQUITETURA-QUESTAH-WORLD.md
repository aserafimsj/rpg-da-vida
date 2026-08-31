# Arquitetura — QuesTAH World

> Estudo de produto e arquitetura para a segunda experiência do QuesTAH: um mundo 3D
> no computador alimentado pela mesma conta, mesmos dados e mesmo progresso do app.
>
> **Nada foi implementado.** Nenhum código, nenhuma tabela, nenhum deploy.
> Base analisada: `main` @ `400880c` · 23/08/2026

---

## 0. Duas correções antes de começar

Investiguei o repositório inteiro antes de escrever. Duas premissas do briefing não batem
com o código, e é melhor corrigir agora do que construir por cima.

### 0.1 O QuesTAH **não** usa QR Code hoje

O briefing diz *"O Questah já utiliza QR Codes"*. Procurei por `qrcode`, `qr-code`, `qr_code`
e `qr` em todo o `src/`, no `supabase/`, no service worker e no `package.json`: **nenhuma
ocorrência**. Não há geração, leitura nem dependência de QR em lugar nenhum.

O que existe e talvez seja a memória por trás disso: o **link mágico** de login por e-mail.
É um link, não um QR.

Consequência prática: o QR Code do portal é **construção nova**, não reaproveitamento. Isso
muda a estimativa da primeira etapa — e é uma boa notícia, porque permite desenhá-lo seguro
desde o início em vez de adaptar algo que nasceu para outra coisa.

### 0.2 O login não tem senha — e pode não ter nem e-mail

A autenticação atual (`src/app/page.tsx`) tem dois caminhos:

- **`signInAnonymously()`** — "▶ Jogar agora", sem cadastro
- **`signInWithOtp({ email })`** — link mágico

**Não existe senha em lugar nenhum.** E existe uma classe de usuário **sem e-mail**: quem
entrou anonimamente e nunca vinculou uma conta.

Isso elimina de saída qualquer desenho de pareamento baseado em "gerar um link mágico para o
e-mail do usuário e o PC consumir" — simplesmente não há e-mail para metade dos casos.
A proposta da seção 4 funciona para os dois tipos.

---

## 1. Visão

> **"Sua vida é o mundo. Seu celular é o mapa. Seu personagem é você.
> Suas ações constroem sua aventura."**

Duas interfaces, um jogador:

| | **QuesTAH Mobile** | **QuesTAH World** |
|---|---|---|
| **Papel** | Onde a vida acontece | Onde a vida vira paisagem |
| **Uso** | Segundos, várias vezes ao dia | Minutos, de vez em quando |
| **Natureza** | Registro e ação | Contemplação e exploração |
| **Exigência** | Nenhuma — funciona em qualquer celular | Um computador comum |
| **Se sumir** | O produto acaba | O produto continua inteiro |

A última linha é a mais importante do documento: **o World é um amplificador, nunca um
requisito**. Nenhuma funcionalidade essencial pode migrar para lá.

### Coerência com o que já está registrado

Confrontei as duas frases do briefing com o `DECISOES-DE-PRODUTO.md`:

✅ **"O RPG se adapta à vida do usuário"** — o World leva isso adiante: cada pessoa tem um
mundo diferente porque tem categorias diferentes. A arquitetura da seção 7 garante que o
mundo nunca dependa de categorias fixas, o mesmo princípio da Fase 1.

✅ **"Começar é a parte difícil"** — o World não compete com isso: ele não é onde se registra
nada, é onde se vê o resultado.

⚠️ **"Zero punição"** — aqui há um conflito real, e ele está na seção 9.1. Um mundo que
*evolui com o progresso* implica, se mal desenhado, um mundo que *decai com a ausência*. Isso
seria punição por outro nome, e violaria a diretriz mais forte do produto.

✅ **A diretriz das quatro camadas** (Classe · Atributos · Categorias · Missões) sobrevive
intacta. O World acrescenta uma **quinta camada, de interpretação visual**, que lê as outras
quatro e não é lida por nenhuma delas. A dependência é de mão única, de propósito.

---

## 2. Estado atual

### 2.1 Tecnologia

| | |
|---|---|
| Framework | Next.js 14 (App Router) · React 18 · TypeScript |
| Estilo | Tailwind + estilos inline |
| Backend | Supabase (Postgres + Auth + RLS) · `supabase-js` 2.108.2 |
| Deploy | Vercel |
| PWA | Service worker próprio, instalável, push via `web-push` |
| Peso | **185 kB** de JS no primeiro carregamento da rota `/` |

`realtime-js` já vem com o `supabase-js` instalado — Realtime está disponível sem
dependência nova.

### 2.2 Estrutura

```
src/
  app/          layout · page (login) · manifest · api/send-reminders
  components/   RpgDaVida.tsx (~3.400 linhas) · CriacaoDoHeroi · RoutineDefense · PWARegister
                legacy/avatar-builder.tsx (reservado, não importado)
  lib/          supabaseClient · save · gamedb · push · pwa
supabase/       schema.sql · fase3.sql · fase4a.sql · push_subscriptions.sql
```

### 2.3 Onde os dados vivem — o ponto mais importante para o World

**Em tabelas** (desde a Fase 3):

| Tabela | Conteúdo |
|---|---|
| `categorias` | id textual, nome, emoji, cor, ordem, ativa, sistema |
| `missoes` | id textual, categoria_id, nome, xp, dificuldade, recorrência, **etapas**, need, key |
| `conclusoes` | user_id + missao_id + data (PK), xp, ouro — **histórico diário** |
| `saves` | **um JSONB com todo o resto** |
| `push_subscriptions` | inscrições de notificação |

**No JSONB `saves.data`** — 48 chaves, incluindo tudo que o World precisaria mostrar:

```
xpTotal · gold · gems · playerName · perfil{classe,metaStreak,mostrarGlicose}
avatar · pet · tama{tipo,estágio,vínculo,medidores} · cosmetics{owned,equipped}
catCounts · tasksCompleted · porDificuldade · etapasConcluidas · focoConclusoes
daysActive · currentStreak · longestStreak · achievements · bossesDefeated
```

**Isto é a descoberta central deste estudo:** os atributos, o nível, a classe, o pet e o
vínculo — tudo que dá identidade ao personagem — **não estão em colunas**. Estão dentro de um
documento JSON cuja forma **mudou em todas as cinco fases**.

Se o World ler esse documento diretamente, ele quebra na próxima fase. A solução está na
seção 5.

### 2.4 Autenticação

Supabase Auth, sem senha: anônimo ou link mágico. Sessão persistida no `localStorage` do
navegador, com refresh automático. RLS em todas as tabelas, sempre `auth.uid() = user_id`.

---

## 3. Arquitetura proposta

### 3.1 O princípio

Uma conta, um progresso, **duas leituras**. O World não é um segundo jogo: é um segundo
**renderizador** dos mesmos dados.

```
                     ┌──────────────────────────┐
                     │   Supabase (Postgres)    │
                     │  saves · categorias ·    │
                     │  missoes · conclusoes    │
                     └───────────┬──────────────┘
                                 │ service_role (só no servidor)
                     ┌───────────▼──────────────┐
                     │   API QuesTAH (Next)     │
                     │  /api/world/*            │
                     │  ─ pareamento            │
                     │  ─ snapshot (contrato)   │
                     └────┬─────────────────┬───┘
              sessão do   │                 │  token do World
              Supabase    │                 │  (opaco, curto, revogável)
                     ┌────▼────┐       ┌────▼─────┐
                     │ MOBILE  │       │  WORLD   │
                     │ escreve │       │ só lê    │
                     └─────────┘       └──────────┘
```

### 3.2 Três decisões que sustentam tudo

**(a) O World nunca fala direto com o Supabase.** Ele fala com a nossa API, que fala com o
Supabase. Motivos: o PC nunca recebe credencial do Supabase; usuários anônimos funcionam
igual; e podemos mudar o banco sem tocar no World.

**(b) O World começa somente-leitura.** Em World 0–4 ele não escreve nada. Isso elimina de
uma vez conflito de escrita, dupla fonte de verdade e risco ao progresso. Escrita entra
quando houver algo que só faça sentido escrever de lá — e aí, pelo mesmo caminho do mobile.

**(c) O contrato é um *snapshot versionado*, não o save.** Ver seção 5.

### 3.3 Onde o World mora

**Recomendação: mesmo repositório, mesma app Next, rota `/world`, com carregamento dinâmico.**

```ts
// app/world/page.tsx
const Mundo = dynamic(() => import("@/world/Mundo"), { ssr: false, loading: () => <Portal /> });
```

Por quê:

- **Compartilha de graça** o cliente Supabase, os tipos, as rotas de API e o deploy
- **Não pesa no mobile**: com `dynamic` + `ssr:false`, o bundle 3D nunca entra na rota `/`.
  Os 185 kB de hoje continuam 185 kB — e isso vira um teste automatizado, não uma promessa
- Um único deploy, um único domínio, uma única configuração de ambiente
- Se um dia o World precisar sair, sai: ele já é uma pasta isolada consumindo uma API pública

A alternativa (repo separado) só se paga quando houver um time separado. Hoje custa
duplicação de auth, de tipos e de CI, sem benefício.

---

## 4. Autenticação por QR

### 4.1 O que o QR **não** pode ser

Não pode conter token, JWT, refresh token, id de usuário nem qualquer coisa que sozinha dê
acesso. Um QR é um dado público: qualquer câmera no ambiente o captura, e ele pode acabar
num print, numa transmissão ao vivo ou numa foto compartilhada.

**O QR carrega apenas um código de pareamento efêmero, inútil sem confirmação no celular.**

### 4.2 O fluxo

```
 PC                          API                        CELULAR (autenticado)
 │                            │                                │
 ├─ POST /pareamento ────────►│                                │
 │                            ├─ cria código (8 chars)         │
 │◄─ código + número: 4-7-2-9 │   expira em 2 min              │
 │                            │                                │
 │  mostra QR e o número      │                                │
 │  ┌──────────┐              │                                │
 │  │ ▓▓ ▓▓ ▓▓ │   4729       │                                │
 │  └──────────┘              │                                │
 │                            │           escaneia ────────────┤
 │                            │◄─ GET /pareamento/<código> ────┤
 │                            │                                │
 │                     "Entrar no QuesTAH World?"              │
 │                     Confirme o número: 4729                 │
 │                     [CANCELAR]     [ENTRAR]                 │
 │                            │                                │
 │                            │◄─ POST /confirmar (JWT) ───────┤
 │                            ├─ valida, vincula user_id       │
 │                            ├─ gera token do World           │
 │◄─ token (via polling/SSE) ─┤                                │
 │                            │                                │
 │  ✨ Portal aberto          │                                │
```

### 4.3 O número de segurança — não é enfeite

O PC mostra **um número de 4 dígitos**, e o celular pede que a pessoa **confirme que é o mesmo
número**. Sem isso existe um ataque real e simples:

> Alguém publica um QR do próprio PC (num grupo, num story, numa live). Uma vítima escaneia
> achando que é o portal dela e confirma. O atacante passa a ver o mundo — e a vida — da
> vítima.

Com o número, o QR sozinho não basta: é preciso estar olhando para a tela do PC. É o mesmo
princípio do pareamento Bluetooth, e custa uma linha de UI.

### 4.4 A tabela nova (única do World 0)

```sql
create table public.world_pareamentos (
  codigo          text primary key,        -- vai no QR; aleatório, ~8 chars
  numero          text not null,           -- 4 dígitos exibidos no PC
  user_id         uuid references auth.users (id) on delete cascade,  -- null até confirmar
  criado_em       timestamptz not null default now(),
  expira_em       timestamptz not null,    -- criado_em + 2 min
  confirmado_em   timestamptz,
  token_hash      text,                    -- hash do token; o token cru nunca é guardado
  token_expira_em timestamptz,             -- ~8 h
  revogado_em     timestamptz,
  pc_descricao    text                     -- "Chrome no Windows", para a tela de confirmação
);
```

Regras: código de **uso único** (confirmado uma vez, não confirma de novo) · expira em
**2 minutos** · token expira em **8 horas** · o token cru **nunca** é armazenado, só o hash ·
revogável pelo celular a qualquer momento · RLS negando tudo para o cliente — só as rotas de
API (com `service_role`) tocam a tabela, exceto a confirmação, que exige o JWT do dono.

### 4.5 Por que não usar a sessão do Supabase no PC

Três alternativas descartadas, com o motivo:

| Alternativa | Por que não |
|---|---|
| Passar o refresh token do celular pelo QR | O QR viraria credencial permanente. Inaceitável |
| `admin.generateLink` (link mágico) para o PC | **Não funciona para usuário anônimo** — não há e-mail. E daria ao PC uma sessão completa de escrita, mais poder do que o World precisa |
| Deixar o PC fazer login normalmente | Quebra a experiência narrativa (o celular é a porta) e cria fricção para quem entrou sem cadastro |

O token próprio resolve os três e ainda tem uma vantagem: ele é **escopado**. Um token de
World só serve para ler o mundo — mesmo vazado, não apaga missão nem muda XP.

---

## 5. Sincronização e o contrato de dados

### 5.1 O problema

`saves.data` mudou de forma nas cinco fases: ganhou `categories` (1), `dificuldade` e
`recorrencia` (2), `backfillFase3Em` (3), `etapas` e contadores (4), `perfil` (5). Um World
que leia esse documento cru quebra na Fase 6.

### 5.2 A solução: snapshot versionado

Uma rota que **traduz** o estado interno num contrato estável:

```
GET /api/world/snapshot     Authorization: Bearer <token do World>
```

```jsonc
{
  "contrato": 1,                    // muda só quando quebra compatibilidade
  "geradoEm": "2026-08-23T14:02:00Z",
  "personagem": {
    "nome": "Adilson", "nivel": 9, "xpTotal": 4200, "xpNoNivel": 320, "xpParaProximo": 1220,
    "classe": { "id": "mago", "nome": "Mago", "emoji": "🧙" },
    "avatar": { "forma": "suprema" },
    "cosmeticos": ["av_coroa"]
  },
  "atributos": [                    // já vêm calculados: o World não recalcula regra
    { "id": "foco", "nivel": 2, "pct": 40 },
    { "id": "constancia", "nivel": 6, "pct": 37 }
  ],
  "regioes": [                      // uma por categoria ativa
    { "id": "casa", "nome": "Casa", "emoji": "🏠", "cor": "#5aa9e6",
      "arquetipo": "residencial",   // camada de interpretação (seção 7)
      "desenvolvimento": 62,        // 0–100, derivado de catCounts
      "missoesAtivas": 4, "concluidasNoMes": 38 }
  ],
  "pet": { "tipo": "fogo", "estagio": 2, "estagioNome": "Treino", "vinculo": 30, "humor": "de boa" },
  "progresso": {
    "sequenciaAtual": 12, "maiorSequencia": 30, "metaSequencia": 7,
    "diasAtivos": 120, "missoesConcluidas": 320,
    "conquistas": ["first_task", "streak7"], "chefesDerrotados": ["boss_month"]
  }
}
```

Ganhos concretos:

- O World **nunca** vê `catCounts`, `tama`, `porDificuldade` ou qualquer nome interno
- Mudar o save de novo (e vamos mudar) não quebra o World: só o tradutor muda
- O cálculo de atributos e nível fica num lugar só — **não existe regra duplicada**
- É o mesmo padrão que já funcionou na Fase 3: `gamedb.ts` traduz entre save e tabelas

### 5.3 Quão "ao vivo" precisa ser

O mundo não precisa de latência de milissegundos. Proposta por etapa:

| Etapa | Mecanismo | Latência |
|---|---|---|
| World 0–2 | Buscar o snapshot ao entrar + botão "atualizar" | manual |
| World 3–4 | Polling a cada ~30 s enquanto a aba está visível | ~30 s |
| World 5+ | SSE (`text/event-stream`) da nossa API, empurrando quando o save mudar | ~1 s |

**Sobre o Supabase Realtime:** ele existe e está instalado, mas exige um **JWT do Supabase** —
que o World, por decisão da seção 3.2, não tem. O caminho é o servidor assinar o Realtime e
repassar por SSE. Fica para o World 5; não vale antecipar.

### 5.4 Escrita do World para o mobile (futuro)

Quando existir (não agora), a regra: **o World nunca escreve direto**. Ele chama uma rota que
aplica a mesma lógica do mobile. Exemplo: encontrar um baú no mundo → `POST /api/world/acao`
→ o servidor credita gemas → o mobile vê no próximo save.

Motivo: as regras de XP, anti-farm e conquistas vivem no `RpgDaVida.tsx`. Duplicá-las no World
seria garantir divergência. Se a escrita virar prioridade, o passo anterior é **extrair as
regras de pontuação para um módulo compartilhado** — refatoração conhecida, mas não trivial.

---

## 6. Modelo de dados: o que alimenta o mundo

| Dado do World | Vem de | Onde está hoje | Pronto? |
|---|---|---|---|
| Nome, nível, XP | `playerName`, `xpTotal` | JSON | ✅ |
| Classe | `perfil.classe` | JSON | ✅ (Fase 5A) |
| Avatar / forma suprema | `avatar`, nível ≥ 10 | JSON | 🟡 duas imagens só |
| Cosméticos | `cosmetics.equipped` | JSON | ✅ |
| Atributos | `calcAtributos()` | derivado | ✅ (Fase 4B) |
| Regiões | `categorias` | **tabela** | ✅ |
| Desenvolvimento da região | `catCounts[id]` | JSON | ✅ |
| Missões ativas | `missoes` | **tabela** | ✅ |
| Micro-etapas | `missoes.etapas` | **tabela** | ✅ (Fase 4A) |
| Histórico | `conclusoes` | **tabela** | ✅ (Fase 3) |
| Pet / monstrinho | `tama` | JSON | ✅ |
| Sequência, dias ativos | `currentStreak`, `daysActive` | JSON | ✅ |
| Conquistas, chefes | `achievements`, `bossesDefeated` | JSON | ✅ |
| **Inventário / equipamentos** | — | **não existe** | ❌ futuro |
| **Posição no mundo** | — | **não existe** | ❌ futuro |

**Conclusão: praticamente tudo que o World precisa já existe.** As três fases de arquitetura
(1, 3, 4B) produziram exatamente os dados certos — sem que essa fosse a intenção. Faltam só
inventário e posição, e nenhum dos dois é necessário antes do World 5.

---

## 7. Personalização: categorias viram regiões

### 7.1 A regra inegociável

A categoria **não sabe que existe um mundo 3D**. Ela continua sendo o que é desde a Fase 1:
`{ id, nome, emoji, cor, ordem, ativa, sistema }`. Nenhum campo de 3D entra ali.

A tradução acontece numa **camada de interpretação**, no World.

### 7.2 Arquétipos, não categorias fixas

O mundo conhece um punhado de **arquétipos de região** — não conhece "Trabalho" nem "Casa":

| Arquétipo | Cara | Exemplos de categoria |
|---|---|---|
| `residencial` | vila, casas, jardim | Casa, Lar, Família |
| `profissional` | distrito, prédios, praça | Trabalho, Negócio, Carreira |
| `saber` | biblioteca, torre, observatório | Estudos, Leitura, Idiomas |
| `treino` | arena, pátio, pista | Academia, Corrida, Corpo |
| `criativo` | ateliê, palco, conservatório | Música, Arte, Escrita |
| `natureza` | bosque, horta, lago | Plantas, Trilha, Jardim |
| `social` | praça, taverna, feira | Pessoas, Amigos, Família |
| `cuidado` | santuário, fonte, enfermaria | Saúde, Terapia, Descanso |
| `companhia` | recanto do pet | (categoria `sistema: 'pet'`) |
| `generico` | clareira que ganha forma com o uso | **qualquer outra** |

**`generico` é o mais importante da lista.** É ele que garante que "Apicultura",
"Marcenaria" ou "Cuidar da avó" tenham lugar no mundo sem ninguém ter previsto. Mesma lógica
do `catView` da Fase 1: id desconhecido nunca quebra, cai num fallback digno.

### 7.3 Como escolher o arquétipo

Três camadas, nesta ordem:

1. **Escolha do usuário**, se houver (guardada em `world_regioes`)
2. **Palpite por heurística**: emoji e palavras do nome → arquétipo
3. **`generico`**

O palpite acerta na maioria e **nunca** é obrigatório revisar — na linha do "ninguém
configura nada" que guiou a Fase 4B. Se errar, a pessoa troca em dois toques, e a escolha vale
para sempre.

### 7.4 Nível de desenvolvimento

`desenvolvimento` (0–100) sai de `catCounts[id]` com a mesma curva dos atributos. Uma região
com 200 conclusões parece próspera; uma com 3, recém-fundada. **É o `nivelAtributo()` de
novo** — a mesma matemática, aplicada a outro eixo.

---

## 8. Tecnologia

### 8.1 Comparação

| Opção | A favor | Contra | Veredito |
|---|---|---|---|
| **React Three Fiber** (Three.js + React) | Mesma linguagem, mesmos hooks, mesmos tipos e mesma auth do app; ecossistema Three (o maior); `drei` resolve câmera, controles e carregamento; roda em qualquer navegador; sem instalação | Three.js tem armadilhas de performance que R3F esconde; requer disciplina de memoização | ✅ **recomendado** |
| **Three.js puro** | Controle total, sem camada extra | Ponte manual com React, mais código de cola, nada compartilhado | Só se R3F atrapalhar |
| **Babylon.js** | Motor mais "completo" de fábrica (física, inspector), ótima documentação | Integração com React é adaptação, não idioma; comunidade menor em React; nada do app se reaproveita | Bom motor, projeto errado |
| **PlayCanvas** | Editor visual, ótimo runtime | Fluxo preso ao editor deles, atrito com Git e com o nosso deploy | Não |
| **Unity / Godot → WebGL** | Ferramental de jogo de verdade, editor de cena | Segundo toolchain, segundo build, segunda auth; bundles de dezenas de MB; ponte JS frágil | Prematuro |

### 8.2 Recomendação

**React Three Fiber**, na rota `/world` da app atual, com `dynamic(..., { ssr: false })`.

O critério não é preferência: é que **cinco fases de arquitetura investiram em compartilhar**
— tipos, helpers, contrato, deploy. R3F é a única opção que aproveita esse investimento. Unity
seria escolher recomeçar do zero num segundo ecossistema para renderizar dados que já temos.

Dependências previstas: `three`, `@react-three/fiber`, `@react-three/drei`. Nenhuma delas toca
a rota `/` — e vale um teste que **falha o build se o bundle do mobile crescer**.

### 8.3 Assets

O custo real do World não é código: é **arte 3D**. Ordem de grandeza: um punhado de modelos
low-poly modulares (casa, árvore, muro, torre, chão) que se recombinam por arquétipo é mais
viável do que cenários únicos por região. Recomendo **estilo low-poly estilizado** — barato,
performático, envelhece bem e combina com a identidade de pergaminho e pixel que o app já tem.

---

## 9. Segurança e riscos

### 9.1 🔴 O risco de produto mais grave: o mundo que decai

> Se o mundo **cresce** quando a pessoa cumpre, o que ele faz quando ela some?

Se a vila apagar as luzes, o mato tomar conta ou as construções ruírem, o QuesTAH terá criado
a punição mais eficiente do produto inteiro — justo o que a diretriz **"zero punição"** proíbe,
e para o público em que a culpa é mais tóxica.

**Regra proposta, para registrar antes de qualquer linha de código:**

> **O mundo nunca regride.** O que foi construído fica construído, para sempre.
> Ausência prolongada muda o mundo para **noite, silêncio e quietude** — nunca para ruína.
> E voltar acende tudo de novo, com boas-vindas em vez de cobrança.

É a mesma decisão do "pular sem culpa" da Fase 2, aplicada à paisagem.

### 9.2 Segurança técnica

| Risco | Mitigação |
|---|---|
| QR capturado em foto/live | Uso único, expira em 2 min, e **exige o número de 4 dígitos** da tela do PC |
| QR de atacante ("phishing de portal") | O número de segurança; a confirmação mostra o navegador/SO do PC |
| Token vazado do PC | Token **opaco e escopado só para leitura**, 8 h, revogável; guardado apenas em memória/`sessionStorage` |
| Token no banco | Guardamos só o **hash** |
| PC compartilhado | Expiração curta + "sair do mundo" visível + lista de sessões ativas no celular |
| Força bruta no código | 8 caracteres aleatórios + expiração de 2 min + limite de tentativas por IP |
| Vazamento entre usuários | Toda leitura usa `user_id` do token no servidor; RLS continua como segunda barreira |
| `service_role` exposta | Só em rota de servidor, nunca em `NEXT_PUBLIC_*` — já é o padrão do `send-reminders` |

### 9.3 Riscos de projeto

| Risco | Peso | Mitigação |
|---|---|---|
| **Desvio de foco** do core ADHD-friendly | 🔴 alto | O World é lazy, opcional e não recebe nenhuma função essencial |
| **Custo de arte 3D** | 🟠 médio | Low-poly modular; validar com formas primitivas antes de encomendar arte |
| **Acoplamento ao save** | 🟠 médio | Snapshot versionado (seção 5.2) |
| **Regras duplicadas** | 🟠 médio | O World não calcula nada; recebe pronto |
| **Expectativa de MMO** | 🟡 baixo | Nomear desde já: World é *contemplativo*, não multiplayer |

---

## 10. Performance

Alvo: **60 fps em GPU integrada** (Intel UHD/Iris) a 1080p — o computador comum, não o de
jogo. Orçamento inicial:

| | Limite |
|---|---|
| Draw calls | < 200 |
| Triângulos visíveis | < 300 mil |
| Texturas | atlas, ≤ 2K |
| Luzes dinâmicas | 1 (sol) · sombras assadas, não em tempo real |
| Bundle 3D | lazy, **0 kB na rota `/`** |
| Memória | < 500 MB |

Táticas: `InstancedMesh` para o que se repete (árvores, casas, muros) · LOD simples por
distância · frustum culling (vem do Three) · nada de pós-processamento no início · detectar
fps baixo e cair para modo "leve" automaticamente · e uma regra que vale ouro: **o mundo de
quem tem 5 categorias renderiza 5 regiões, não 50** — o tamanho do mundo acompanha a vida da
pessoa, o que é bom de produto *e* de performance.

---

## 11. Roadmap

Cada etapa entrega algo verificável sozinho.

| Etapa | Objetivo | Pronto quando | 3D? |
|---|---|---|---|
| **World 0** ✅ | **Portal e pareamento** — QR, número de segurança, confirmação no celular, token, `/api/world/snapshot`, e a rota `/world` mostrando o snapshot **como texto** | O PC entra pelo celular e vê nome, nível, classe, regiões e pet — sem uma linha de 3D | ❌ |
| **World 1** ✅ | **Primeira cena** — chão, céu, luz, câmera orbital, um avatar em bloco | Dá para girar a câmera em volta do personagem a 60 fps | ✅ |
| **World 2** | **Uma região** — a categoria mais usada vira lugar, com desenvolvimento visível | Quem tem 200 conclusões em "Casa" vê uma vila maior que quem tem 3 | ✅ |
| **World 3** | **Todas as regiões** — arquétipos, fallback genérico, escolha manual | Dois usuários com vidas diferentes têm mundos diferentes | ✅ |
| **World 4** | **Progressão visual** — o mundo muda com XP, sequência e atributos | Concluir missões no celular muda a paisagem no PC | ✅ |
| **World 5** | **Pet e vida** — o monstrinho no mundo, dia/noite, atualização quase ao vivo (SSE) | O pet acompanha o personagem; o mundo se atualiza sozinho | ✅ |
| **World 6** | **Exploração** — andar em terceira pessoa, entrar em construções, pontos de interesse | Dá para caminhar entre regiões | ✅ |

**World 0 é o passo mais importante e não tem 3D nenhum.** Ele prova a parte difícil — a
ponte segura entre os dois aparelhos e o contrato de dados. Se World 0 funcionar, o resto é
trabalho conhecido. Se não funcionar, nada do 3D salva.

---

## 11.1 World 1 — o que foi construído (24/08/2026)

`React Three Fiber`, como recomendado na §8.2. Arquivos novos:

| Arquivo | Papel |
|---|---|
| `src/components/world/Cena.tsx` | A cena: chão, céu, sol, herói em blocos, câmera orbital |
| `src/components/world/Palco.tsx` | Decide **se** o 3D entra (checa WebGL) e o carrega sob demanda |
| `src/lib/worldVisual.ts` | A camada de interpretação da §7.1 — classe vira cor **aqui**, não no save |
| `scripts/peso-mobile.js` | O alarme de peso pedido na §8.2 (`npm run peso`) |

**Nenhuma migração de banco.** O World 1 desenha o que o snapshot do World 0 já entregava.

### Três decisões técnicas que valem registro

1. **`<Environment preset>` e `<Text>` do drei estão proibidos.** Ambos **baixam arquivos de
   servidores de terceiros** (HDRI e fonte). O mundo passaria a depender de uma CDN alheia para
   acender a luz e escrever um nome. Usamos luzes de verdade, e todo texto é HTML fora do
   Canvas.
2. **`ContactShadows` com `frames={1}`.** Estava redesenhando a cada quadro **por cima** da
   sombra real do sol — duas sombras pelo preço de duas. Congelar a de contato tirou 12% do
   tempo de quadro sem mudar a imagem.
3. **O texto do World 0 continua abaixo da cena.** É a prova de que o número que chega é o
   número certo. Não se joga fora uma prova que funciona porque agora existe gráfico.

### O que ficou medido

| Medida | Resultado |
|---|---|
| Custo para o **celular** | **208 bytes** (0,1%) — o motor 3D sai num pedaço separado que só o PC baixa |
| Peso do 3D | ~165 KB comprimidos, sob demanda, só na `/world` |
| Sem WebGL | A cena some, o aviso aparece, **os dados continuam** |
| Alarme de peso | Testado com sabotagem proposital: pegou o vazamento e mostrou o estrago (193 KB → 359 KB) |

> **Fluidez confirmada em máquina real (24/08/2026).** O ambiente de teste não tem placa de
> vídeo e dava 16 fps por renderização em software — número que não dizia nada. No PC do
> Adilson: câmera, zoom e iluminação respondendo sem travar. A pendência está fechada.

### World 1.1 — o herói anda (24/08/2026)

Pedido do dono do produto: *"o que ele não faz é se mexer. Ele fica parado o tempo todo, mas
quero que ele ande, pule, se mexa."* Escolhido controle **pelo teclado**, não vida própria.

- **W-A-S-D ou setas** andam, **espaço** pula. A direção é relativa à câmera — "para frente" é
  para longe de quem olha, que é o que a mão espera.
- O herói **vira** para onde anda, e pernas e braços balançam com a velocidade.
- A borda do mundo (raio 12,5 m) **segura** sem deixar cair; o disco do chão vai até 14 m, então
  dá para ver o fim do mundo antes de esbarrar nele.

**O teclado só comanda com o mouse em cima da cena.** Sem essa condição, as setas e o espaço
parariam de rolar a página — e os dados em texto, que ficam logo abaixo, virariam um inferno de
ler. A regra fica óbvia sem precisar de aviso: mouse na cena, você joga; mouse fora, é uma
página.

#### Duas coisas que o teste pegou

1. **O herói encolhia até virar um pontinho.** A `OrbitControls` recalcula o deslocamento entre
   câmera e alvo a cada `update()`. Movendo só o alvo, o deslocamento cresce sozinho a cada
   quadro. A câmera precisa andar o **mesmo tanto** que o alvo. Confirmado por medição: o herói
   ocupa 14.958 px antes de andar e 15.045 px depois (1,01×).
2. **Andar era invisível.** Como a câmera acompanha o herói e o chão era verde liso, apertar W
   dava exatamente a mesma imagem de ficar parado. Entraram ~90 moitas e pedras (cones e
   dodecaedros, sorteio de **semente fixa** — o capim nasce no mesmo lugar toda vez, porque o
   mundo também não pode se reembaralhar entre visitas). Não é arte: é o que faz o movimento
   existir aos olhos.

#### Como foi verificado

Sem código de depuração no produto: o R3F não expõe a cena no build de produção, então o teste
**decodifica os quadros** e compara. Primeiro mede o ruído de fundo (a respiração do herói,
~1,2% dos pixels) e usa isso como régua para todo o resto.

| Verificação | Resultado |
|---|---|
| Mouse fora da cena → teclado não comanda | 1,25% (= ruído) ✅ |
| W anda | 26,9% dos pixels mudam ✅ |
| D anda para o lado | 22,6% ✅ |
| Espaço pula e volta ao chão | 6,6% no ar · 0,7% depois de pousar ✅ |
| 14 s andando contra a borda | herói visível, **92.869 px de chão** sob ele contra 15 de céu ✅ |
| Perder o foco da janela | não sai andando sozinho ✅ |
| A câmera acompanha | 1,01× do tamanho ✅ |

---

## 12. O que **não** fazer agora

- ❌ Escolher motor de física, sistema de combate ou netcode
- ❌ Modelar o mundo inteiro antes de validar o pareamento
- ❌ Criar tabelas de inventário, equipamento, posição ou economia
- ❌ Encomendar arte 3D antes do World 2 (valide com cubos)
- ❌ Multiplayer, chat, guildas, mercado — nem "só a estrutura"
- ❌ Mundo procedural
- ❌ Extrair as regras de pontuação para um módulo compartilhado — só quando o World escrever
- ❌ Adicionar qualquer dependência 3D antes do World 1
- ❌ Mover qualquer funcionalidade do mobile para o World
- ❌ Prometer o World na loja/marketing antes do World 3

---

## 12.1 Decisões tomadas (23/08/2026)

| Decisão | Resultado |
|---|---|
| **O mundo nunca regride** | ✅ **Confirmado como diretriz oficial.** Registrado no `DECISOES-DE-PRODUTO.md` como extensão do "pular sem culpa". *"Seu mundo espera por você. Ele não cobra sua ausência."* |
| **World 0 sem 3D** | ✅ Confirmado. Portal, QR, código numérico, confirmação no celular, token temporário, `/api/world/snapshot` e a rota `/world` com os dados em texto |
| **World 0 antes da 5B** | ✅ Confirmado — para os atributos nascerem sabendo que existe a camada World |
| **World não acessa o Supabase direto** | ✅ Confirmado. `Mobile / World → API → Supabase` |
| **Snapshot versionado como contrato** | ✅ Confirmado. Contrato estável entre o QuesTAH atual e o World; o JSONB bruto do save nunca viaja |
| **Somente-leitura no World 0** | ✅ Confirmado |
| **Usuário anônimo** | ✅ Funciona igual a quem tem e-mail |
| **Atributos moldam o mundo** | 🔬 Registrado como **hipótese de produto** para a 5B — não é decisão de design |

## 13. Decisões que ainda dependem de você

1. **O mundo nunca regride** (seção 9.1) — confirma essa regra? É a mais importante do estudo.
2. **World somente-leitura** até o World 5 — de acordo?
3. **Escopo do World 0**: só o portal e o snapshot em texto, sem 3D? É o que recomendo.
4. **Estilo visual**: low-poly estilizado (recomendo, barato e coerente) ou outra direção?
5. **Quem pode entrar**: usuário anônimo também, ou o World exige conta com e-mail?
   *(Tecnicamente os dois funcionam. Exigir e-mail dá recuperação de conta; permitir anônimo
   mantém a promessa de "sem cadastro".)*
6. **Nome no produto**: "QuesTAH World" fica? Aparece no app antes de existir?

---

## 14. Uma conexão com a Fase 5B

A pergunta em aberto da 5B é: **como os atributos influenciam o herói sem substituir a classe
escolhida?** Este estudo abre uma resposta que não estava na lista das oito possibilidades:

> **Os atributos poderiam moldar o mundo, não o personagem.**
>
> Foco → clareza e iluminação · Constância → o que cresce e floresce ·
> Disciplina → estruturas e construções firmes · Energia → movimento, NPCs, vida

Isso resolve a tensão de forma elegante: a **classe** continua sendo quem você é, os
**atributos** viram como o seu mundo se parece. Um não pisa no outro.

**Não estou decidindo isso** — a 5B tem investigação própria. Mas se essa direção agradar, ela
muda a ordem: valeria fazer o World 0 **antes** da 5B, porque a 5B ganharia um lugar para
existir.
