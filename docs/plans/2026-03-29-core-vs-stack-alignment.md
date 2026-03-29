# Core vs Stack Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Alinhar o pacote ao contrato "core universal + stacks suportadas opcionais", removendo o viés de suporte a stacks não implementadas e adicionando documentação pública clara.

**Architecture:** `detectStack()` passa a retornar apenas stacks suportadas. `initNonInteractive()` garante a instalação do core para qualquer projeto e aplica configurações específicas apenas quando houver módulo de stack. A documentação pública e interna passa a refletir que o único módulo suportado hoje é Laravel.

**Tech Stack:** Node.js 18+, ES modules, `node --test`, `inquirer`

---

### Task 1: Cobrir o contrato novo em testes

**Files:**
- Modify: `tests/detect.test.js`
- Modify: `tests/init.test.js`
- Modify: `tests/recommend.test.js`

**Step 1: Write the failing tests**

- Ajustar a expectativa de projetos com frontend não suportado para `null`
- Adicionar teste de `initNonInteractive()` para projeto sem stack suportada, validando instalação do core sem regras
- Remover menções específicas a stacks não suportadas onde isso não agrega valor

**Step 2: Run test to verify it fails**

Run: `node --test tests/detect.test.js tests/init.test.js tests/recommend.test.js`
Expected: FAIL por causa da detecção atual e da ausência de `settings.json` no fluxo sem stack suportada

### Task 2: Implementar o comportamento mínimo

**Files:**
- Modify: `src/detect.js`
- Modify: `src/init.js`
- Modify: `package.json`
- Modify: `CLAUDE.md`

**Step 1: Write minimal implementation**

- Remover retorno de stacks não suportadas em `detectStack()`
- Garantir `mergeSettings(projectDir, {})` quando não houver settings de stack
- Ajustar mensagens/documentação para refletir "core universal" e "Laravel only"
- Remover keywords públicos que sugiram suporte não implementado

**Step 2: Run focused tests**

Run: `node --test tests/detect.test.js tests/init.test.js tests/recommend.test.js`
Expected: PASS

### Task 3: Adicionar documentação pública

**Files:**
- Create: `README.md`

**Step 1: Add README**

Documentar:

- proposta do pacote
- contrato do core
- módulo Laravel suportado hoje
- comandos `init`, `update`, `status`, `uninstall`
- fluxo de update e uninstall em alto nível

**Step 2: Verify package contents**

Run: `npm pack --dry-run --cache /tmp/claude-stack-npm-cache`
Expected: README presente no tarball

### Task 4: Verificação final

**Files:**
- Verify only

**Step 1: Run full suite**

Run: `npm test`
Expected: PASS

**Step 2: Review diff**

Run: `git diff -- src tests README.md package.json CLAUDE.md docs/plans`
Expected: mudanças alinhadas ao contrato aprovado
