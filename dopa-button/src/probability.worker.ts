/// <reference lib="webworker" />
import { EVENTS, rollGaming, rollRound } from './probability';
import type { ProbabilityWorkerRequest, ProbabilityWorkerResponse } from './probability';

const worker = self as unknown as DedicatedWorkerGlobalScope;
worker.onmessage = (message: MessageEvent<ProbabilityWorkerRequest>) => {
  const { id, type } = message.data;
  if (!Number.isInteger(id) || !['roll', 'gaming'].includes(type)) return;
  try {
    let response: ProbabilityWorkerResponse;
    if (type === 'gaming') {
      const started = performance.now();
      response = { id, hits: [], trigger: false, candidateId: null, theater: false, tier: rollGaming(), durationMs: performance.now() - started };
    } else {
      const result = rollRound(EVENTS);
      response = { id, hits: result.hits.map(event => event.id), trigger: result.trigger, candidateId: result.candidate?.id || null,
        theater: result.theater, tier: null, durationMs: result.durationMs };
    }
    worker.postMessage(response);
  } catch (error) {
    worker.postMessage({ id, hits: [], trigger: false, candidateId: null, theater: false, tier: null, durationMs: 0,
      error: error instanceof Error ? error.message : 'Probability engine failed' } satisfies ProbabilityWorkerResponse);
  }
};
