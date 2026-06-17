# RPG da Vida 🎮⚔️

Transforme sua rotina, seus hábitos e seus cuidados de saúde numa aventura de RPG: XP, níveis, ouro, recompensas, conquistas, chefes, streaks, uma gata companheira (Mona) e uma aba de **Saúde** com remédios, água e refeições.

Feito com **Next.js + TypeScript + Tailwind + Supabase** (login por link mágico no e-mail e progresso sincronizado na nuvem). Pronto para hospedar na **Vercel** e compartilhar o link — cada pessoa tem o próprio progresso.

---

## Passo a passo (do zero ao link compartilhável)

### 1. Crie o projeto no Supabase
1. Acesse https://supabase.com e crie uma conta (grátis).
2. Clique em **New project**, dê um nome e uma senha de banco, escolha a região mais próxima.
3. Espere ~2 min até o projeto subir.

### 2. Crie a tabela do jogo
1. No menu lateral, abra **SQL Editor** → **New query**.
2. Copie todo o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) e clique em **Run**.
   - Isso cria a tabela `saves` (um JSON por usuário) com segurança por linha (cada um só vê o próprio save).

### 3. Pegue suas chaves
1. Vá em **Project Settings** (engrenagem) → **API**.
2. Anote **Project URL** e a chave **anon public**.

### 4. Configure o login por e-mail
1. Vá em **Authentication** → **Providers** → **Email** e deixe **Email** ativado (o "magic link" já vem ligado).
2. Vá em **Authentication** → **URL Configuration** e preencha:
   - **Site URL**: durante os testes, `http://localhost:3000`. Depois do deploy, troque para a URL da Vercel (ex.: `https://rpg-da-vida.vercel.app`).
   - **Redirect URLs**: adicione as duas — `http://localhost:3000` e a URL da Vercel.

### 5. Rode no seu computador (opcional, para testar)
```bash
# tenha o Node.js 18+ instalado
npm install
cp .env.local.example .env.local
# edite .env.local e cole sua URL e a anon key
npm run dev
```
Abra http://localhost:3000, digite seu e-mail, clique no link que chegar e pronto.

### 6. Publique na Vercel (gera o link para compartilhar)
1. Suba este projeto para um repositório no GitHub.
2. Em https://vercel.com, clique em **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = sua Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sua anon public key
4. Clique em **Deploy**.
5. Quando terminar, copie a URL gerada e **volte ao passo 4** para colocá-la em Site URL e Redirect URLs do Supabase.

Pronto! Mande a URL para quem quiser. Cada pessoa entra com o próprio e-mail e tem o próprio progresso.

---

## O que cada um monta sozinho
- **Remédios** começam **vazios**: cada usuário adiciona os seus na aba **Saúde** (manhã e noite), com nome, dose e XP. A "chama" de dias com remédios em dia e o **Chefe da Semana** passam a contar quando há pelo menos um remédio cadastrado.
- **Recompensas** e **missões** também são editáveis dentro do app.

## Estrutura
```
src/
  app/
    layout.tsx        # layout raiz + metadados/mobile
    page.tsx          # login (link mágico) + carrega o jogo
    globals.css       # Tailwind
  components/
    RpgDaVida.tsx     # o jogo inteiro
  lib/
    supabaseClient.ts # cliente Supabase (singleton)
    save.ts           # carregar/salvar o progresso na nuvem
supabase/
  schema.sql          # tabela + segurança (RLS)
```

## Aviso de saúde
Este app é um **organizador de lembretes**, não um conselho médico. Confirme doses e horários dos remédios com seu médico ou farmacêutico.
