# Migração da Fase 4A — micro-etapas

> Guia para liberar as **micro-etapas**: quebrar uma missão grande em passos pequenos.
>
> **Leia antes de começar:** esta migração é bem mais simples que a da Fase 3.
> São **duas coisas**: rodar um arquivo curto no Supabase e publicar. Nada de variável na
> Vercel, nada de conferência, nada de chave para virar.
>
> Seu progresso não é tocado. Nenhuma missão que já existe muda de valor ou de comportamento.

---

## O que muda no app

Nada — até você quebrar alguma missão em etapas. **As micro-etapas são opcionais.** Uma missão
simples continua sendo criada e concluída exatamente como hoje, com um toque.

Quando você quebra uma missão em partes:
- O **XP total continua o mesmo**. Uma missão de 40 XP vira 4 etapas de 8 XP + 8 XP de bônus
  por terminar. **Quebrar não gera XP a mais.**
- O card passa a mostrar o progresso (`2/5`) e destaca o **próximo passo**, com um ✓ ao lado
  para marcar sem precisar abrir nada.
- Quando a última etapa é marcada, a missão **fecha sozinha** e você recebe o bônus.

---

## Passo 1 — Rodar o arquivo no Supabase

1. Abra o arquivo **`fase4a.sql`** que eu te mandei (Bloco de Notas serve).
2. Selecione tudo (**Ctrl+A**) e copie (**Ctrl+C**).
3. Entre em **https://supabase.com** e clique no seu projeto.
4. Na barra da esquerda, clique em **SQL Editor**.
5. Clique em **+ New query**.
6. Clique na caixa grande e cole (**Ctrl+V**).
7. Clique em **Run**.

**Deve aparecer:** *"Success. No rows returned"* — a mesma mensagem verde da Fase 3.

> 💚 A primeira instrução do arquivo faz uma **cópia de segurança das suas missões** numa
> tabela `missoes_backup_fase4a`, antes de qualquer mudança.

> ⚠️ Se aparecer erro em vermelho: pare e me mande o texto. Não siga para o Passo 2.

**Pode rodar duas vezes?** Pode, sem problema — o arquivo foi feito para ser repetido.

---

## Passo 2 — Publicar

Eu mesclo a mudança e a Vercel publica sozinha. Você só precisa:

1. Esperar uns 2 minutos
2. **Fechar o app completamente** e abrir de novo

Pronto. Não tem Passo 3.

---

## Como usar

### Quebrar uma missão nova

Ao criar a missão, procure **⛏️ Quebrar em etapas (opcional)** — fica recolhido, logo acima
dos botões. Toque para abrir, escreva cada passo e aperte **+** (ou Enter).

O app mostra a conta fechando em tempo real:

```
16 XP nas etapas + 4 XP de bônus = 20 XP
```

### Quebrar uma missão que já existe

É o caso mais útil: você travou numa missão e quer fatiar ela.

1. Na aba **Missões**, toque em **✏️ Editar** (canto direito)
2. Toque na missão que quer quebrar
3. Abra **⛏️ Quebrar em etapas** e escreva os passos
4. **Salvar**

O XP da missão **não muda** — ele é repartido entre as etapas.

### No dia a dia

O card mostra assim:

```
☐ 🧹 Arrumar o quarto              20 XP
   ▓▓▓░░░░░░░  1/4 etapas ▸
   🎯 AGORA  Arrumar cama      +4   ✓
```

Toque no **✓** do "Agora" para marcar só aquele passo. O próximo aparece na hora.
Toque no **corpo do card** para ver a lista inteira.

### No Modo Foco

O Modo Foco passa a mostrar **a etapa**, não a missão inteira — um alvo do tamanho certo:

```
        FOCO · 3 DE 6
           Separar
   de "Lavar a louça" · 0/3
      Recompensa: +4 XP
        [ ✓ Concluir ]
```

---

## Coisas que valem saber

**Missão que se repete:** as etapas voltam desmarcadas no dia seguinte, junto com a missão.

**Apagar todas as etapas:** a missão volta a ser simples, sem drama.

**Modo Difícil:** se você fez 3 de 5 etapas e não terminou, a penalidade cobra **só as etapas
que faltaram** — quem avançou não é punido como quem não começou.

**Teto sugerido:** ao criar a 7ª etapa, aparece uma sugestão gentil de virar duas missões.
É só sugestão, não bloqueia nada.

**Sem confete a cada etapa:** de propósito. A comemoração forte fica para o fechamento da
missão — senão o cérebro para de distinguir *avançar* de *terminar*.

---

## Se algo estranhar

Diferente da Fase 3, aqui não tem chave para desligar — mas também não tem risco: a coluna
nova nasce vazia e missões sem etapas se comportam exatamente como antes.

Se algo parecer errado, **me chame antes de mexer**. A cópia de segurança do Passo 1
(`missoes_backup_fase4a`) continua no banco.

---

## Resumo de uma linha

Rodar o `fase4a.sql` no SQL Editor → esperar a publicação → fechar e abrir o app. Só isso.
