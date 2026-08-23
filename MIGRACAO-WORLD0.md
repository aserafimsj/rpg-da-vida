# Migração do World 0 — o portal

> Guia para ligar o **QuesTAH World** — a segunda tela, no computador.
>
> **World 0 não tem mundo 3D ainda.** Ele prova a fundação: o celular abre um portal seguro
> no PC, e o PC mostra o seu progresso. O 3D entra no World 1.
>
> São dois passos: rodar um arquivo no Supabase e publicar. Seu jogo não muda em nada.

---

## Passo 1 — Rodar o arquivo no Supabase

1. Abra o **`world0.sql`** que eu te mandei (Bloco de Notas serve).
2. Selecione tudo (**Ctrl+A**) e copie (**Ctrl+C**).
3. Entre em **https://supabase.com** → seu projeto → **SQL Editor** → **+ New query**.
4. Cole (**Ctrl+V**) e clique em **Run**.

**Deve aparecer:** *"Success. No rows returned"*.

> Este arquivo cria **uma tabela nova** (`world_pareamentos`), usada só pelo portal. Nenhuma
> tabela sua é tocada, nenhum dado do jogo é alterado. Por isso não tem backup: não há o que
> proteger.

---

## Passo 2 — Publicar

Eu mesclo e a Vercel publica. Espere ficar verde.

**Não precisa mexer em variável de ambiente.** O World usa as mesmas que já existem
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`).

---

## Como usar

### No computador

Abra o endereço do seu app com **`/world`** no final. Exemplo:

```
https://rpg-da-vida.vercel.app/world
```

Vai aparecer:

```
        QUESTAH WORLD
        Entre no seu mundo.

        ┌──────────────┐
        │   ▓▓  ▓▓ ▓▓  │
        │  ▓▓ QR ▓▓▓   │
        └──────────────┘

     CÓDIGO DE SEGURANÇA
          9 3 9 1

       expira em 118s
```

### No celular

1. Abra a **câmera** e aponte para o QR
2. Toque no link que aparecer
3. O QuesTAH mostra:

```
        🌐 Portal encontrado

  Um computador está tentando entrar
        no seu QuesTAH.
        Chrome no Windows

     CONFIRA O CÓDIGO NA TELA
            9 3 9 1

   [ CANCELAR ]      [ ENTRAR ]
```

4. **Confira se o número é o mesmo que está no computador** e toque em **Entrar**

Pronto: **✨ Portal aberto**, e o PC mostra o seu personagem, atributos, regiões, pet e progresso.

---

## ⚠️ O número de segurança não é enfeite

Só entre se o número do celular for **igual** ao da tela do computador.

Se alguém publicar um QR (num story, numa live, num grupo) e você escanear sem conferir,
essa pessoa entraria no **seu** mundo. Com a conferência do número, isso é impossível: é
preciso estar olhando para a tela do PC.

É o mesmo princípio de parear um fone Bluetooth.

---

## Perguntas que podem aparecer

**Preciso ter conta com e-mail?**
Não. Quem entrou pelo "▶ Jogar agora" usa o portal exatamente igual.

**Quanto tempo dura?**
O QR vale **2 minutos**. Depois de entrar, a sessão do computador dura **8 horas**.

**Como saio?**
No PC, botão **"Sair do mundo"**. O portal fecha na hora.

**E se eu abrir num computador de outra pessoa e esquecer?**
A sessão expira sozinha em 8 horas. E o portal pode ser recusado no celular a qualquer momento
antes de entrar.

**O QR tem minha senha?**
Você não tem senha — o QuesTAH nunca usou senha. E o QR **não** carrega credencial nenhuma:
só um código temporário que, sozinho, não abre nada.

**Isso muda alguma coisa no meu celular?**
Nada. O app continua exatamente como estava.

**Cadê o mundo 3D?**
No World 1. O World 0 existe para provar que o seu progresso realmente chega do outro lado,
com segurança — a parte difícil. O 3D vem depois, em cima desta fundação.

---

## Resumo de uma linha

Rodar o `world0.sql` → publicar → abrir `/world` no PC → escanear com o celular → conferir o
número → entrar.
