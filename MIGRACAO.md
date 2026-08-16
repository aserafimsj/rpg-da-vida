# Migração da Fase 3 — passo a passo

> Guia para levar as **categorias** e **missões** do QuesTAH para tabelas de verdade no banco.
>
> **Leia antes de começar:** nada do seu progresso é apagado neste processo. XP, nível, ouro,
> gemas, sequência de dias, conquistas e o seu monstrinho **continuam exatamente onde estão**.
> O que muda é só onde as categorias e as missões ficam guardadas — e mesmo elas continuam
> salvas no lugar antigo durante toda esta fase, como rede de segurança.
>
> Não tem pressa. Você pode parar entre qualquer passo e continuar outro dia.

---

## Antes de começar

Separe uns **15 minutos** e faça isto **no computador** (não no celular) — é mais fácil copiar e colar.

Você vai precisar de:
- O site do Supabase aberto: **https://supabase.com** (entre com sua conta)
- O site da Vercel aberto: **https://vercel.com** (entre com sua conta)
- O arquivo `supabase/fase3.sql` que veio no ZIP desta entrega

---

## Passo 1 — Criar as tabelas no Supabase

1. Entre em **https://supabase.com** e clique no seu projeto (o do QuesTAH).
2. Na barra lateral esquerda, clique em **SQL Editor** (o ícone parece uma folha com `>_`).
3. Clique no botão **+ New query** (canto superior).
4. Abra o arquivo **`supabase/fase3.sql`** (que está no ZIP) num editor de texto qualquer —
   Bloco de Notas serve.
5. Selecione **todo** o conteúdo do arquivo (Ctrl+A) e **copie** (Ctrl+C).
6. **Cole** dentro daquela caixa grande do SQL Editor (Ctrl+V).
7. Clique em **Run** (canto inferior direito, ou aperte Ctrl+Enter).

**O que deve acontecer:** aparece uma mensagem verde de sucesso, tipo *"Success. No rows returned"*.
Isso é o esperado — o comando cria estruturas, não devolve linhas.

> 💚 **A primeira linha do arquivo faz uma cópia de segurança de todos os seus saves**,
> numa tabela chamada `saves_backup_fase3`. Ela fica guardada e este arquivo nunca a apaga.
> É a sua rede de proteção.

> ⚠️ **Se aparecer erro em vermelho:** não faça mais nada e me mande o texto do erro.
> Não continue para o Passo 2.

**Pode rodar duas vezes?** Pode, sem problema nenhum. O arquivo foi feito para ser repetido —
se você tiver dúvida se rodou certo, é seguro clicar em **Run** de novo.

---

## Passo 2 — Publicar a nova versão do app

Faça o deploy do ZIP desta entrega **do jeito que você já faz sempre**.

Espere a Vercel terminar (o quadradinho fica verde) antes de ir para o próximo passo.

---

## Passo 3 — Abrir o app e deixar a cópia acontecer

1. Abra o QuesTAH normalmente, **com internet**.
2. Use o app por alguns segundos — entre nas Missões, olhe o monstrinho.
3. **Feche e abra de novo.** (A cópia dos dados acontece em segundo plano, sem aviso.)

Nesse meio-tempo, o app copiou as suas categorias e missões para as tabelas novas.
Você não vai notar diferença nenhuma na tela — e é exatamente isso que tem que acontecer.

---

## Passo 4 — Conferir se está tudo lá (o passo mais importante)

1. No app, vá na aba **Status** (o último ícone da barra de baixo).
2. Role até quase o fim, procurando o quadro **🗄️ Conferência do banco**.

Você vai ver algo assim:

```
Categorias        6 no jogo / 6 no banco ✓
Missões          22 no jogo / 22 no banco ✓
Conclusões registradas     3
```

- **Se os dois lados batem e aparece ✅ "Tudo conferido"** → pode ir para o Passo 5.
- **Se aparecer ⚠️ e uma lista de "ainda faltam no banco"** → feche e abra o app de novo,
  com internet, e confira outra vez. A cópia recomeça sozinha. Se depois de 2 ou 3 tentativas
  ainda faltar alguma coisa, **pare e me chame** — não siga para o Passo 5.
