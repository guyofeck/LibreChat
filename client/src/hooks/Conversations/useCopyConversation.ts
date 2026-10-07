import { useCallback } from 'react';
import { useToastContext } from '@librechat/client';
import { useQueryClient } from '@tanstack/react-query';
import { dataService, QueryKeys } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import { formatMessageText } from './format';
import { useLocalize } from '~/hooks';

export default function useCopyConversation(conversationId: string | null, title: string | null) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  return useCallback(async () => {
    if (!conversationId) {
      return;
    }

    try {
      const messages =
        queryClient.getQueryData<TMessage[]>([QueryKeys.messages, conversationId]) ??
        (await queryClient.fetchQuery<TMessage[]>({
          queryKey: [QueryKeys.messages, conversationId],
          queryFn: () => dataService.getMessagesByConvoId(conversationId),
        }));
      const markdown = messages.reduce(
        (text, message) => `${text}\n\n${formatMessageText({ message, format: 'md', localize })}`,
        `# ${title ?? ''}`,
      );
      await navigator.clipboard.writeText(markdown);
      showToast({ message: localize('com_ui_copied_to_clipboard'), status: 'success' });
    } catch {
      showToast({ message: localize('com_ui_copy_failed'), status: 'error' });
    }
  }, [conversationId, title, queryClient, localize, showToast]);
}
