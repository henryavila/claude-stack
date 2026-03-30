# Agent Standards — Project Memory

## O que é

Package NPM com padrões operacionais de qualidade para agentes de IA, com `core` universal e módulos opcionais por stack. Instala via `npx @henryavila/agent-standards init`.

Contrato atual:
- `core` é universal e roda em qualquer projeto
- somente stacks suportadas recebem regras e settings específicos
- hoje, a única stack suportada é Laravel
- projetos sem stack suportada recebem apenas o `core`

## Ecossistema

Faz parte de um ecossistema de 9 repos de produtividade AI. Ver [ecosystem.md](ecosystem.md) para o mapa completo.

Posição no ecossistema:
- `wsl-dev-setup` → Máquina (infra + terminal)
- **`agent-standards`** → Operational standards (core + módulos opcionais) ← ESTE PROJETO
- `atomic-skills` → Skills (prompts de tarefa)
- `claude-knowledge` → Knowledge cache (pesquisas compiladas)

## Design e decisões

Tudo o que foi decidido na sessão de planejamento: [design.md](design.md)

Aprendizado recente:
- detecção de stack deve responder apenas o que o pacote suporta aplicar agora, não qualquer tecnologia encontrada no projeto
- `uninstall` precisa saber quais arquivos do `core` foram criados pelo installer para removê-los corretamente em installs sem stack suportada

## Referências

- atomic-skills (pattern de installer, conflict handling): `~/packages/atomic-skills/`
- Projeto Arch (fonte dos rules Laravel): `~/arch/`
- Rules existentes no Arch: `~/arch/.claude/rules/` (7 arquivos)
- CLAUDE.md otimizado do Arch: `~/arch/CLAUDE.md` (58 linhas)
