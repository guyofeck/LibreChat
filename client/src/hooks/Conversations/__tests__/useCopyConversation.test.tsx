import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContentTypes, QueryKeys, dataService } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import useCopyConversation from '../useCopyConversation';

const mockShowToast = jest.fn();
const writeText = jest.fn().mockResolvedValue(undefined);

jest.mock('librechat-data-provider', () => {
  const actual =
    jest.requireActual<typeof import('librechat-data-provider')>('librechat-data-provider');
  return { ...actual, dataService: { ...actual.dataService } };
});

jest.mock('@librechat/client', () => ({
  useToastContext: () => ({ showToast: mockShowToast }),
}));
jest.mock('~/hooks/useLocalize', () => ({
  __esModule: true,
  default: () => (key: string) => key,
}));

const messages: TMessage[] = [
  {
    messageId: 'user-1',
    conversationId: 'conversation-1',
    parentMessageId: '00000000-0000-0000-0000-000000000000',
    sender: 'User',
    text: 'A **Markdown** question',
    content: [],
    isCreatedByUser: true,
  },
  {
    messageId: 'assistant-1',
    conversationId: 'conversation-1',
    parentMessageId: 'user-1',
    sender: 'Assistant',
    text: '',
    content: [{ type: ContentTypes.TEXT, text: '```js\nconst answer = 42;\n```' }],
    isCreatedByUser: false,
  },
];

function setup(cached = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    logger: { log: console.log, warn: console.warn, error: jest.fn() },
  });
  if (cached) {
    queryClient.setQueryData([QueryKeys.messages, 'conversation-1'], messages);
  }
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCopyConversation('conversation-1', 'Test conversation'), { wrapper });
}

describe('Copy conversation as Markdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('copies every cached message with the title, speakers, and Markdown intact', async () => {
    const fetchMessages = jest.spyOn(dataService, 'getMessagesByConvoId');
    const { result } = setup();

    await act(async () => result.current.mutateAsync());

    expect(writeText).toHaveBeenCalledWith(
      '# Test conversation\n\n**User**\nA **Markdown** question\n\n**Assistant**\n```js\nconst answer = 42;\n```',
    );
    expect(fetchMessages).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'com_ui_copied_to_clipboard' }),
    );
  });

  it('loads an unopened conversation before copying all its messages', async () => {
    const fetchMessages = jest
      .spyOn(dataService, 'getMessagesByConvoId')
      .mockResolvedValue(messages);
    const { result } = setup(false);

    await act(async () => result.current.mutateAsync());

    expect(fetchMessages).toHaveBeenCalledWith('conversation-1');
    expect(writeText.mock.calls[0][0]).toContain('**User**');
    expect(writeText.mock.calls[0][0]).toContain('**Assistant**');
  });

  it('reports clipboard rejection without claiming success', async () => {
    writeText.mockRejectedValue(new Error('Clipboard denied'));
    const { result } = setup();

    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'com_ui_copy_conversation_error' }),
    );
  });

  it('does not write incomplete content when loading the conversation fails', async () => {
    jest.spyOn(dataService, 'getMessagesByConvoId').mockRejectedValue(new Error('Load failed'));
    const { result } = setup(false);

    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(writeText).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'com_ui_copy_conversation_error' }),
    );
  });
});
