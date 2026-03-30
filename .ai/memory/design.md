---
name: Agent Standards Design
description: Design completo do agent-standards — padrões operacionais para agentes com core universal e módulos opcionais por stack
type: project
---

# Agent Standards — Design

## Propósito

Fornecer **padrões operacionais otimizados para agentes de IA** em qualquer projeto. O stack-specific é extensão, não o core.

```bash
npx @henryavila/agent-standards init

→ Cria estrutura otimizada (.claude/rules/, settings, guidelines.md)
→ CLAUDE.md: se não existe → gera via prompt; se existe → analisa e propõe melhorias
→ Detecta stack suportada (hoje: composer.json → Laravel)
→ Instala rules path-scoped apenas se houver stack suportada
→ Configura core universal + settings específicos da stack, quando existirem
→ Recomenda ferramentas (MCPs, atomic-skills, bmad-doc-architect) — instala se aceito
```

## Duas Camadas

### Camada 1: CORE (qualquer projeto)

| O que | Descrição |
|-------|-----------|
| **Estrutura de diretórios** | `.claude/rules/`, `.claude/settings.json`, `.claude/settings.local.json` |
| **CLAUDE.md** | Gera ou analisa — hub <200 linhas, routing para rules, sem duplicação |
| **guidelines.md** | Manual operacional (build, test, CI/CD, pre-push checklist) |
| **Settings base** | `enableAllProjectMcpServers`, autoMemoryDirectory |
| **MCPs universais** | Context7 (docs), outros que surgirem |
| **Recomendações** | atomic-skills, bmad-doc-architect — instala se aceito |

### Camada 2: EXTENSION (stack-specific)

| O que | Descrição |
|-------|-----------|
| **Stack rules** | testing.md, services.md, database.md, code-quality.md |
| **Package rules** | filament-v4.md, email-tracking.md, mongodb.md |
| **Deny rules** | migrate:fresh, migrate:reset, db:wipe (Laravel) |
| **MCPs de stack** | Laravel Boost (schema, tinker, docs) |

## Detecção de Stack e Packages

### Stack
| Arquivo | Stack detectada |
|---------|----------------|
| `composer.json` com `laravel/framework` | Laravel |
| qualquer outro caso | `null` (core only) |

### Packages (Laravel)
| Package no composer.json | Rule instalado |
|-------------------------|---------------|
| `filament/filament` v4 | filament-v4.md |
| `henryavila/email-tracking` | email-tracking.md |
| `mongodb/laravel-mongodb` | mongodb.md |

## CLAUDE.md — Geração e Análise Assistida por IA

NÃO é template estático. Dois modos de operação:

### Modo 1: CLAUDE.md NÃO existe → Gerar
O installer gera um prompt otimizado que a IA usa para analisar o projeto e criar CLAUDE.md sob medida.

O prompt instrui a IA a:
- Ler composer.json, package.json, directory structure, routes, models, testes
- Ler .claude/rules/ instalados (para NÃO duplicar)
- Gerar max ~100 linhas, só conteúdo project-specific
- Constraints: "se a IA pode inferir lendo código → não incluir"

### Modo 2: CLAUDE.md JÁ existe → Analisar e propor melhorias
O installer analisa o CLAUDE.md existente e propõe melhorias baseadas no padrão documentado:
- Tamanho (< 200 linhas, Anthropic docs)
- Conteúdo que deveria ser rule path-scoped em vez de inline
- Duplicação com rules já instalados
- Estrutura e organização (hub → routing → rules)
- Conteúdo que a IA pode inferir do código (não precisa estar no CLAUDE.md)

O modelo NÃO modifica o CLAUDE.md existente automaticamente — apenas propõe.

Prompts ficam no próprio agent-standards: `prompts/generate-claude-md.md` e `prompts/analyze-claude-md.md`.

## Recomendações de Ferramentas

O installer apresenta lista interativa de ferramentas recomendadas. Se o user aceita, **instala na hora** (não só printa o comando).

```
📦 Ferramentas recomendadas:

MCPs:
  ☐ Context7 — documentação contextual (qualquer projeto)
  ☐ Laravel Boost — schema, tinker, docs (se Laravel detectado)

Tools:
  ☐ atomic-skills — skills de produtividade (as-fix, as-hunt, etc.)
  ☐ BMAD Method — brainstorming, elicitação de requisitos, agentes especializados
  ☐ bmad-doc-architect — documentação verificada de módulos (inclui BMAD)

→ Selecione os que deseja instalar
```

### BMAD Method + doc-architect
Sempre recomendados como par. BMAD Method é excelente para brainstorming e elicitação de requisitos; doc-architect agrega documentação verificada de módulos.

Instalação é sequencial (agent-standards executa):
```bash
npx bmad-method install                                          # instala BMAD no projeto
npx bmad-method install --custom-content /path/to/bmad-doc-architect  # instala módulo doc-architect
```

- `npx bmad-method install` já cuida de tudo (não precisa instalar BMAD separado)
- Se BMAD já instalado → pula para doc-architect
- Se doc-architect já instalado → mostra como ✅
- Detecção BMAD: `_bmad/` no projeto
- Detecção doc-architect: `_bmad/bmad-doc-architect/config.yaml` no projeto
- Requer clone local do repo bmad-dev-productivity (agent-standards gerencia isso)

### MCPs
- Verifica se MCP já está configurado em `.claude/settings.json`
- Se não está → sugere, se aceito → configura no settings
- Settings.json recebe allow para MCPs aceitos

## Settings

