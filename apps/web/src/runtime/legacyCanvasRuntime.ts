import type { PreviewRuntimeDescriptor } from './PreviewRuntime';

export const LEGACY_CANVAS_RUNTIME_DESCRIPTOR: PreviewRuntimeDescriptor = {
  kind: 'legacy-canvas',
  label: 'Legacy Canvas Runtime',
  shortLabel: 'Legacy Canvas',
  description: 'Current preview runtime implemented directly in the web app canvas loop.',
  available: true,
};
