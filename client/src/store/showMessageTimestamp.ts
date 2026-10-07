import { createStorageAtom } from './jotai-utils';

const DEFAULT_SHOW_MESSAGE_TIMESTAMP = false;

/**
 * When enabled, a timestamp is shown next to each message in the chat
 * (always visible, not only on hover).
 */
export const showMessageTimestampAtom = createStorageAtom<boolean>(
  'showMessageTimestamp',
  DEFAULT_SHOW_MESSAGE_TIMESTAMP,
);
