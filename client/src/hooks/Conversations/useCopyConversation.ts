import { useToastContext } from '@librechat/client';
import { useQueryClient } from '@tanstack/react-query';
import { buildTree, dataService, QueryKeys } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import useBuildMessageTree from '~/hooks/Messages/useBuildMessageTree';
import useLocalize from '~/hooks/useLocalize';
import { formatMessageText } from './format';

export default function useCopyConversation({
  conversationId,
  title,
}: {
  conversationId: string | null | undefined;
  title: string | null | undefined;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  const localize = useLocalize();
  const buildMessageTree = useBuildMessageTree();

  return async () => {
    if (!conversationId || conversationId === 'new' || conversationId === 'search') {
      return;
    }

    try {
      const messages =
        queryClient.getQueryData<TMessage[]>([QueryKeys.messages, conversationId]) ??
        (await queryClient.fetchQuery({
          queryKey: [QueryKeys.messages, conversationId],
          queryFn: () => dataService.getMessagesByConvoId(conversationId),
        })) ??
        [];
      const history = await buildMessageTree({
        messageId: conversationId,
        message: null,
        messages: buildTree({ messages }) ?? null,
        branches: false,
        recursive: false,
      });
      const entries = Array.isArray(history) ? history : [history];
      const markdown = [
        `# ${title ?? localize('com_ui_conversation')}`,
        ...entries.map((message) => formatMessageText({ message, format: 'md', localize })),
      ].join('\n\n');

      await navigator.clipboard.writeText(markdown);
      showToast({ message: localize('com_ui_copied_to_clipboard'), status: 'success' });
    } catch {
      showToast({ message: localize('com_ui_copy_failed'), status: 'error' });
    }
  };
}
