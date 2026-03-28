---
name: Claude Stack Design
description: Design completo do claude-stack — conceito, conteúdo, installer, detecção, settings, CLAUDE.md generation
type: project
---

# Claude Stack — Design

## Conceito

Package NPM único com múltiplas stacks. Detecta projeto e monta combinação de rules.

```bash
npx @henryavila/claude-stack init

→ Detecta stack (composer.json → Laravel, package.json → React)
→ Detecta packages instalados (Filament, MongoDB, etc.)
→ Instala rules path-scoped em .claude/rules/
→ Configura settings (deny rules, MCP, autoMemoryDirectory)
→ Gera CLAUDE.md via prompt otimizado (IA analisa o projeto)
```

## 4 Tipos de Conteúdo

| Tipo | Quando instala | Exemplo |
|------|---------------|---------|
| **Shared** | Sempre (toda stack) | code-quality.md (sprintf, null checks, strict_types) |
| **Stack core** | Se detectou a stack | testing.md (Pest), services.md (SOLID), database.md |
| **Package-specific** | Se detectou no composer/package.json | filament-v4.md, email-tracking.md, mongodb.md |
| **CLAUDE.md generation** | Se CLAUDE.md não existe | Prompt para IA gerar baseado na realidade do projeto |

## Detecção de Packages (Laravel)

| Package no composer.json | Rule instalado |
|-------------------------|---------------|
| `filament/filament` v4 | filament-v4.md |
| `henryavila/email-tracking` | email-tracking.md |
| `mongodb/laravel-mongodb` | mongodb.md |
| bmad-doc-architect instalado | documentation.md (aponta para agente) |

## CLAUDE.md — Geração Assistida por IA

NÃO é template estático. O installer gera um prompt otimizado que a IA usa para analisar o projeto e criar CLAUDE.md sob medida.

O prompt instrui a IA a:
- Ler composer.json, package.json, directory structure, routes, models, testes
- Ler .claude/rules/ instalados (para NÃO duplicar)
- Gerar max ~100 linhas, só conteúdo project-specific
- Constraints: "se a IA pode inferir lendo código → não incluir"

Pode ser skill dedicado (`as-init-project`) ou integrado no installer.

## Settings

- `.claude/settings.json`: MERGE com existente (adiciona deny rules + MCP, não sobrescreve)
- `.claude/settings.local.json`: gera autoMemoryDirectory com path absoluto
- Deny rules (Laravel): migrate:fresh, migrate:reset, migrate:refresh, db:wipe

## Estrutura do Repo

```
claude-stack/
├── src/
│   ├── init.js              ← entry point
│   ├── detect.js            ← detecta stack do projeto
│   ├── update.js            ← atualiza rules com conflict handling
│   └── stacks/
│       ├── laravel.js       ← detecção + rules para Laravel
│       └── react.js         ← futuro
├── stacks/
│   ├── laravel/
│   │   ├── core/            ← testing.md, services.md, database.md
│   │   ├── packages/        ← filament-v4.md, email-tracking.md, mongodb.md
│   │   └── settings.json    ← deny rules Laravel
│   └── react/               ← futuro
├── shared/
│   └── rules/               ← code-quality.md (todas as stacks)
├── prompts/
│   └── generate-claude-md.md
└── package.json
```

## Origem dos Rules (extrair do Arch)

Rules já criados e testados no projeto Arch (`~/arch/.claude/rules/`):

| Rule no Arch | Destino no claude-stack | Tipo |
|-------------|------------------------|------|
| testing.md | stacks/laravel/core/ | Stack core (remover MongoDB-specific, manter Pest genérico) |
| services.md | stacks/laravel/core/ | Stack core (SRP, naming, value objects) |
| database.md | stacks/laravel/core/ | Stack core (getTable(), migrations safety — remover External models) |
| filament.md | stacks/laravel/packages/ | Package-specific (namespaces v4, base classes, quirks) |
| email-tracking.md | stacks/laravel/packages/ | Package-specific (TrackableMail, EmailType) |
| permissions.md | NÃO exportar | Projeto-específico (area-based system do Arch) |
| documentation.md | NÃO exportar | Projeto-específico (BR-IDs do Arch) |

Rules a CRIAR para o claude-stack:
- `shared/rules/code-quality.md` — sprintf, null checks, strict_types, comments (extrair do CLAUDE.md do Arch)

## Decisões Tomadas

- Stack rules são concern SEPARADO de skills → repos separados
- Múltiplas stacks num SÓ package → escolha na instalação
- Reusar pattern do atomic-skills (installer, conflict handling, manifest)
- CLAUDE.md gerado por IA via prompt, NÃO template estático
- Package-specific rules auto-detectados do composer.json/package.json
- Settings.json: MERGE com existente, não replace
- Dependência soft com atomic-skills (graceful degradation)

## Pendências

| Questão | Opções |
|---------|--------|
| Rules em subdir `stack/` ou raiz de `.claude/rules/`? | A) stack/ subdir B) raiz com manifest tracking |
| `as-init-project` é skill separado ou parte do claude-stack? | Pode ser ambos |
| Update flow: conflict handling para rules editados pelo user | Reusar 3-hash do atomic-skills |

## Contexto do Problema Original

Na sessão de 2026-03-27, otimizamos o CLAUDE.md do projeto Arch de 2874 linhas (gerado pelo Boost) para 58 linhas + 7 rules path-scoped. Os aprendizados:

- CLAUDE.md < 200 linhas (Anthropic docs). > 200 = 30% das diretivas perdidas
- `.claude/rules/` com `paths:` frontmatter carrega sob demanda (zero custo no startup)
- Skills carregam por invocação (zero custo até chamados)
- Boost NÃO deve gerar CLAUDE.md (concatena cegamente sem filtro de tamanho)
- autoMemoryDirectory elimina redirect frágil de auto-memory
- Deny rules em settings.json = enforcement real (não depende de IA ler instruções)

Esses aprendizados são a base do que o claude-stack automatiza.
