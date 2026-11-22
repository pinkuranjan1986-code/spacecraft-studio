import { makeBrief } from './config';
import type { ProjectBrief } from './models';
import { draftSchema } from './models';
export const draftKey = 'spacecraft-studio:draft:v1';
export function getDraft(): ProjectBrief {
  try {
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      const parsed = draftSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return { ...makeBrief(), ...parsed.data };
    }
  } catch {
    /* Keep recoverable input until user explicitly starts a new brief. */
  }
  return makeBrief();
}
