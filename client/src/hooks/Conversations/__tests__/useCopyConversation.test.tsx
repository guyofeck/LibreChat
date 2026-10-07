import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContentTypes, QueryKeys, dataService } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import useCopyConversation from '../useCopyConversation';

const mockShowToast = jest.fn();
const mockWriteText = jest.fn();
const mockCopy = jest.fn();

jest.mock('librechat-data-provider', () => ({
  ...jest.requireActual('librechat-data-provider'),
  dataService: { getMessagesByConvoId: jest.fn() },
}));

jest.mock('@librechat/client', () => ({
  useToastContext: () => ({ showToast: mockShowToast }),
}));
jest.mock('~/hooks/useLocalize', () => ({
  __esModule: true,
  default: () => (key: string) => key,
}));
jest.mock('copy-to-clipboard', () => ({
  __esModule: true,
  default: (...args: Parameters<typeof import('copy-to-clipboard')>) => mockCopy(...args),
}));

const messages = [
  { messageId: 'user-1', sender: 'User', text: 'First **question**' },
  {
    messageId: 'assistant-1',
    sender: 'Assistant',
    content: [{ type: ContentTypes.TEXT, text: '```js\nconst a = 1;\n```' }],
  },
  { messageId: 'assistant-branch', sender: 'Assistant', text: 'Alternate answer' },
  { messageId: 'user-2', sender: 'User', text: 'Follow-up' },
] as TMessage[];

const expectedMarkdown =
  '# Test conversation\n\n**User**\nFirst **question**\n\n**Assistant**\n```js\nconst a = 1;\n```\n\n**Assistant**\nAlternate answer\n\n**User**\nFollow-up';

function setup(cached = true, conversationId = 'conversation-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (cached) {
    queryClient.setQueryData([QueryKeys.messages, conversationId], messages);
  }
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCopyConversation({ conversationId, title: 'Test conversation' }), {
    wrapper,
  });
}

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: mockWriteText },
  });
  mockWriteText.mockResolvedValue(undefined);
  mockCopy.mockReturnValue(true);
});

it('copies every cached message, including branches, preserving Markdown and content parts', async () => {
  const fetchMessages = jest.spyOn(dataService, 'getMessagesByConvoId');
  const { result } = setup();
  await act(async () => {
    await result.current();
  });
  expect(mockWriteText).toHaveBeenCalledWith(expectedMarkdown);
  expect(fetchMessages).not.toHaveBeenCalled();
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'com_ui_copied_to_clipboard',
    }),
  );
});

it('loads the selected conversation when it has not been opened', async () => {
  const fetchMessages = jest.spyOn(dataService, 'getMessagesByConvoId').mockResolvedValue(messages);
  const { result } = setup(false);
  await act(async () => {
    await result.current();
  });
  expect(fetchMessages).toHaveBeenCalledWith('conversation-1');
  expect(mockWriteText).toHaveBeenCalledWith(expectedMarkdown);
});

it('reports clipboard permission failures without claiming success', async () => {
  mockWriteText.mockRejectedValue(new Error('Permission denied'));
  const { result } = setup();
  await act(async () => {
    await result.current();
  });
  expect(mockShowToast).toHaveBeenCalledTimes(1);
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'com_ui_copy_failed' }),
  );
});

it('reports message loading failures without copying', async () => {
  jest.spyOn(dataService, 'getMessagesByConvoId').mockRejectedValue(new Error('Unavailable'));
  const { result } = setup(false);
  await act(async () => {
    await result.current();
  });
  expect(mockWriteText).not.toHaveBeenCalled();
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'com_ui_copy_failed' }),
  );
});

it('uses the existing clipboard fallback when the clipboard API is unavailable', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  const { result } = setup();
  await act(async () => {
    await result.current();
  });
  expect(mockCopy).toHaveBeenCalledWith(expectedMarkdown, { format: 'text/plain' });
});

it('reports a failed fallback copy', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  mockCopy.mockReturnValue(false);
  const { result } = setup();
  await act(async () => {
    await result.current();
  });
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'com_ui_copy_failed' }),
  );
});

it('does not copy a new conversation', async () => {
  const { result } = setup(true, 'new');
  await act(async () => {
    await result.current();
  });
  expect(mockWriteText).not.toHaveBeenCalled();
});
