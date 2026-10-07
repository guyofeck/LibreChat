import { useRecoilValue } from 'recoil';
import { useTranslation } from 'react-i18next';
import settings from '~/store/settings';
import useTimeTick from '~/hooks/useTimeTick';
import { getMessageTimestamp } from '~/utils';

type Timestamp = NonNullable<ReturnType<typeof getMessageTimestamp>>;

function TimestampText({ timestamp }: { timestamp: Timestamp }) {
  return (
    <time
      dateTime={timestamp.iso}
      title={timestamp.isRecent ? timestamp.absolute : undefined}
      className="ml-2 text-xs font-normal text-text-secondary"
    >
      {timestamp.isRecent ? timestamp.relative : timestamp.absolute}
    </time>
  );
}

/** Only recent timestamps subscribe to the shared minute ticker, so the
 * per-minute sweep re-renders a handful of rows instead of every message. */
function RecentTimestamp({ value, language }: { value?: string | null; language: string }) {
  useTimeTick();
  const timestamp = getMessageTimestamp(value, language);

  if (!timestamp) {
    return null;
  }

  return <TimestampText timestamp={timestamp} />;
}

/** Recent messages show relative time with the absolute date on hover. */
export default function MessageTimestamp({ value }: { value?: string | null }) {
  const showMessageTimestamps = useRecoilValue(settings.showMessageTimestamps);
  const { i18n } = useTranslation();

  if (!showMessageTimestamps) {
    return null;
  }

  const timestamp = getMessageTimestamp(value, i18n.language);

  if (!timestamp) {
    return null;
  }

  if (timestamp.isRecent) {
    return <RecentTimestamp value={value} language={i18n.language} />;
  }

  return <TimestampText timestamp={timestamp} />;
}
