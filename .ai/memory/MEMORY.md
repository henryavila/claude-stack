# Claude Stack — Project Memory

## O que é

Package NPM com rules e settings de IA por stack (Laravel, React, etc.). Instala via `npx @henryavila/claude-stack init`. Detecta o projeto, monta combinação de rules path-scoped para `.claude/rules/`.

## Ecossistema

Faz parte de um ecossistema de 9 repos de produtividade AI. Ver [ecosystem.md](ecosystem.md) para o mapa completo.

Posição no ecossistema:
- `wsl-dev-setup` → Máquina (infra + terminal)
- **`claude-stack`** → Stack (rules + settings + CLAUDE.md) ← ESTE PROJETO
- `atomic-skills` → Skills (prompts de tarefa)
- `claude-knowledge` → Knowledge cache (pesquisas compiladas)

## Design e decisões

Tudo o que foi decidido na sessão de planejamento: [design.md](design.md)

## Referências

- atomic-skills (pattern de installer, conflict handling): `~/packages/atomic-skills/`
- Projeto Arch (fonte dos rules Laravel): `~/arch/`
- Rules existentes no Arch: `~/arch/.claude/rules/` (7 arquivos)
- CLAUDE.md otimizado do Arch: `~/arch/CLAUDE.md` (58 linhas)
