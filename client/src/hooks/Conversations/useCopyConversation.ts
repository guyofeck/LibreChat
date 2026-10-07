import copy from 'copy-to-clipboard';
import { useToastContext } from '@librechat/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import { NotificationSeverity } from '~/common';
import { formatMessageText } from './format';
import useLocalize from '~/hooks/useLocalize';

export default function useCopyConversation(conversationId: string | null, title: string | null) {
  const queryClient = useQueryClient();
  const localize = useLocalize();
  const { showToast } = useToastContext();

  return useMutation({
    mutationFn: async () => {
      if (!conversationId) {
        throw new Error('No conversation selected');
      }
      const messages = await queryClient.fetchQuery<TMessage[]>({
        queryKey: [QueryKeys.messages, conversationId],
        queryFn: () => dataService.getMessagesByConvoId(conversationId),
        staleTime: Infinity,
      });
      const markdown = [
        `# ${title || localize('com_ui_conversation')}`,
        ...messages.map((message) =>
          formatMessageText({
            message: {
              ...message,
              content: message.content?.length ? message.content : undefined,
            },
            format: 'md',
            localize,
          }),
        ),
      ].join('\n\n');

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
        return;
      }
      if (!copy(markdown, { format: 'text/plain' })) {
        throw new Error('Could not copy conversation');
      }
    },
    onSuccess: () => {
      showToast({
        message: localize('com_ui_copied_to_clipboard'),
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
    },
    onError: () => {
      showToast({
        message: localize('com_ui_copy_conversation_error'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });
}
