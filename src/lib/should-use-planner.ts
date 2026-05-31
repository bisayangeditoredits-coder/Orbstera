const PLANNER_PROMPT_THRESHOLD = 300;

export function shouldUsePlanner(args: {
  prompt: string;
  hasFileAttachment?: boolean;
  mode?: string | null;
  forcePlanner?: boolean;
}): boolean {
  if (args.forcePlanner) return true;
  if (args.mode === 'enhance') return false;
  if (args.hasFileAttachment) return true;
  const trimmed = args.prompt.trim();
  if (trimmed.length > PLANNER_PROMPT_THRESHOLD) return true;
  return false;
}
