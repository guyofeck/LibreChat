import { RecoilRoot } from 'recoil';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Constants, ContentTypes, dataService, QueryKeys } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import type { ReactNode } from 'react';
import useCopyConversation from './useCopyConversation';

const mockShowToast = jest.fn();
const writeText = jest.fn();

jest.mock('@librechat/client', () => ({
  useToastContext: () => ({ showToast: mockShowToast }),
}));

jest.mock('librechat-data-provider', () => {
  const actual = jest.requireActual('librechat-data-provider');
  return { ...actual, dataService: { ...actual.dataService } };
});

const messages: TMessage[] = [
  {
    messageId: 'user-1',
    conversationId: 'conversation-1',
    parentMessageId: String(Constants.NO_PARENT),
    sender: 'User',
    text: 'Explain **Markdown**.',
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
  {
    messageId: 'user-2',
    conversationId: 'conversation-1',
    parentMessageId: 'assistant-1',
    sender: 'User',
    text: 'Thanks!',
    isCreatedByUser: true,
  },
];

function setup(cachedMessages?: TMessage[], conversationId = 'conversation-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (cachedMessages) {
    queryClient.setQueryData([QueryKeys.messages, conversationId], cachedMessages);
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>{children}</RecoilRoot>
    </QueryClientProvider>
  );
  return renderHook(() => useCopyConversation({ conversationId, title: 'Markdown chat' }), {
    wrapper,
  });
}

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

it('copies every turn in order, preserving Markdown and structured content', async () => {
  const fetchMessages = jest.spyOn(dataService, 'getMessagesByConvoId');
  const { result } = setup(messages);
  await act(async () => result.current());

  expect(writeText).toHaveBeenCalledWith(
    '# Markdown chat\n\n**User**\nExplain **Markdown**.\n\n**Assistant**\n```js\nconst answer = 42;\n```\n\n**User**\nThanks!',
  );
  expect(fetchMessages).not.toHaveBeenCalled();
  expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
});

it('loads messages for a conversation that is not open', async () => {
  const fetchMessages = jest.spyOn(dataService, 'getMessagesByConvoId').mockResolvedValue(messages);
  const { result } = setup();
  await act(async () => result.current());

  expect(fetchMessages).toHaveBeenCalledWith('conversation-1');
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Thanks!'));
});

it('reports clipboard failure without showing success', async () => {
  writeText.mockRejectedValue(new Error('Clipboard denied'));
  const { result } = setup(messages);
  await act(async () => result.current());

  expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  expect(mockShowToast).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
});

it('reports message loading failure without copying an incomplete conversation', async () => {
  jest.spyOn(dataService, 'getMessagesByConvoId').mockRejectedValue(new Error('Unavailable'));
  const { result } = setup();
  await act(async () => result.current());

  expect(writeText).not.toHaveBeenCalled();
  expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
});

it('does not copy an unsaved conversation', async () => {
  const { result } = setup(undefined, 'new');
  await act(async () => result.current());

  expect(writeText).not.toHaveBeenCalled();
  expect(mockShowToast).not.toHaveBeenCalled();
});
