/**
 * @clawgame/web - RPG Panels Component
 * Inventory, Quests, Spell Crafting, Save/Load, and Dialogue panels.
 * Extracted from GamePreviewPage for modularity.
 */

import React from 'react';
import { Save, Trash2, Upload } from 'lucide-react';
import type { Item, Quest, LearnedSpell, ElementType } from '../../rpg/types';

/* ─── Types ─── */

export type UIPanel = 'none' | 'inventory' | 'quests' | 'spellcraft' | 'saveload' | 'dialogue';

export interface SaveSlotInfo {
  id: number;
  name: string;
  timestamp: number;
  playTime: number;
}

export interface RPGPanelsProps {
  activePanel: UIPanel;
  onClosePanel: () => void;

  /* Inventory */
  inventoryItems: Item[];
  onUseItem: (id: string) => void;
  onEquipItem: (id: string) => void;

  /* Quests */
  questList: Quest[];

  /* Spell crafting */
  craftingGrid: (ElementType | null)[][];
  craftResult: string | null;
  onCraftingCell: (row: number, col: number) => void;
  onLearnSpell: () => void;
  learnedSpells: LearnedSpell[];
  onAssignHotkey: (spellId: string, hotkey: number) => void;

  /* Save/Load */
  saveSlots: SaveSlotInfo[];
  gamePaused: boolean;
  onSave: (slotId: number) => void;
  onLoad: (slotId: number) => void;
  onDeleteSave: (slotId: number) => void;
  onResume: () => void;

  /* Dialogue */
  dialogueSpeaker: string;
  dialoguePortrait: string;
  dialogueText: string;
  dialogueChoices: Array<{ text: string; index: number }>;
  onDialogueChoice: (index: number | undefined) => void;
}

/* ─── Panel Styles ─── */

const panelBase: React.CSSProperties = {
  position: 'absolute',
  background: 'rgba(15,23,42,0.95)',
  borderRadius: 12,
  padding: 16,
  color: '#fff',
  zIndex: 50,
  border: '1px solid #334155',
  maxHeight: 'calc(100% - 80px)',
  overflowY: 'auto',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 18,
};

/* ─── Component ─── */

