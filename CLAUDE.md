# Claude Stack

NPM package que instala rules e settings de IA por stack (Laravel, React, etc.) para Claude Code.

## Comandos

```bash
node src/cli.js init       # Detecta stack, instala rules + settings
node src/cli.js update     # Atualiza rules com conflict handling
npm test                   # Testes
```

## Regras

- Reusar pattern do atomic-skills: installer interativo, manifest, 3-hash conflict handling
- Rules usam `paths:` frontmatter para carregamento condicional
- Settings.json: merge com existente (NUNCA replace)
- CLAUDE.md gerado por prompt otimizado para IA (NÃO template estático)

## Memória

Consulte `.ai/memory/MEMORY.md` para contexto geral.
- `design.md` — design completo, decisões, estrutura, pendências
- `ecosystem.md` — mapa dos 9 repos do ecossistema

## Referências

- atomic-skills (pattern de installer): `~/packages/atomic-skills/src/`
- Projeto Arch (fonte dos rules): `~/arch/.claude/rules/`
