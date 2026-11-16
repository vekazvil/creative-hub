import 'server-only';

import {
  applyPrefill,
  prefillInstructions,
  prefillSchema,
  todayInTexas,
  type RequestFormData,
  type RequestMode,
  type WorkType,
} from '@creative-hub/core';

import { getAiClient, logAiCall } from '../ai';
import { getApprovers } from '../approvers';
import { getBrands } from '../brands';

/**
 * Fills the new draft's fields with what its notes already say. Without AI, or when the call
 * fails, the draft starts empty as before: prefilling must never block a request.
 */
export async function prefillFromNotes(
  type: WorkType,
  mode: RequestMode,
  data: RequestFormData,
  actorEmail: string,
): Promise<RequestFormData> {
  const ai = getAiClient();
  if (!data.notes || ai.isFake) return data;
  try {
    const [brands, approvers] = await Promise.all([getBrands(), getApprovers()]);
    const res = await ai.structured({
      name: 'prefill',
      instructions: prefillInstructions({
        type,
        mode,
        data,
        today: todayInTexas(),
        brands,
        approvers,
      }),
      messages: [{ role: 'user', content: data.notes }],
      schema: prefillSchema,
    });
    await logAiCall(res.usage, actorEmail, 'prefill');
    return applyPrefill(type, mode, data, res.data, brands, approvers).data;
  } catch (err) {
    console.error('prefill failed', err);
    return data;
  }
}
