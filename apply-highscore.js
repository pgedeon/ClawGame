const fs = require('fs');
const f = '/root/projects/clawgame/apps/web/src/hooks/useGamePreview.ts';
let c = fs.readFileSync(f, 'utf8');

// 1. Add highScore state after playerScore state
c = c.replace(
    'const [playerScore, setPlayerScore] = useState(0);',
    `const [playerScore, setPlayerScore] = useState(0);\n  const [highScore, setHighScore] = useState(() => {\n    try { return parseInt(localStorage.getItem('clawgame:highScore') || '0', 10); } catch { return 0; }\n  });`
);

// 2. Add useEffect to update high score on game end
// Find a good place to insert it - after the gameOver/victory-related useEffects
// Insert before "/* ─── Keyboard Shortcuts ─── */"
const kbsMarker = '/* ─── Keyboard Shortcuts ─── */';
c = c.replace(
    kbsMarker,
    `  // Track high score in localStorage\n  useEffect(() => {\n    if ((gameOver || victory) && playerScore > highScore) {\n      setHighScore(playerScore);\n      try { localStorage.setItem('clawgame:highScore', String(playerScore)); } catch {}\n    }\n  }, [gameOver, victory, playerScore, highScore]);\n\n${kbsMarker}`
);

// 3. Add highScore to gameStats passed to game page
c = c.replace(
    'score: playerScore,',
    'score: playerScore, highScore,'
);

// 4. Add highScore to return object
c = c.replace(
    'playerScore,',
    'playerScore, highScore,'
);

fs.writeFileSync(f, c);
console.log('Done');