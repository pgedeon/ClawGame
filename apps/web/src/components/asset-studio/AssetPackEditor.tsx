/**
 * @clawgame/web - Asset Pack Editor
 * Table view for managing Phaser-compatible asset pack entries.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AssetPack,
  AssetPackEntry,
  AssetPackEntryType,
  ASSET_PACK_ENTRY_TYPES,
  createDefaultAssetPack,
  addAssetToPack,
  removeAssetFromPack,
  serializeAssetPack,
  parseAssetPack,
  validateAssetPack,
} from '@clawgame/engine';
import { Plus, Trash2, Edit3, Check, X, Download, Upload } from 'lucide-react';
import { logger } from '../../utils/logger';

interface AssetPackEditorProps {
  projectId: string;
  pack: AssetPack | null;
  onPackChange: (pack: AssetPack) => void;
  readOnly?: boolean;
}

const VALID_KEY_RE = /^[a-zA-Z0-9_-]+$/;

const TYPE_LABELS: Record<string, string> = {
  image: '🖼 Image',
  spritesheet: '🎬 Spritesheet',
  atlas: '🗺 Atlas',
  atlasJSON: '🗺 Atlas JSON',
  audio: '🔊 Audio',
  json: '📄 JSON',
  text: '📝 Text',
  tilemapTiledJSON: '🧩 Tilemap',
  tilemapCSV: '🧩 Tilemap CSV',
  binary: '📦 Binary',
  video: '🎬 Video',
  font: '🔤 Font',
  animation: '✨ Animation',
};

export function AssetPackEditor({ projectId, pack, onPackChange, readOnly }: AssetPackEditorProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AssetPackEntry | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<AssetPackEntry>>({});

  // Validate on pack change
  useEffect(() => {
    if (pack) {
      setErrors(validateAssetPack(pack).errors);
    }
  }, [pack]);

  const startEdit = useCallback((entry: AssetPackEntry) => {
    setEditingKey(entry.key);
    setEditDraft({ ...entry });
    setShowAddForm(false);
  }, []);

  const saveEdit = useCallback(() => {
    if (!pack || !editDraft || !editingKey) return;
    const withoutOld = removeAssetFromPack(pack, editingKey);
    const next = addAssetToPack(withoutOld, editDraft);
    const validation = validateAssetPack(next);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    onPackChange(next);
    setEditingKey(null);
    setEditDraft(null);
    setErrors([]);
  }, [pack, editDraft, editingKey, onPackChange]);

  const cancelEdit = useCallback(() => {
    setEditingKey(null);
    setEditDraft(null);
    setErrors([]);
  }, []);

  const deleteEntry = useCallback((key: string) => {
    if (!pack || readOnly) return;
    const next = removeAssetFromPack(pack, key);
    onPackChange(next);
  }, [pack, readOnly, onPackChange]);

  const addEntry = useCallback(() => {
    if (!pack || !newEntry.key || !newEntry.type || !newEntry.url) return;
    const entry: AssetPackEntry = {
      key: newEntry.key,
      type: newEntry.type as AssetPackEntryType,
      url: newEntry.url,
      frameConfig: newEntry.frameConfig,
      atlasURL: newEntry.atlasURL,
      jsonURL: newEntry.jsonURL,
    };
    const next = addAssetToPack(pack, entry);
    const validation = validateAssetPack(next);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    onPackChange(next);
    setNewEntry({});
    setShowAddForm(false);
    setErrors([]);
  }, [pack, newEntry, onPackChange]);

  const keyError = (key: string): string | undefined => {
    if (!VALID_KEY_RE.test(key)) return 'Use letters, numbers, hyphens, underscores';
    if (pack?.entries.some((e) => e.key === key && key !== editingKey)) return 'Duplicate key';
    return undefined;
  };

  if (!pack) {
    return (
      <div className="asset-pack-editor">
        <div className="pack-empty">
          <p>No asset pack loaded.</p>
          <button
            className="small-action-btn"
            onClick={() => onPackChange(createDefaultAssetPack(projectId))}
          >
            Create Asset Pack
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="asset-pack-editor">
      <div className="pack-header">
        <h3>Asset Pack ({pack.entries.length} entries)</h3>
        <div className="pack-actions">
          {!readOnly && (
            <>
              <button
                className="small-action-btn"
                onClick={() => setShowAddForm(!showAddForm)}
                disabled={showAddForm}
              >
                <Plus size={14} /> Add
              </button>
              <button
                className="small-action-btn"
                onClick={() => {
                  const json = serializeAssetPack(pack);
                  navigator.clipboard.writeText(json);
                }}
                title="Copy JSON to clipboard"
              >
                <Download size={14} />
              </button>
              <button
                className="small-action-btn"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const parsed = parseAssetPack(text);
                      onPackChange(parsed);
                    } catch (err) {
                      logger.error('Failed to parse asset pack:', err);
                    }
                  };
                  input.click();
                }}
                title="Import from JSON file"
              >
                <Upload size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="pack-errors">
          {errors.map((err, i) => (
            <div key={i} className="pack-error">{err}</div>
          ))}
        </div>
      )}

      {showAddForm && !readOnly && (
        <div className="pack-add-form">
          <input
            placeholder="Key"
            value={newEntry.key || ''}
            onChange={(e) => setNewEntry({ ...newEntry, key: e.target.value })}
          />
          <select
            value={newEntry.type || 'image'}
            onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as AssetPackEntryType })}
          >
            {ASSET_PACK_ENTRY_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
            ))}
          </select>
          <input
            placeholder="URL"
            value={newEntry.url || ''}
            onChange={(e) => setNewEntry({ ...newEntry, url: e.target.value })}
          />
          {newEntry.type === 'spritesheet' && (
            <>
              <input
                placeholder="Frame W"
                type="number"
                value={newEntry.frameConfig?.frameWidth || ''}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    frameConfig: { frameWidth: Number(e.target.value) || 16, frameHeight: newEntry.frameConfig?.frameHeight || 16 },
                  })
                }
              />
              <input
                placeholder="Frame H"
                type="number"
                value={newEntry.frameConfig?.frameHeight || ''}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    frameConfig: { frameWidth: newEntry.frameConfig?.frameWidth || 16, frameHeight: Number(e.target.value) || 16 },
                  })
                }
              />
            </>
          )}
          <button className="small-action-btn" onClick={addEntry} disabled={!newEntry.key || !newEntry.url}>
            <Check size={14} /> Add
          </button>
          <button className="small-action-btn" onClick={() => { setShowAddForm(false); setNewEntry({}); }}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="pack-table">
        <div className="pack-table-header">
          <span className="col-key">Key</span>
          <span className="col-type">Type</span>
          <span className="col-url">URL</span>
          <span className="col-actions">Actions</span>
        </div>
        {pack.entries.length === 0 ? (
          <div className="pack-empty-rows">No assets in pack.</div>
        ) : (
          pack.entries.map((entry) => (
            <div key={entry.key} className="pack-row">
              {editingKey === entry.key && editDraft ? (
                <EditRow
                  draft={editDraft}
                  keyError={keyError(editDraft.key)}
                  onChange={(patch) => setEditDraft({ ...editDraft, ...patch })}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                />
              ) : (
                <>
                  <span className="col-key">{entry.key}</span>
                  <span className="col-type">{TYPE_LABELS[entry.type] || entry.type}</span>
                  <span className="col-url">{entry.url}</span>
                  <span className="col-actions">
                    {!readOnly && (
                      <>
                        <button className="icon-btn" onClick={() => startEdit(entry)} title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button className="icon-btn danger" onClick={() => deleteEntry(entry.key)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </span>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EditRow({
  draft,
  keyError,
  onChange,
  onSave,
  onCancel,
}: {
  draft: AssetPackEntry;
  keyError?: string;
  onChange: (patch: Partial<AssetPackEntry>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <span className="col-key">
        <input
          className={keyError ? 'invalid' : ''}
          value={draft.key}
          onChange={(e) => onChange({ key: e.target.value })}
        />
        {keyError && <span className="field-error">{keyError}</span>}
      </span>
      <span className="col-type">
        <select
          value={draft.type}
          onChange={(e) => onChange({ type: e.target.value as AssetPackEntryType })}
        >
          {ASSET_PACK_ENTRY_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
          ))}
        </select>
      </span>
      <span className="col-url">
        <input value={draft.url} onChange={(e) => onChange({ url: e.target.value })} />
        {draft.type === 'spritesheet' && (
          <div className="inline-row">
            <input
              placeholder="FrameW"
              type="number"
              value={draft.frameConfig?.frameWidth || 16}
              onChange={(e) =>
                onChange({
                  frameConfig: {
                    ...draft.frameConfig,
                    frameWidth: Number(e.target.value) || 16,
                    frameHeight: draft.frameConfig?.frameHeight || 16,
                  },
                })
              }
            />
            <input
              placeholder="FrameH"
              type="number"
              value={draft.frameConfig?.frameHeight || 16}
              onChange={(e) =>
                onChange({
                  frameConfig: {
                    ...draft.frameConfig,
                    frameWidth: draft.frameConfig?.frameWidth || 16,
                    frameHeight: Number(e.target.value) || 16,
                  },
                })
              }
            />
          </div>
        )}
        {(draft.type === 'atlas' || draft.type === 'atlasJSON') && (
          <input
            placeholder="Atlas JSON URL"
            value={draft.atlasURL || draft.jsonURL || ''}
            onChange={(e) => onChange({ atlasURL: e.target.value })}
          />
        )}
      </span>
      <span className="col-actions">
        <button className="icon-btn" onClick={onSave} title="Save"><Check size={14} /></button>
        <button className="icon-btn" onClick={onCancel} title="Cancel"><X size={14} /></button>
      </span>
    </>
  );
}
