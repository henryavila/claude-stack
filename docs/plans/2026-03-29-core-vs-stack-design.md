# Core vs Stack Design

**Date:** 2026-03-29

## Goal

Alinhar o produto ao modelo modular correto:

- `core` sempre instala a estrutura base do Claude Code
- módulos de stack são opcionais
- somente stacks suportadas pelo pacote recebem regras e configurações específicas
- hoje, a única stack suportada é Laravel

## Decisions

### 1. Meaning of stack detection

`detectStack()` deve responder apenas qual stack suportada o pacote consegue aplicar agora.

- Laravel retorna `laravel`
- qualquer outro projeto retorna `null`

Isso evita tratar tecnologias encontradas no projeto como se já fossem módulos suportados.

### 2. Core installation contract

O `core` deve rodar para qualquer projeto e sempre garantir:

- `.claude/settings.json`
- `.claude/settings.local.json`
- `.claude-stack/manifest.json`
- `.ai/memory/`

Se não houver stack suportada, o `core` instala apenas a base, sem regras específicas.

### 3. Stack-specific behavior

Quando uma stack suportada for detectada:

- copiar regras do módulo
- aplicar settings específicos do módulo
- registrar stack e arquivos no manifesto

Quando não houver stack suportada:

- não copiar regras
- ainda criar `settings.json` base via merge vazio
- registrar `stack: null`

### 4. Product communication

A comunicação do pacote deve refletir o estado real do produto:

- evitar sugerir suporte a stacks ainda não implementadas
- descrever o pacote como core universal com módulos opcionais
- documentar explicitamente que o módulo Laravel é o único suportado no momento

## Success Criteria

- projetos não-Laravel recebem o `core` completo
- apenas Laravel recebe regras/configurações de stack
- testes cobrem o contrato novo
- README explica claramente core universal + módulo Laravel atual
