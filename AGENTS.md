# Minhas Finanças — guia para agentes (Codex e outros)

Este projeto usa o mesmo guia para todos os assistentes de código. **Leia o
[CLAUDE.md](CLAUDE.md) antes de qualquer ação**: ele tem o roteiro completo de
instalação (Neon → `.env.local` → Vercel → teste), as pegadinhas já conhecidas
e as regras para trabalhar no código.

Resumo para começar:

- Se o usuário pedir para **instalar**, siga a seção "Se o usuário pedir para
  instalar o sistema" do CLAUDE.md. O usuário só age onde há conta pessoal dele
  (criar o projeto no Neon, aprovar o login da Vercel, criar o bot no BotFather).
- No Windows, adicione variáveis na Vercel com `printf '%s' "$valor" | npx vercel env add ...`
  (Git Bash); o pipe do PowerShell corrompe o valor.
- Na Vercel, **nunca reutilize um projeto que já existe**: confira com
  `npx vercel project ls` e escolha um nome novo antes do `vercel link`.
- Para instalações novas use só `db/schema.sql`. Os arquivos de `db/migrations/`
  servem apenas para atualizar instalações antigas.
- Fale com o usuário em português brasileiro, em linguagem simples.
