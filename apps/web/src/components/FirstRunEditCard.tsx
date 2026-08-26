/**
 * FirstRunEditCard — guided first mock edit (onboarding design §2 S3/S4, slice 2).
 *
 * Slim "next step" banner below the preview canvas with one-click suggestion
 * chips for the launched template's amended recipe catalog (§7 — verified
 * recipes only). A chip sends its command through the existing AI command
 * route; the mock service answers with a scene-JSON change that renders in the
 * existing diff-review UI and applies via api.writeFile (same path as
 * AICommandPage handleApplyChange).
 *
 * Hidden once the project has ≥1 applied edit or the user dismisses
 * (per-project flags in the recent-projects index). Emits the chip-funnel
 * events into the storage-only activation log (utils/activationEvents.ts).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import { api, type AICommandResponse } from '../api/client';
import { CodeDiffView } from './CodeDiffView';
import { getRecipesForTemplate, type FirstRunRecipe } from '@clawgame/shared';
import { touchRecentProject, getRecentProjects } from '../utils/recentProjects';
import { trackEvent } from '../utils/activationEvents';
import { logger } from '../utils/logger';

type ChipPhase = 'idle' | 'loading' | 'review' | 'applied' | 'error';

interface FirstRunEditCardProps {
  projectId: string;
  /** Template id from the recent-projects index; card hides when unknown. */
  templateId?: string;
  /** Called after a successful apply so the host can reload the scene. */
  onApplied?: () => void;
}

export function FirstRunEditCard({ projectId, templateId, onApplied }: FirstRunEditCardProps) {
  const recipes = useMemo(() => getRecipesForTemplate(templateId), [templateId]);
  const [dismissed, setDismissed] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<FirstRunRecipe | null>(null);
  const [phase, setPhase] = useState<ChipPhase>('idle');
  const [response, setResponse] = useState<AICommandResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [provider, setProvider] = useState<'mock' | 'live'>('mock');

  // Provider label for honest funnel props + copy: health endpoint is the same
  // source AICommandPage's badge uses ('mock-ai-preview' service = mock).
  useEffect(() => {
    let cancelled = false;
    api.getAIHealth()
      .then((health) => {
        if (!cancelled) setProvider(health.service === 'mock-ai-preview' ? 'mock' : 'live');
      })
      .catch(() => {
        /* unreachable provider → mock remains the safe default label */
      });
    return () => { cancelled = true; };
  }, []);

  // ai_suggestion_shown — once per mount with the offered recipe ids.
  useEffect(() => {
    if (recipes.length === 0) return;
    trackEvent('ai_suggestion_shown', {
      projectId,
      recipes: recipes.map((r) => r.id).join(','),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, templateId]);

  const handleChipClick = useCallback(async (recipe: FirstRunRecipe) => {
    setActiveRecipe(recipe);
    setPhase('loading');
    setErrorText(null);
    try {
      const result = await api.processAICommand(projectId, {
        command: recipe.command,
        projectId,
        context: { selectedFiles: [] },
      });
      trackEvent('ai_prompt_submitted', { provider, recipeId: recipe.id });
      const aiResponse = result.response;
      const hasChanges = !!aiResponse.changes && aiResponse.changes.length > 0;
      setResponse(aiResponse);
      setPhase(hasChanges ? 'review' : 'error');
      if (!hasChanges) setErrorText('The assistant did not return a change to apply.');
    } catch (err: any) {
      logger.error('First-run recipe command failed:', err);
      trackEvent('ai_prompt_submitted', { provider, recipeId: recipe.id });
      setPhase('error');
      setErrorText(err?.message || 'Could not reach the AI service.');
    }
  }, [projectId, provider]);

  const handleApply = useCallback(async () => {
    if (!response?.changes?.length || !activeRecipe) return;
    const change = response.changes[0];
    if (!change.newContent) {
      setPhase('error');
      setErrorText('No content to apply.');
      return;
    }
    try {
      await api.writeFile(projectId, change.path, change.newContent);
      trackEvent('edit_applied', {
        provider,
        recipeId: activeRecipe.id,
        path: change.path.split('/').pop(),
        projectId,
      });
      touchRecentProject(projectId, { edited: true });
      setPhase('applied');
      onApplied?.();
    } catch (err: any) {
      logger.error('First-run apply failed:', err);
      setPhase('error');
      setErrorText(err?.message || 'Applying the change failed.');
    }
  }, [response, activeRecipe, projectId, provider, onApplied]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    touchRecentProject(projectId, { dismissedGuidance: true });
  }, [projectId]);

  // Suppression: no recipes for this template, already edited, or dismissed.
  const indexEntry = useMemo(
    () => getRecentProjects().find((e) => e.id === projectId),
    [projectId],
  );
  if (recipes.length === 0 || dismissed || indexEntry?.edited || indexEntry?.dismissedGuidance) {
    return null;
  }

  return (
    <div className="first-run-edit-card" data-testid="first-run-edit-card">
      <div className="first-run-edit-header">
        <Sparkles size={14} />
        <span className="first-run-edit-title">Make it yours — try a free AI edit</span>
        <button
          className="first-run-edit-dismiss"
          onClick={handleDismiss}
          title="Dismiss suggestions"
          aria-label="Dismiss suggestions"
        >
          <X size={13} />
        </button>
      </div>

      {phase === 'applied' ? (
        <p className="first-run-edit-done">
          <Check size={13} /> Applied! Press Start Game to see your change in play.
        </p>
      ) : (
        <>
          <div className="first-run-edit-chips">
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                className="first-run-chip"
                data-testid={`first-run-chip-${recipe.id}`}
                disabled={phase === 'loading'}
                onClick={() => handleChipClick(recipe)}
                title={recipe.summaryLine}
              >
                {phase === 'loading' && activeRecipe?.id === recipe.id ? 'Thinking…' : recipe.chipLabel}
              </button>
            ))}
          </div>
          {activeRecipe && (
            <p className="first-run-edit-summary">
              {activeRecipe.summaryLine}
              {activeRecipe.deferredNote && (
                <span className="first-run-edit-note"> {activeRecipe.deferredNote}</span>
              )}
            </p>
          )}
          {errorText && <p className="first-run-edit-error">{errorText}</p>}
        </>
      )}

      {phase === 'review' && response?.changes?.[0] && (
        <div className="first-run-edit-diff">
          <CodeDiffView
            path={response.changes[0].path}
            oldCode={response.changes[0].oldContent}
            newCode={response.changes[0].newContent ?? ''}
            summary={response.changes[0].summary}
            confidence={response.changes[0].confidence}
            isApplying={false}
            onApply={handleApply}
            onReject={() => { setPhase('idle'); setActiveRecipe(null); setResponse(null); }}
          />
        </div>
      )}
    </div>
  );
}
