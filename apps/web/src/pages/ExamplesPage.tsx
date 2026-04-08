/**
 * @clawgame/web - Template Gallery
 * Browse and select from comprehensive game templates
 */

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, FolderOpen, BookOpen, Search, Filter, Clock, Star, Users } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  genre: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  playerCount?: string;
  features: string[];
  whatYoullLearn: string[];
  tags: string[];
  category: 'action' | 'puzzle' | 'rpg' | 'strategy' | 'simulation' | 'arcade';
}

const templates: Template[] = [
  {
    id: 'simple-platformer',
    name: 'Simple Platformer',
    description: 'A classic 2D platformer with jumping mechanics, enemies, and collectibles. Perfect for learning platformer game development fundamentals.',
    genre: 'Platformer',
    difficulty: 'Beginner',
    estimatedTime: '30 minutes',
    playerCount: '1 Player',
    features: [
      'Jump and move mechanics',
      'Enemy AI patterns',
      'Collectible items',
      'Scene-based levels',
      'Score system'
    ],
    whatYoullLearn: [
      'Player movement and physics',
      'Collision detection',
      'Enemy AI design',
      'Level layout principles',
      'Game loop implementation'
    ],
    tags: ['platformer', '2d', 'beginner', 'arcade'],
    category: 'arcade'
  },
  {
    id: 'top-down-rpg',
    name: 'Top-Down RPG',
    description: 'Explore a fantasy world, battle enemies, collect items, and experience a complete RPG adventure with dialogue and character progression.',
    genre: 'RPG',
    difficulty: 'Intermediate',
    estimatedTime: '1-2 hours',
    playerCount: '1 Player',
    features: [
      'Open world exploration',
      'Battle system with stats',
      'Dialogue trees',
      'Item inventory',
      'Character progression'
    ],
    whatYoullLearn: [
      'Game state management',
      'Dialogue systems',
      'Inventory management',
      'Turn-based combat',
      'World building principles'
    ],
    tags: ['rpg', 'adventure', 'exploration', 'story'],
    category: 'rpg'
  },
  {
    id: 'puzzle-game',
    name: 'Logic Puzzle Game',
    description: 'Challenge your mind with increasingly difficult logic puzzles. Learn puzzle mechanics, level design, and player progression systems.',
    genre: 'Puzzle',
    difficulty: 'Beginner',
    estimatedTime: '45 minutes',
    playerCount: '1 Player',
    features: [
      'Multiple puzzle types',
      'Progressive difficulty',
      'Hint system',
      'Level progression',
      'Score tracking'
    ],
    whatYoullLearn: [
      'Puzzle mechanics design',
      'Progressive difficulty scaling',
      'User interaction patterns',
      'Level design principles',
      'Hint systems implementation'
    ],
    tags: ['puzzle', 'logic', 'brain', 'casual'],
    category: 'puzzle'
  },
  {
    id: 'space-shooter',
    name: 'Space Shooter',
    description: 'Classic arcade shooter with waves of enemies, power-ups, and escalating difficulty. Master bullet patterns and enemy AI.',
    genre: 'Shooter',
    difficulty: 'Intermediate',
    estimatedTime: '1 hour',
    playerCount: '1 Player',
    features: [
      'Wave-based enemies',
      'Power-up system',
      'Bullet patterns',
      'Boss battles',
      'High score tracking'
    ],
    whatYoullLearn: [
      'Bullet patterns and collision',
      'Wave-based progression',
      'Power-up mechanics',
      'Boss design patterns',
      'Arcade game mechanics'
    ],
    tags: ['shooter', 'arcade', 'space', 'action'],
    category: 'action'
  },
  {
    id: 'racing-game',
    name: 'Top-Down Racing',
    description: 'High-speed racing with track design, car physics, and lap timing. Build a complete racing experience with multiple tracks.',
    genre: 'Racing',
    difficulty: 'Advanced',
    estimatedTime: '2-3 hours',
    playerCount: '1 Player',
    features: [
      'Car physics and controls',
      'Multiple track designs',
      'Lap timing system',
      'Speed boost mechanics',
      'Track obstacles'
    ],
    whatYoullLearn: [
      'Physics simulation',
      'Track design principles',
      'Timing and scoring systems',
      'Game state persistence',
      'Performance optimization'
    ],
    tags: ['racing', 'sports', 'physics', 'advanced'],
    category: 'action'
  },
  {
    id: 'tower-defense',
    name: 'Tower Defense Strategy',
    description: 'Strategic gameplay where you place towers to defend against waves of enemies. Learn pathfinding, resource management, and strategic planning.',
    genre: 'Strategy',
    difficulty: 'Advanced',
    estimatedTime: '2-3 hours',
    playerCount: '1 Player',
    features: [
      'Multiple tower types',
      'Enemy pathfinding',
      'Resource management',
      'Wave spawning',
      'Upgrade system'
    ],
    whatYoullLearn: [
      'Pathfinding algorithms',
      'Resource management',
      'Tower balance design',
      'Strategic gameplay systems',
      'AI behavior patterns'
    ],
    tags: ['strategy', 'tower-defense', 'puzzle', 'ai'],
    category: 'strategy'
  },
  {
    id: 'dialogue-adventure',
    name: 'Visual Novel Adventure',
    description: 'Story-driven adventure with character dialogue, choices that matter, and branching narratives. Perfect for narrative game design.',
    genre: 'Adventure',
    difficulty: 'Intermediate',
    estimatedTime: '1-2 hours',
    playerCount: '1 Player',
    features: [
      'Character dialogue system',
      'Choice and consequence',
      'Branching narratives',
      'Character sprites',
      'Background scenes'
    ],
    whatYoullLearn: [
      'Dialogue system design',
      'Branching narrative structures',
      'Choice impact systems',
      'Visual storytelling',
      'Character development'
    ],
    tags: ['adventure', 'story', 'visual-novel', 'narrative'],
    category: 'simulation'
  },
  {
    id: 'rhythm-game',
    name: 'Rhythm Music Game',
    description: 'Music-driven gameplay where timing is everything. Create rhythm patterns, note sequences, and build an engaging musical experience.',
    genre: 'Rhythm',
    difficulty: 'Advanced',
    estimatedTime: '2-3 hours',
    playerCount: '1 Player',
    features: [
      'Rhythm mechanics',
      'Note sequences',
      'Music integration',
      'Score multiplier',
      'Difficulty levels'
    ],
    whatYoullLearn: [
      'Rhythm game mechanics',
      'Timing systems',
      'Audio integration',
      'Difficulty curves',
      'Visual feedback systems'
    ],
    tags: ['rhythm', 'music', 'timing', 'casual'],
    category: 'arcade'
  }
];

