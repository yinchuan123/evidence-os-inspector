import type { ReviewLabel } from '../core/types'

/** Unsaved review input for one claim, kept by the workspace so it survives switching claims or tabs. */
export interface ReviewDraft {
  label: Exclude<ReviewLabel, 'unreviewed'> | null
  rationale: string
  reviewer: string
}

export const EMPTY_DRAFT: ReviewDraft = { label: null, rationale: '', reviewer: '' }
