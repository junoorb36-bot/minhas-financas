# 🧑‍🏫 Instalação para iniciantes (com o Claude Code)

Este guia é para quem **nunca programou**. Você não vai usar terminal nem
digitar comandos: o aplicativo **Claude Code** faz a parte técnica, e você só
clica onde ele indicar e copia/cola algumas informações.

**O que você terá no final:** o seu próprio site de controle financeiro,
funcionando no computador e no celular, gratuito, com os seus dados guardados
num banco só seu.

**Tempo estimado:** 20 a 30 minutos.

---

## Antes de começar — 3 contas grátis

Crie (ou confirme que já tem) estas contas. Todas são gratuitas:

| Conta | Para quê | Onde criar |
|---|---|---|
| **Claude** | o assistente que vai instalar tudo | [claude.com](https://claude.com) |
| **Neon** | o banco de dados onde ficam seus lançamentos | [neon.tech](https://neon.tech) (pode entrar com Google) |
| **Vercel** | o site que hospeda o app | [vercel.com](https://vercel.com) (pode entrar com Google) |

---

## Passo 1 — Instale o aplicativo Claude Code

1. Acesse [claude.com/claude-code](https://claude.com/claude-code)
2. Baixe a versão para o seu computador (Windows ou Mac) e instale
   (é "avançar, avançar, concluir")
3. Abra o aplicativo e entre com a sua conta Claude

## Passo 2 — Instale o Node.js

O Node.js é o "motor" que roda as ferramentas do projeto.

1. Acesse [nodejs.org](https://nodejs.org)
2. Baixe a versão **LTS** (o botão verde principal)
3. Instale sem mudar nada ("avançar, avançar, concluir")

*Se esquecer este passo, sem problema: o Claude percebe e te orienta na hora.*

## Passo 3 — Crie uma pasta e abra no Claude Code

1. Crie uma pasta vazia no seu computador (ex.: `MinhasFinancas`, dentro de
   Documentos)
2. No aplicativo Claude Code, abra/selecione essa pasta como pasta de trabalho

## Passo 4 — Cole esta mensagem no Claude

Copie o texto abaixo inteiro e cole na conversa do Claude Code:

> Quero instalar o sistema **Minhas Finanças** deste repositório:
> https://github.com/junoorb36-bot/minhas-financas
>
> Baixe o código para esta pasta (se o git não estiver disponível, use o ZIP
> do GitHub), leia o arquivo CLAUDE.md e siga o roteiro de instalação de lá.
>
> Sou leigo em programação: me guie passo a passo em linguagem simples,
> dizendo exatamente onde clicar. Já criei minhas contas na Neon e na Vercel.

O Claude vai trabalhar e, de vez em quando, pedir sua permissão para executar
um comando — pode **aprovar**; é assim que ele faz a parte técnica por você.

## Passo 5 — O que o Claude vai te pedir (e como responder)

Durante a instalação, o Claude precisa de 2 coisas que só você pode fazer:

**1. A "connection string" do banco (Neon)**
- Entre em [neon.tech](https://neon.tech) → crie um projeto (qualquer nome)
- Clique no botão **Connect** e copie o texto que começa com `postgresql://`
- Cole na conversa quando o Claude pedir

**2. Autorizar a Vercel**
- O Claude vai mostrar um link do tipo `vercel.com/oauth/device?user_code=...`
- Abra o link, entre na sua conta Vercel e confirme o código
- Volte e avise o Claude que autorizou

*(Opcional)* Se quiser registrar gastos pelo **Telegram**, diga ao Claude
"quero o bot do Telegram também" — ele te guia para criar o bot com o
@BotFather e configura o resto.

## Passo 6 — Pronto! Como usar

No final, o Claude te entrega um endereço tipo
`https://seu-app.vercel.app`. Aí é só:

1. Abrir o endereço, **digitar um login** (invente algo difícil de adivinhar,
   ex.: `maria.gastos.2026x` — esse login é a sua chave de acesso, guarde-o
   como uma senha!) e começar a usar
2. No celular: abra o mesmo endereço no navegador e toque em
   **"Adicionar à tela de início"** — vira um aplicativo

> ⚠️ **Importante:** o acesso é feito só pelo login, sem senha. Quem souber o
> seu login e o seu endereço vê os seus dados. Escolha um login complicado e
> não compartilhe o endereço do seu app.

---

## Se algo der errado

Diga ao Claude, na própria conversa, o que apareceu na tela (pode colar a
mensagem de erro ou mandar um print). Ele diagnostica e corrige — esse é
exatamente o papel dele nesta instalação. Dúvidas e problemas também podem ser
abertos na aba **Issues** do repositório.
