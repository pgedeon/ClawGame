// Main game script for Color Match Puzzle
import { Game, Scene, Entity, Input } from '@clawgame/engine';

class ColorMatchGame extends Game {
    constructor() {
        super({
            title: 'Color Match Puzzle',
            width: 800,
            height: 600,
            canvas: document.getElementById('game-canvas')
        });
    }

    async init() {
        // Initialize game
        console.log('Color Match Puzzle starting...');
        
        // Create main scene
        const mainScene = new Scene('main');
        this.addScene(mainScene);
        this.setCurrentScene('main');
        
        // Setup input handling
        this.setupInput();
    }

    setupInput() {
        // Handle keyboard input
        Input.onKeyDown((key) => {
            switch(key) {
                case 'ArrowUp':
                case 'w':
                    console.log('Move up');
                    break;
                case 'ArrowDown':
                case 's':
                    console.log('Move down');
                    break;
                case 'ArrowLeft':
                case 'a':
                    console.log('Move left');
                    break;
                case 'ArrowRight':
                case 'd':
                    console.log('Move right');
                    break;
            }
        });
    }
}

// Start the game
const game = new ColorMatchGame();
game.init().catch(console.error);