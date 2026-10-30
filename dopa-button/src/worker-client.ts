import type { ProbabilityWorkerResponse } from './probability';

/** A failed draw is reported, never silently retried or replaced by a losing draw. */
export class ProbabilityClient {
  private worker: Worker;
  private id = 0;
  private fatal: Error | null = null;
  private pending = new Map<number, {
    resolve: (value: ProbabilityWorkerResponse) => void;
    reject: (reason: Error) => void;
  }>();
  constructor() {
    this.worker = new Worker(new URL('./probability.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (message: MessageEvent<ProbabilityWorkerResponse>) => {
      const task = this.pending.get(message.data.id);
      if (!task) return;
      this.pending.delete(message.data.id);
      if (message.data.error) task.reject(new Error(message.data.error));
      else task.resolve(message.data);
    };
    this.worker.onerror = () => this.rejectAll(new Error('確率Workerを起動できませんでした。'));
    this.worker.onmessageerror = () => this.rejectAll(new Error('確率Workerの結果を受信できませんでした。'));
  }
  private rejectAll(error: Error) {
    this.fatal = error;
    this.pending.forEach(task => task.reject(error));
    this.pending.clear();
  }
  private request(type: 'roll' | 'gaming') {
    return new Promise<ProbabilityWorkerResponse>((resolve, reject) => {
      if (this.fatal) { reject(this.fatal); return; }
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      try { this.worker.postMessage({ id, type }); }
      catch (error) {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error('確率抽選を開始できませんでした。'));
      }
    });
  }
  roll = () => this.request('roll');
  gaming = () => this.request('gaming');
  destroy() {
    this.worker.terminate();
    this.rejectAll(new Error('確率Workerは停止しました。'));
  }
}
