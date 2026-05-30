export type ReferenceTemplateId = 'modern-business' | 'healthcare-tech';

export type ReferenceTemplateMeta = {
  id: ReferenceTemplateId;
  label: string;
  zipFile: string;
  keywords: string[];
  description: string;
};

export const REFERENCE_TEMPLATE_CATALOG: ReferenceTemplateMeta[] = [
  {
    id: 'modern-business',
    label: 'Modern Business',
    zipFile: 'modern.zip',
    keywords: ['business', 'corporate', 'startup', 'pitch', 'strategy', 'saas', 'marketing', 'sales', 'finance'],
    description: 'Clean corporate layouts with bold typography and photo blocks.',
  },
  {
    id: 'healthcare-tech',
    label: 'Healthcare & Tech',
    zipFile: 'health.zip',
    keywords: ['health', 'healthcare', 'medical', 'hospital', 'pharma', 'biotech', 'clinical', 'patient', 'doctor'],
    description: 'Medical and health-tech presentation with imagery-rich slides.',
  },
];

export function selectReferenceTemplate(prompt: string, layoutCategory?: string): ReferenceTemplateId {
  const text = `${prompt} ${layoutCategory || ''}`.toLowerCase();
  let best: ReferenceTemplateId = 'modern-business';
  let bestScore = 0;
  for (const tpl of REFERENCE_TEMPLATE_CATALOG) {
    let score = 0;
    for (const kw of tpl.keywords) {
      if (text.includes(kw)) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = tpl.id;
    }
  }
  return best;
}