- **Se o quadro não aparecer** → o app ainda não terminou a cópia. Feche e abra de novo.

> As **conclusões registradas** começam do zero: elas contam as missões que você concluir
> **de agora em diante**. O histórico antigo não existia em lugar nenhum, então não há
> o que recuperar — daqui pra frente passa a existir.

---

## Passo 5 — Ligar a leitura pelas tabelas

Só faça este passo depois do ✅ no Passo 4.

1. Entre em **https://vercel.com** e clique no projeto **rpg-da-vida**.
2. No menu de cima, clique em **Settings**.
3. Na lateral esquerda, clique em **Environment Variables**.
4. No campo **Key** (nome), escreva exatamente:
   ```
   NEXT_PUBLIC_LEITURA_TABELAS
   ```
5. No campo **Value** (valor), escreva exatamente:
   ```
   1
   ```
6. Deixe marcados os ambientes **Production**, **Preview** e **Development**.
7. Clique em **Save**.
8. Vá no menu de cima em **Deployments**, ache o deploy mais recente (o de cima),
   clique nos **três pontinhos** `···` à direita e escolha **Redeploy**.
9. Confirme e espere ficar verde.

> A variável **só passa a valer depois do Redeploy**. Sem esse passo, nada muda.

---

## Passo 6 — Conferir depois da virada

Abra o app e confira esta lista. **Tudo tem que estar igual a antes:**

- [ ] Suas **categorias** aparecem com os mesmos nomes, emojis e cores
- [ ] Estão na **mesma ordem** de antes
- [ ] Suas **missões** estão todas lá, nas categorias certas
- [ ] Seu **XP e nível** estão iguais
- [ ] Seu **ouro e gemas** estão iguais
- [ ] Sua **sequência de dias** (🔥) está igual
- [ ] Seu **monstrinho** está no mesmo estágio, com o mesmo vínculo
- [ ] A aba **Saúde** está com os seus remédios e refeições
- [ ] Marcar uma missão ainda dá XP normalmente

Depois disso, teste uma edição: **renomeie uma categoria** e feche/abra o app.
O nome novo tem que continuar lá.

---

## Se algo estranhar: o plano de volta

**Está tudo reversível, e voltar é rápido.** Se qualquer coisa parecer errada:

1. Entre na Vercel → projeto **rpg-da-vida** → **Settings** → **Environment Variables**.
2. Ache a linha `NEXT_PUBLIC_LEITURA_TABELAS`.
3. Clique nos três pontinhos `···` e escolha **Remove** (ou mude o valor de `1` para `0`).
4. Vá em **Deployments** → três pontinhos do deploy mais recente → **Redeploy**.

Pronto: o app volta a ler tudo do jeito antigo, na hora. **Nada é perdido**, porque o save
em JSON nunca parou de ser gravado — ele continuou sendo atualizado o tempo todo, mesmo
com a leitura pelas tabelas ligada.

E se precisar de mais garantia ainda, a cópia de segurança do Passo 1 continua no banco,
na tabela `saves_backup_fase3`.

---

## Perguntas que podem aparecer

**Preciso fazer isso no celular também?**
Não. É uma mudança no servidor: vale para todos os aparelhos de uma vez.

**E se eu estiver sem internet quando marcar uma missão?**
O jogo funciona normalmente. O XP entra na hora e o registro no banco acontece depois,
quando a internet voltar. Se falhar, o jogo não trava nem perde nada.

**Isso muda alguma coisa para quem usar o app no futuro?**
Sim, para melhor: cada pessoa que entrar recebe as tabelas preenchidas automaticamente,
sem ninguém precisar rodar nada.

**Posso pular o Passo 5 e ficar como está?**
Pode, e nada quebra. O app continua funcionando pelo caminho antigo, e as tabelas seguem
sendo preenchidas em segundo plano. A virada pode esperar o tempo que você quiser.

---

## Resumo de uma linha

Rodar o SQL → publicar → abrir o app → **conferir o quadro em Status** → ligar a variável na
Vercel → Redeploy → conferir de novo. E, se precisar, tirar a variável desfaz tudo.
