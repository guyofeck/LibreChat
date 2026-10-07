import { RecoilRoot, useRecoilState } from 'recoil';
import { fireEvent, render, screen } from '@testing-library/react';
import settings from '~/store/settings';
import MessageTimestamp from '../MessageTimestamp';
import MessageRow from '../MessageRow';

const timestamp = '2026-01-01T12:00:00.000Z';

function Toggle() {
  const [enabled, setEnabled] = useRecoilState(settings.showMessageTimestamps);
  return <button onClick={() => setEnabled(!enabled)}>Toggle timestamps</button>;
}

function Fixture({ value = timestamp }: { value?: string | null }) {
  return (
    <RecoilRoot>
      <Toggle />
      <MessageTimestamp value={value} />
    </RecoilRoot>
  );
}

describe('MessageTimestamp preference', () => {
  beforeEach(() => localStorage.clear());

  it('is off by default, updates immediately, and persists across remounts', () => {
    const first = render(<Fixture />);
    expect(first.container.querySelector('time')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle timestamps' }));
    expect(first.container.querySelector('time')).toHaveAttribute('datetime', timestamp);
    expect(localStorage.getItem('showMessageTimestamps')).toBe('true');

    first.unmount();
    const second = render(<Fixture />);
    expect(second.container.querySelector('time')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle timestamps' }));
    expect(second.container.querySelector('time')).toBeNull();
    expect(localStorage.getItem('showMessageTimestamps')).toBe('false');

    second.unmount();
    const third = render(<Fixture />);
    expect(third.container.querySelector('time')).toBeNull();
  });

  it.each([null, '', 'invalid date'])('omits unavailable dates: %s', (value) => {
    localStorage.setItem('showMessageTimestamps', 'true');
    const { container } = render(<Fixture value={value} />);
    expect(container.querySelector('time')).toBeNull();
  });

  it.each([true, false])('renders visible timestamps for user=%s', (isCreatedByUser) => {
    localStorage.setItem('showMessageTimestamps', 'true');
    const { container } = render(
      <RecoilRoot>
        <MessageRow
          label={isCreatedByUser ? 'You' : 'Assistant'}
          icon={null}
          footer={null}
          timestamp={timestamp}
          isCreatedByUser={isCreatedByUser}
        >
          Message body
        </MessageRow>
      </RecoilRoot>,
    );
    const time = container.querySelector('time');
    expect(time).toBeVisible();
    expect(time?.closest('.sr-only')).toBeNull();
    expect(time).not.toHaveClass('[@media(hover:hover)]:opacity-0');
  });

  it('renders relative time for recent messages with the absolute date as a title', () => {
    localStorage.setItem('showMessageTimestamps', 'true');
    const value = new Date(Date.now() - 5 * 60_000).toISOString();
    const { container } = render(<Fixture value={value} />);
    const time = container.querySelector('time');
    expect(time).toHaveAttribute('datetime', value);
    expect(time).toHaveAttribute('title');
    expect(time).toHaveTextContent('5 minutes ago');
  });
});
