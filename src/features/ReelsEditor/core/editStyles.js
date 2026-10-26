import { REEL_TEMPLATES } from './templates.js';

// This profile translates the reference-editing approach into supported renderer primitives.
export const EDIT_STYLES = [
  {
    id: 'reference-editor',
    name: 'Story-led edit',
    description: 'Original footage, focused captions and occasional full-screen takeaways.',
    sample: 'A small idea.\nA clearer story.',
    templates: ['hormozi-caption', 'spotlight-callout', 'point-list-3', 'before-after-split', 'viral-hook'],
    rules: 'Keep the speaker visible most of the time. Use short emphasis phrases, one idea per scene, and occasional full-screen cards only when the speech supports them. Avoid forced hooks, invented facts, watermarks and extra endings. Use the selected palette and font. Timing is approximate: do not claim word alignment.',
  },
  ...REEL_TEMPLATES.map(t => ({
    id: t.id, name: t.name, description: t.description,
    sample: t.defaultText, templates: [t.id],
    rules: 'Use only this selected layout for the visual layers. Use actual spoken ideas; omit a layer when this layout would misrepresent the content. Preserve raw footage between overlays.',
  })),
];
export const getEditStyle = id => EDIT_STYLES.find(s => s.id === id) || null;
