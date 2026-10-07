import { createStorageAtom } from './jotai-utils';

export const showTimestampsAtom = createStorageAtom<boolean>('showTimestamps', false);
