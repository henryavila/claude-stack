---
name: Dev Ecosystem
description: Mapa completo dos 9 repos do ecossistema de produtividade AI e suas relações
type: project
---

# Ecossistema de Produtividade AI

## Os 9 Repos

| # | Repo | O que é | Status |
|---|------|---------|--------|
| 1 | `atomic-skills` | Skills de tarefa: as-fix, as-hunt, as-resume, as-prompt, as-save-and-push, as-review-plan-*. Módulos: memory, knowledge | Ativo, v1.2.0 |
| 2 | `codeguard` | Enforcer de qualidade de código | Existe, não explorado |
| 3 | `bmad-doc-architect` | Agente BMAD para documentação de módulos | Existe |
| 4 | `bmad-atomic-flow` | Workflow BMAD→Superpowers (design→dev) | Protótipo |
| 5 | `agent-standards` | Padrões operacionais para agentes com core universal + módulos opcionais (hoje: Laravel) | **ESTE PROJETO** |
| 6 | `wsl-dev-setup` | Setup de máquina WSL2: infra + remote access + dotfiles | Ativo, migrar para npx |
| 7 | `dev-ecosystem` | README-index que mapeia todo o ecossistema | A criar |
| 8 | `claude-knowledge` | Cache de pesquisas compiladas (per-user, cross-project) | A criar |
| 9 | `nexus` | Hub pessoal: catálogo de projetos/apps/ideias, CLI Python, versão web | Ativo |

## Pattern: Ferramenta Pública + Dados Privados

| Ferramenta (pública, npx) | Repo(s) de dados (privado, per-user) |
|--------------------------|--------------------------------------|
| `atomic-skills` (módulo knowledge) | `claude-knowledge` (cache de pesquisas) |
| `nexus` | `nexus-data` (catálogo) + `nexus-web` (frontend) |
| `agent-standards` | Não precisa (dados ficam no projeto) |
| `wsl-dev-setup` | Não precisa (configura a máquina local) |

## Padrão unificado de instalação

```bash
npx @henryavila/wsl-dev-setup install     # Máquina
npx @henryavila/agent-standards init     # Agent standards
npx @henryavila/atomic-skills install      # Skills
```

## Dependências

```
atomic-skills (standalone, zero dependências)
├── Módulo memory: .ai/memory/ (per-project)
├── Módulo knowledge: ~/.claude-knowledge/ (per-user, git repo)
└── Skill as-research: consulta knowledge cache

agent-standards (funciona sozinho, MELHOR COM atomic-skills)
├── Se AS presente: usa as-init-memory, as-research, as-prompt
├── Se AS ausente: graceful degradation — pula memória/cache
└── Installer verifica e sugere instalar AS se não encontrado

wsl-dev-setup (standalone)
└── Pode instalar atomic-skills user-scope como step opcional
```

Decisão: dependência soft com graceful degradation.
