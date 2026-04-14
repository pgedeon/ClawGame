const fs = require('fs');
const f = '/root/projects/clawgame/apps/web/src/runtime/legacyCanvasSession.ts';
let c = fs.readFileSync(f, 'utf8');

// 1. Update imports
c = c.replace('createTowerDefenseTower,', 'createTowerDefenseTower, TOWER_CONFIGS,');
c = c.replace('type TowerDefenseTower,', 'type TowerType, type TowerDefenseTower,');

// 2. Add selectedTowerType state
c = c.replace(
  'let selectedTowerId: string | null = null;',
  "let selectedTowerId: string | null = null;\nconst selectedTowerType: { current: TowerType } = { current: 'basic' };"
);

// 3. Use selectedTowerType and cost for placement
c = c.replace(
  'if (player && coordinator.useMana(30)) {\n      towers.push(createTowerDefenseTower(player));',
  "const cfg = TOWER_CONFIGS[selectedTowerType.current];\n    if (player && coordinator.useMana(cfg.cost)) {\n      towers.push(createTowerDefenseTower(player, selectedTowerType.current));"
);

// 4. Add 1-4 hotkeys for tower type selection
const uMatch = c.match(/if \(wasJustPressed\("u"\) && isTDMode && selectedTowerId\) \{/);
if (uMatch) {
  const pos = uMatch.index;
  const insert = `
  if (wasJustPressed('1') && isTDMode) selectedTowerType.current = 'basic';
  if (wasJustPressed('2') && isTDMode) selectedTowerType.current = 'cannon';
  if (wasJustPressed('3') && isTDMode) selectedTowerType.current = 'frost';
  if (wasJustPressed('4') && isTDMode) selectedTowerType.current = 'lightning';
  `;
  c = c.slice(0, pos) + insert + c.slice(pos);
}

fs.writeFileSync(f, c);
console.log('Done');