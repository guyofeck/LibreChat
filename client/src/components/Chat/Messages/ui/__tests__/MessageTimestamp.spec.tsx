import { RecoilRoot } from 'recoil';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToggleSwitch from '~/components/Nav/SettingsTabs/ToggleSwitch';
import settings from '~/store/settings';
import MessageTimestamp from '../MessageTimestamp';

jest.mock('~/store', () => ({
  __esModule: true,
  default: jest.requireActual('~/store/settings').default,
}));

jest.mock('~/utils', () => ({
  getMessageTimestamp: jest.requireActual('~/utils/messages').getMessageTimestamp,
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => () => 'Show message timestamps',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en' } }),
}));

const timestamp = '2025-01-02T12:30:00.000Z';

function TimestampSetting({ value = timestamp }: { value?: string }) {
  return (
    <RecoilRoot>
      <ToggleSwitch
        stateAtom={settings.showMessageTimestamps}
        localizationKey="com_ui_show_message_timestamps"
        switchId="showMessageTimestamps"
      />
      <MessageTimestamp value={value} />
    </RecoilRoot>
  );
}

describe('Message timestamp preference', () => {
  beforeEach(() => localStorage.clear());

  it('is off by default', () => {
    const { container } = render(<TimestampSetting />);

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(container.querySelector('time')).not.toBeInTheDocument();
  });

  it('shows timestamps when enabled, persists across remounts, and hides them when disabled', async () => {
    const user = userEvent.setup();
    const first = render(<TimestampSetting />);

    await user.click(screen.getByRole('switch'));

    expect(first.container.querySelector('time')).toHaveAttribute('datetime', timestamp);
    expect(first.container.querySelector('time')).toHaveClass('text-text-secondary');
    expect(first.container.querySelector('time')).not.toHaveClass('opacity-0');
    expect(localStorage.getItem('showMessageTimestamps')).toBe('true');

    first.unmount();
    const second = render(<TimestampSetting />);

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(second.container.querySelector('time')).toBeVisible();

    await user.click(screen.getByRole('switch'));

    expect(second.container.querySelector('time')).not.toBeInTheDocument();
    expect(localStorage.getItem('showMessageTimestamps')).toBe('false');
  });

  it.each(['', 'invalid-date'])('omits unavailable timestamps: %s', (value) => {
    localStorage.setItem('showMessageTimestamps', 'true');
    const { container } = render(<TimestampSetting value={value} />);

    expect(container.querySelector('time')).not.toBeInTheDocument();
  });

  it('renders recent messages with an absolute date tooltip', () => {
    localStorage.setItem('showMessageTimestamps', 'true');
    const value = new Date(Date.now() - 60_000).toISOString();
    const { container } = render(<TimestampSetting value={value} />);
    const time = container.querySelector('time');

    expect(time).toHaveAttribute('datetime', value);
    expect(time).toHaveAttribute('title');
    expect(time).toHaveTextContent('1 minute ago');
  });
});
