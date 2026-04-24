export interface SseEvent {
  type: string;
  data: string;
  id?: string;
}

export interface SseClientOptions {
  url: string;
  headers?: Record<string, string>;
  onMessage: (event: SseEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: unknown) => void;
  retry?: {
    /** @default 3000 */
    maxAttempts?: number; 
    /** @default 5 */  
    delayMs?: number;       
  };
  /** @default 10000 */
  timeoutMs?: number;
}

export class SseClient {
  private controller: AbortController | null = null;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  async connect(options: SseClientOptions) {
    const {
      retry: { maxAttempts = 5, delayMs = 3000 } = {},
      timeoutMs = 10000,
    } = options;

    this.stopped = false;
    let attempts = 0;

    while (!this.stopped) {
      if (maxAttempts !== -1 && attempts >= maxAttempts) {
        options.onError?.(new Error(`SSE: max retry attempts (${maxAttempts}) reached`));
        break;
      }

      try {
        await this.attempt(options, timeoutMs);
        break;
      } catch (err) {
        if (this.stopped) break;
        attempts++;
        options.onError?.(err);
        if (maxAttempts !== -1 && attempts >= maxAttempts) {
          options.onError?.(new Error(`SSE: max retry attempts (${maxAttempts}) reached`));
          break;
        }
        await this.sleep(delayMs);
      }
    }

    options.onClose?.();
  }

  disconnect() {
    this.stopped = true;
    this.clearTimeout();
    this.controller?.abort();
    this.controller = null;
  }

  private async attempt(options: SseClientOptions, timeoutMs?: number) {
    this.controller = new AbortController();

    if (timeoutMs) {
      this.timeoutHandle = setTimeout(() => {
        this.controller?.abort();
      }, timeoutMs);
    }

    try {
      const response = await fetch(options.url, {
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...options.headers,
        },
        signal: this.controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE error: ${response.status}`);
      }

      this.clearTimeout();
      options.onOpen?.();

      await this.readStream(response.body, options.onMessage);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (this.stopped) return; 
        throw new Error('SSE: timeout');
      }
      throw err;
    } finally {
      this.clearTimeout();
    }
  }

  private async readStream(
    body: ReadableStream<Uint8Array>,
    onMessage: (event: SseEvent) => void
  ) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let currentType = 'message';
    let currentData = '';
    let currentId: string | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const raw of lines) {
        const line = raw.trimEnd();

        if (line === '') {
          if (currentData) {
            onMessage({ type: currentType, data: currentData, id: currentId });
          }
          currentType = 'message';
          currentData = '';
          currentId = undefined;
          continue;
        }

        if (line.startsWith(':')) continue;

        const colonIndex = line.indexOf(':');
        const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
        const value = colonIndex === -1 ? '' : line.slice(colonIndex + 1).trimStart();

        switch (field) {
          case 'event': currentType = value; break;
          case 'data':  currentData += (currentData ? '\n' : '') + value; break;
          case 'id':    currentId = value; break;
          case 'retry': break;
        }
      }
    }
  }

  private clearTimeout() {
    if (this.timeoutHandle !== null) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}