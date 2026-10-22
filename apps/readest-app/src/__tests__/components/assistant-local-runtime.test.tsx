import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from '@assistant-ui/react';

const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [{ type: 'text', text: 'ok' }] };
  },
};

const Chat = () => {
  const runtime = useLocalRuntime(adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div>chat</div>
    </AssistantRuntimeProvider>
  );
};

describe('assistant-ui local runtime', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('mounts without throwing (the AI chat panel uses this runtime)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Chat />)).not.toThrow();
  });
});