export function RPGPanels({
  activePanel,
  onClosePanel,
  inventoryItems,
  onUseItem,
  onEquipItem,
  questList,
  craftingGrid,
  craftResult,
  onCraftingCell,
  onLearnSpell,
  learnedSpells,
  onAssignHotkey,
  saveSlots,
  gamePaused,
  onSave,
  onLoad,
  onDeleteSave,
  onResume,
  dialogueSpeaker,
  dialoguePortrait,
  dialogueText,
  dialogueChoices,
  onDialogueChoice,
}: RPGPanelsProps) {
  if (activePanel === 'none') return null;

  return (
    <>
      {activePanel === 'inventory' && (
        <div data-rpg-panel="inventory" style={{ ...panelBase, top: 50, left: 10, width: 360 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>🎒 Inventory</h3>
            <button onClick={onClosePanel} style={closeBtnStyle}>✕</button>
          </div>
          {inventoryItems.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>No items yet. Defeat enemies and collect loot!</div>}
          {inventoryItems.map(item => (
            <div key={item.id} style={{
              padding: 10, marginBottom: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 8,
              borderLeft: `3px solid ${item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#a855f7' : item.rarity === 'rare' ? '#3b82f6' : item.rarity === 'uncommon' ? '#22c55e' : '#64748b'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{item.icon} {item.name}</strong>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.rarity}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0' }}>{item.description}</div>
              {item.stats && <div style={{ fontSize: 11, color: '#60a5fa' }}>
                {Object.entries(item.stats).map(([k, v]) => `${k}: ${v}`).join(' | ')}
              </div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {item.usable && <button onClick={() => onUseItem(item.id)} style={{ fontSize: 11, padding: '2px 8px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Use</button>}
                {item.equippable && <button onClick={() => onEquipItem(item.id)} style={{ fontSize: 11, padding: '2px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Equip</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activePanel === 'quests' && (
        <div data-rpg-panel="quests" style={{ ...panelBase, top: 50, left: 10, width: 360 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>📜 Quest Log</h3>
            <button onClick={onClosePanel} style={closeBtnStyle}>✕</button>
          </div>
          {questList.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>No quests yet. Talk to NPCs with TAB!</div>}
          {questList.map(q => (
            <div key={q.id} style={{
              padding: 10, marginBottom: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 8,
              borderLeft: `3px solid ${q.status === 'complete' ? '#22c55e' : q.status === 'active' ? '#3b82f6' : '#64748b'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{q.name}</strong>
                <span style={{ fontSize: 11, color: q.status === 'complete' ? '#22c55e' : '#fbbf24' }}>{q.status}</span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0' }}>{q.description}</div>
              {q.objectives.map(obj => (
                <div key={obj.id} style={{ fontSize: 12, color: obj.currentCount >= obj.requiredCount ? '#22c55e' : '#cbd5e1' }}>
                  {obj.currentCount >= obj.requiredCount ? '✅' : '⬜'} {obj.description} ({obj.currentCount}/{obj.requiredCount})
                </div>
              ))}
              {q.status === 'complete' && q.completionText && (
                <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4, fontStyle: 'italic' }}>{q.completionText}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {activePanel === 'spellcraft' && (
        <div data-rpg-panel="spellcraft" style={{ ...panelBase, top: 50, left: '50%', transform: 'translateX(-50%)', width: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>🔮 Spell Crafting</h3>
            <button onClick={onClosePanel} style={closeBtnStyle}>✕</button>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px' }}>Click cells to cycle elements. Match a recipe to learn a spell!</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxWidth: 180, margin: '0 auto 12px' }}>
            {craftingGrid.flat().map((cell, i) => {
              const r = Math.floor(i / 3), c = i % 3;
              const color = cell === 'fire' ? '#ef4444' : cell === 'water' ? '#3b82f6' :
                cell === 'earth' ? '#84cc16' : cell === 'air' ? '#e879f9' :
                cell === 'shadow' ? '#a78bfa' : cell === 'light' ? '#fef3c7' : '#1e293b';
              const icon = cell === 'fire' ? '🔥' : cell === 'water' ? '💧' :
                cell === 'earth' ? '🪨' : cell === 'air' ? '💨' :
                cell === 'shadow' ? '🌑' : cell === 'light' ? '✨' : '';
              return (
                <button key={i} onClick={() => onCraftingCell(r, c)} style={{
                  width: 56, height: 56, background: color, border: cell ? '2px solid #fff' : '2px solid #334155',
                  borderRadius: 8, fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {icon}
                </button>
              );
            })}
          </div>
          {craftResult && (
            <div style={{ padding: 10, background: 'rgba(34,197,94,0.2)', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: '#22c55e' }}>Recipe Found!</div>
              <div style={{ fontSize: 12 }}>{craftResult}</div>
              <button onClick={onLearnSpell} style={{
                marginTop: 6, padding: '6px 16px', background: '#22c55e', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold',
              }}>Learn Spell</button>
            </div>
          )}
          {learnedSpells.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Known Spells:</div>
              {learnedSpells.map(spell => (
                <div key={spell.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
                  <span>{spell.icon} {spell.name} <span style={{ color: '#94a3b8' }}>(DMG: {spell.damage}, MP: {spell.manaCost})</span></span>
                  <select
                    value={spell.hotkey || ''}
                    onChange={e => onAssignHotkey(spell.id, parseInt(e.target.value))}
                    style={{ fontSize: 11, padding: '1px 4px', background: '#1e293b', color: '#fff', border: '1px solid #475569', borderRadius: 4 }}
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>Key {n}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activePanel === 'saveload' && (
        <div data-rpg-panel="saveload" style={{ ...panelBase, top: 50, left: '50%', transform: 'translateX(-50%)', width: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>💾 Save / Load</h3>
            <button onClick={onClosePanel} style={closeBtnStyle}>✕</button>
          </div>
          {gamePaused && (
            <button onClick={onResume} style={{
              width: '100%', marginBottom: 12, padding: '10px 0', background: '#22c55e', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
            }}>
              ▶ Resume Game
            </button>
          )}
          <button onClick={() => onSave(0)} style={{
            width: '100%', marginBottom: 8, padding: '8px 0', background: '#3b82f6', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
          }}>
            <Save size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Quick Save (F5)
          </button>
          {[0, 1, 2, 3, 4].map(slotId => {
            const slot = saveSlots.find(s => s.id === slotId);
            return (
              <div key={slotId} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 8, marginBottom: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 6,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 'bold' }}>
                    {slotId === 0 ? '⚡ Quick Save' : `Slot ${slotId}`}
                  </div>
                  {slot ? (
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(slot.timestamp).toLocaleString()} • {Math.floor(slot.playTime / 1000)}s played
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#475569' }}>Empty</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => onSave(slotId)} style={{ fontSize: 11, padding: '4px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    <Save size={12} />
                  </button>
                  {slot && (
                    <>
                      <button onClick={() => onLoad(slotId)} style={{ fontSize: 11, padding: '4px 8px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                        <Upload size={12} />
                      </button>
                      <button onClick={() => onDeleteSave(slotId)} style={{ fontSize: 11, padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activePanel === 'dialogue' && (
        <div data-rpg-panel="dialogue" style={{
          ...panelBase,
          bottom: 20, top: 'auto', left: '50%', transform: 'translateX(-50%)',
          width: 500, border: '1px solid #475569',
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 48, lineHeight: 1 }}>{dialoguePortrait}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: '#e9d5ff', marginBottom: 6 }}>{dialogueSpeaker}</div>
              <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 10 }}>{dialogueText}</div>
              {dialogueChoices.map((choice, i) => (
                <button key={i} onClick={() => onDialogueChoice(choice.index)} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', marginBottom: 4,
                  background: 'rgba(139,92,246,0.2)', border: '1px solid #7c3aed', borderRadius: 6,
                  color: '#e9d5ff', fontSize: 13, cursor: 'pointer',
                }}>
                  {i + 1}. {choice.text}
                </button>
              ))}
              {dialogueChoices.length === 0 && (
                <button onClick={() => onDialogueChoice(undefined)} style={{
                  padding: '6px 16px', background: '#7c3aed', border: 'none', borderRadius: 6,
                  color: '#fff', fontSize: 13, cursor: 'pointer',
                }}>Continue</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
