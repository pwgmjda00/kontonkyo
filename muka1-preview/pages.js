import { PHRASE_MAP, submissionPhraseId } from "./catalog.js";

export const createPool = () => new Map(PHRASE_MAP);

// Approved submissions keep the existing public ID, 255 + the D1 submission ID.
// This optional lookup must not prevent built-in rankings/history from rendering.
export async function loadApproved(pool) {
  if (!window.MUKA_API) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(window.MUKA_API + "/approved", {
      signal: controller.signal,
    });
    if (!response.ok) return;
    const data = await response.json();
    for (const item of Array.isArray(data.items) ? data.items : []) {
      const id = submissionPhraseId(item.id);
      if (id !== null && typeof item.text === "string" && !pool.has(id)) {
        pool.set(id, item.text);
      }
    }
  } catch {
    // The existing public ranking/history request still proceeds on failure.
  } finally {
    clearTimeout(timer);
  }
}
