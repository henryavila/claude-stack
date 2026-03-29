let inquirer;
async function getInquirer() {
  if (!inquirer) {
    inquirer = (await import('inquirer')).default;
  }
  return inquirer;
}

/**
 * Prompt user to select recommendations to install.
 * Returns array of selected recommendation objects.
 */
export async function promptRecommendations(recommendations) {
  const notInstalled = recommendations.filter(r => !r.installed);
  if (notInstalled.length === 0) return [];

  const inq = await getInquirer();

  // Group by type
  const mcps = notInstalled.filter(r => r.type === 'mcp');
  const plugins = notInstalled.filter(r => r.type === 'plugin');
  const tools = notInstalled.filter(r => r.type === 'tool');

  const choices = [];

  if (mcps.length > 0) {
    choices.push(new inq.Separator('── MCPs ──'));
    for (const r of mcps) choices.push({ name: `${r.name} — ${r.description}`, value: r });
  }
  if (plugins.length > 0) {
    choices.push(new inq.Separator('── Plugins (install inside Claude Code) ──'));
    for (const r of plugins) choices.push({ name: `${r.name} — ${r.description}`, value: r });
  }
  if (tools.length > 0) {
    choices.push(new inq.Separator('── Tools ──'));
    for (const r of tools) choices.push({ name: `${r.name} — ${r.description}`, value: r });
  }

  const { selected } = await inq.prompt([{
    type: 'checkbox',
    name: 'selected',
    message: 'Ferramentas recomendadas (espaço para selecionar):',
    choices,
  }]);

  return selected;
}

/**
 * Prompt user to resolve a conflict.
 * Returns 'keep' | 'overwrite' | 'diff' | 'skip'
 */
export async function promptConflict(filePath) {
  const inq = await getInquirer();

  const { action } = await inq.prompt([{
    type: 'list',
    name: 'action',
    message: `⚠ ${filePath} — both local and package changed:`,
    choices: [
      { name: 'Keep local version', value: 'keep' },
      { name: 'Overwrite with package version', value: 'overwrite' },
      { name: 'View diff', value: 'diff' },
      { name: 'Skip (decide later)', value: 'skip' },
    ],
  }]);

  return action;
}