const categoryLabels = {
  action: 'Action Games',
  puzzle: 'Puzzle Games',
  rpg: 'RPG & Adventure',
  strategy: 'Strategy Games',
  simulation: 'Simulation & Story',
  arcade: 'Arcade & Classic'
};

const difficultyColors = {
  Beginner: 'text-green-600 bg-green-50',
  Intermediate: 'text-yellow-600 bg-yellow-50',
  Advanced: 'text-red-600 bg-red-50'
};

const difficultyIcons = {
  Beginner: '🌱',
  Intermediate: '🎯',
  Advanced: '🔥'
};

export function ExamplesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = !searchQuery || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase())) ||
        template.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  const categories = useMemo(() => {
    const cats = Object.keys(categoryLabels);
    return ['all', ...cats];
  }, []);

  const difficulties = ['all', ...Object.values(difficultyColors).map(key => key.split('-')[0])];

  const navigate = useNavigate();

  const handleTemplateSelect = (templateId: string) => {
    navigate(`/create-project?template=${templateId}`);
  };

  return (
    <div className="examples-page">
      {/* Header */}
      <header className="page-header">
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <div className="header-content">
          <div className="header-left">
            <h1>Template Gallery</h1>
            <p>Start your game development journey with professionally designed templates</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <Sparkles size={20} />
              <span>{templates.length} Templates</span>
            </div>
            <div className="stat-item">
              <BookOpen size={20} />
              <span>{templates.filter(t => t.difficulty === 'Beginner').length} Beginner</span>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="examples-controls">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search templates, features, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-container">
          <div className="filter-section">
            <label>Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : categoryLabels[cat as keyof typeof categoryLabels]}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <label>Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Levels</option>
              <option value="Beginner">Beginner 🌱</option>
              <option value="Intermediate">Intermediate 🎯</option>
              <option value="Advanced">Advanced 🔥</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="results-info">
        <h3>{filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found</h3>
        {searchQuery && (
          <span>Search: "{searchQuery}"</span>
        )}
      </div>

      {/* Templates Grid */}
      <div className="templates-grid">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="template-card">
            <div className="template-header">
              <div className="template-title">
                <h3 className="template-name">{template.name}</h3>
                <div className="template-badges">
                  <span className="template-genre">{template.genre}</span>
                  <span className={`difficulty-tag ${difficultyColors[template.difficulty as keyof typeof difficultyColors]}`}>
                    {difficultyIcons[template.difficulty as keyof typeof difficultyIcons]} {template.difficulty}
                  </span>
                </div>
              </div>
            </div>

            <p className="template-description">{template.description}</p>

            {/* Quick Stats */}
            <div className="template-stats">
              <div className="stat-item">
                <Clock size={14} />
                <span>{template.estimatedTime}</span>
              </div>
              {template.playerCount && (
                <div className="stat-item">
                  <Users size={14} />
                  <span>{template.playerCount}</span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="template-section">
              <h4>Key Features</h4>
              <ul className="feature-list">
                {template.features.slice(0, 3).map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
                {template.features.length > 3 && (
                  <li className="more-features">+{template.features.length - 3} more</li>
                )}
              </ul>
            </div>

            {/* Learning Outcomes */}
            <div className="template-section">
              <h4>You'll Learn</h4>
              <ul className="learning-list">
                {template.whatYoullLearn.slice(0, 2).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
                {template.whatYoullLearn.length > 2 && (
                  <li className="more-learn">+{template.whatYoullLearn.length - 2} more</li>
                )}
              </ul>
            </div>

            {/* Tags */}
            <div className="template-tags">
              {template.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>

            {/* Actions */}
            <div className="template-actions">
              <button 
                onClick={() => handleTemplateSelect(template.id)}
                className="template-button"
              >
                <Sparkles size={16} />
                Use Template
              </button>
              <button className="template-button secondary">
                <FolderOpen size={16} />
                Preview Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredTemplates.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>No templates found</h3>
          <p>Try adjusting your search or filters to find what you're looking for.</p>
          <button 
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedDifficulty('all');
            }}
            className="reset-filters"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Custom Creation */}
      <div className="create-from-scratch">
        <div className="scratch-content">
          <h2>Have Your Own Idea?</h2>
          <p>Start completely fresh with your unique game concept. Full creative freedom awaits!</p>
          <Link to="/create-project" className="cta-button large">
            <Sparkles size={20} />
            Create Custom Project
          </Link>
        </div>
      </div>
    </div>
  );
}