- `.claude/settings.json`: MERGE com existente (deny rules + MCP allows, não sobrescreve)
- `.claude/settings.local.json`: gera autoMemoryDirectory com path absoluto
- Deny rules são stack-specific (ex Laravel: migrate:fresh, migrate:reset, migrate:refresh, db:wipe)
- `enableAllProjectMcpServers: true` habilitado no core

## Estrutura do Repo

```
agent-standards/
├── src/
│   ├── cli.js               ← parse de argumentos (init, update)
│   ├── init.js               ← handler do comando init
│   ├── detect.js              ← detecta stack do projeto
│   ├── settings.js            ← merge de settings.json
│   ├── recommend.js           ← recomendações de ferramentas (MCPs, tools)
│   ├── update.js              ← atualiza rules com conflict handling
│   ├── manifest.js            ← tracking de arquivos instalados
│   ├── hash.js                ← SHA256 para conflict handling
│   └── stacks/
│       ├── laravel.js         ← detecção + rules para Laravel
│       └── react.js           ← futuro
├── stacks/
│   ├── laravel/
│   │   ├── core/              ← testing.md, services.md, database.md, code-quality.md
│   │   ├── packages/          ← filament-v4.md, email-tracking.md, mongodb.md
│   │   └── settings.json      ← deny rules Laravel
│   └── react/                 ← futuro
├── prompts/
│   ├── generate-claude-md.md  ← prompt para gerar CLAUDE.md do zero
│   └── analyze-claude-md.md   ← prompt para analisar CLAUDE.md existente
├── bin/
│   └── cli.js                 ← entry point do npx
└── package.json
```

## Origem dos Rules (extrair do Arch)

Rules já criados e testados no projeto Arch (`~/arch/.claude/rules/`):

| Rule no Arch | Destino no agent-standards | Ação |
|-------------|------------------------|------|
| testing.md | stacks/laravel/core/ | Remover MongoDB-specific, manter Pest genérico |
| services.md | stacks/laravel/core/ | 95% reusável, quase direto |
| database.md | stacks/laravel/core/ | Remover External models (GLPI, SBP, SPR), manter getTable() e migrations safety |
| filament.md | stacks/laravel/packages/ | Remover base classes custom, manter v4 genérico |
| email-tracking.md | stacks/laravel/packages/ | Adaptar class names para genérico |
| permissions.md | NÃO exportar | 100% projeto-específico (area-based system do Arch) |
| documentation.md | NÃO exportar | 100% projeto-específico (BR-IDs do Arch). doc-architect substitui |

Rules a CRIAR:
- `stacks/laravel/core/code-quality.md` — strict_types, sprintf, null checks, comments (extrair do CLAUDE.md do Arch)
- `stacks/laravel/packages/mongodb.md` — a criar do zero (não existe no Arch)

## Decisões Tomadas

- **CORE é estrutura otimizada de instruções, stack é extensão** — qualquer projeto se beneficia do core
- **Detecção de stack significa stack suportada** — encontrar uma tecnologia no projeto não implica módulo instalável
- Stack rules são concern SEPARADO de skills → repos separados
- Múltiplas stacks num SÓ package → escolha na instalação
- Reusar CONCEITO do atomic-skills (installer interativo, conflict handling, manifest) — adaptar código, não importar como dependência
- CLAUDE.md gerado por IA via prompt, NÃO template estático
- Package-specific rules auto-detectados do composer.json/package.json
- Settings.json: MERGE com existente, não replace
- Manifest guarda metadado do que o core criou para permitir uninstall correto em projetos sem stack suportada
- Rules instalados em `.claude/rules/agent-standards/` (subdir dedicado, não raiz)
- **NÃO existe `as-init-project` no atomic-skills** — agent-standards é dono de toda a experiência de init
- Prompts de CLAUDE.md ficam no agent-standards (`prompts/`), não como skill
- **Recomendações acionáveis** — se user aceita, instala na hora (não só printa comando)
- **BMAD + doc-architect sempre recomendados** — BMAD para brainstorm/requisitos, doc-architect para documentação. `npx bmad-method install` cuida de tudo
- **MCPs: universais (Context7) + stack-specific (Boost)** — check → suggest → install
- **Sugestão mútua com atomic-skills** — zero acoplamento, cada tool funciona 100% sozinho
- **Tipo "Shared" eliminado** — core é a estrutura, não rules cross-stack

## Pendências

| Questão | Status |
|---------|--------|
| ~~Rules em subdir ou raiz?~~ | ✅ Subdir `agent-standards/` |
| ~~`as-init-project` é skill separado?~~ | ✅ Não — tudo no agent-standards |
| ~~Tipo Shared existe?~~ | ✅ Eliminado — core é estrutura, não rules |
| ~~MCP config no scope?~~ | ✅ Sim — universais + stack-specific, instalação interativa |
| ~~bmad-doc-architect detecção?~~ | ✅ Sempre recomendado, instala BMAD se necessário |
| Update flow: conflict handling para rules editados pelo user | Reusar 3-hash do atomic-skills |

## Contexto do Problema Original

Na sessão de 2026-03-27, otimizamos o CLAUDE.md do projeto Arch de 2874 linhas (gerado pelo Boost) para 58 linhas + 7 rules path-scoped. Os aprendizados:

- CLAUDE.md < 200 linhas (Anthropic docs). > 200 = 30% das diretivas perdidas
- `.claude/rules/` com `paths:` frontmatter carrega sob demanda (zero custo no startup)
- Skills carregam por invocação (zero custo até chamados)
- Boost NÃO deve gerar CLAUDE.md (concatena cegamente sem filtro de tamanho)
- autoMemoryDirectory elimina redirect frágil de auto-memory
- Deny rules em settings.json = enforcement real (não depende de IA ler instruções)

Esses aprendizados são a base do que o agent-standards automatiza.
