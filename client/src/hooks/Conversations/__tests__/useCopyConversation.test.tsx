import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContentTypes, dataService, QueryKeys } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import useCopyConversation from '../useCopyConversation';

const mockShowToast = jest.fn();
const localize = (key: string) => key;

jest.mock('@librechat/client', () => ({
  useToastContext: () => ({ showToast: mockShowToast }),
}));
jest.mock('~/hooks', () => ({
  useLocalize: () => localize,
}));
jest.mock('librechat-data-provider', () => ({
  ...jest.requireActual('librechat-data-provider'),
  dataService: {
    ...jest.requireActual('librechat-data-provider').dataService,
    getMessagesByConvoId: jest.fn(),
  },
}));

const message = (fields: Partial<TMessage>): TMessage => ({
  messageId: 'message-1',
  conversationId: 'conversation-1',
  parentMessageId: null,
  sender: 'User',
  text: 'Hello',
  isCreatedByUser: true,
  ...fields,
});

describe('useCopyConversation', () => {
  let queryClient: QueryClient;
  const writeText = jest.fn();

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => queryClient.clear());

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('copies all cached messages with their original Markdown and structured content', async () => {
    queryClient.setQueryData(
      [QueryKeys.messages, 'conversation-1'],
      [
        message({ text: '**Hello**' }),
        message({
          messageId: 'message-2',
          sender: 'Assistant',
          isCreatedByUser: false,
          content: [{ type: ContentTypes.TEXT, text: '```ts\nconst answer = 42;\n```' }],
        }),
        message({ messageId: 'message-3', text: 'Last message' }),
      ],
    );
    const fetchMessages = jest.spyOn(dataService, 'getMessagesByConvoId');
    const { result } = renderHook(() => useCopyConversation('conversation-1', 'My chat'), {
      wrapper,
    });

    await act(async () => result.current());

    expect(writeText).toHaveBeenCalledWith(
      '# My chat\n\n**User**\n**Hello**\n\n**Assistant**\n```ts\nconst answer = 42;\n```\n\n**User**\nLast message',
    );
    expect(fetchMessages).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith({
      message: 'com_ui_copied_to_clipboard',
      status: 'success',
    });
  });

  it('fetches the selected conversation when it is not cached', async () => {
    const fetchMessages = jest
      .spyOn(dataService, 'getMessagesByConvoId')
      .mockResolvedValue([message({ text: 'Unopened conversation' })]);
    const { result } = renderHook(() => useCopyConversation('conversation-1', 'Other chat'), {
      wrapper,
    });

    await act(async () => result.current());

    expect(fetchMessages).toHaveBeenCalledWith('conversation-1');
    expect(writeText).toHaveBeenCalledWith('# Other chat\n\n**User**\nUnopened conversation');
  });

  it('reports clipboard failures without a success toast', async () => {
    queryClient.setQueryData([QueryKeys.messages, 'conversation-1'], [message({})]);
    writeText.mockRejectedValue(new Error('Permission denied'));
    const { result } = renderHook(() => useCopyConversation('conversation-1', 'My chat'), {
      wrapper,
    });

    await act(async () => result.current());

    expect(mockShowToast).toHaveBeenCalledWith({ message: 'com_ui_copy_failed', status: 'error' });
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });

  it('reports message retrieval failures without writing to the clipboard', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(dataService, 'getMessagesByConvoId').mockRejectedValue(new Error('Not found'));
    const { result } = renderHook(() => useCopyConversation('conversation-1', 'My chat'), {
      wrapper,
    });

    await act(async () => result.current());

    expect(writeText).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith({ message: 'com_ui_copy_failed', status: 'error' });
  });

  it('does nothing without a conversation ID', async () => {
    const { result } = renderHook(() => useCopyConversation(null, null), { wrapper });

    await act(async () => result.current());

    expect(writeText).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
