import { useCallback } from 'react';
import copy from 'copy-to-clipboard';
import { useToastContext } from '@librechat/client';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { TConversation, TMessage } from 'librechat-data-provider';
import { NotificationSeverity } from '~/common';
import useLocalize from '~/hooks/useLocalize';
import { formatMessageText } from './format';

export default function useCopyConversation({
  conversationId,
  title,
}: Pick<TConversation, 'conversationId' | 'title'>) {
  const queryClient = useQueryClient();
  const localize = useLocalize();
  const { showToast } = useToastContext();

  return useCallback(async () => {
    if (!conversationId || conversationId === 'new' || conversationId === 'search') {
      return;
    }

    try {
      const queryKey = [QueryKeys.messages, conversationId];
      const messages =
        queryClient.getQueryData<TMessage[]>(queryKey) ??
        (await queryClient.fetchQuery({
          queryKey,
          queryFn: () => dataService.getMessagesByConvoId(conversationId),
        }));
      if (!messages) {
        throw new Error('Conversation messages unavailable');
      }
      const markdown = [`# ${title ?? localize('com_ui_conversation')}`];
      for (const message of messages) {
        markdown.push(formatMessageText({ message, format: 'md', localize }));
      }
      const text = markdown.join('\n\n');
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!copy(text, { format: 'text/plain' })) {
        throw new Error('Clipboard copy failed');
      }
      showToast({
        message: localize('com_ui_copied_to_clipboard'),
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
    } catch {
      showToast({
        message: localize('com_ui_copy_failed'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    }
  }, [conversationId, title, queryClient, localize, showToast]);
}
