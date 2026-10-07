import { Provider, createStore } from 'jotai';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import ToggleSwitch from '~/components/Nav/SettingsTabs/ToggleSwitch';
import { showTimestampsAtom } from '~/store/showTimestamps';
import MessageTimestamp from '../MessageTimestamp';
import MessageRow from '../MessageRow';

const timestamp = '2025-01-15T12:30:00.000Z';
const messageBody = 'Message body';

function TimestampSetting() {
  return (
    <>
      <ToggleSwitch
        stateAtom={showTimestampsAtom}
        localizationKey="com_nav_show_timestamps"
        switchId="showTimestamps"
      />
      <MessageTimestamp value={timestamp} />
    </>
  );
}

describe('Message timestamps', () => {
  beforeEach(() => {
    localStorage.removeItem('showTimestamps');
  });

  afterEach(() => {
    localStorage.removeItem('showTimestamps');
  });

  it('defaults to off, toggles timestamp visibility, and persists across remounts', async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(
      <Provider store={createStore()}>
        <TimestampSetting />
      </Provider>,
    );
    const toggle = screen.getByRole('switch', { name: 'Show message timestamps' });

    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(container.querySelector('time')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(container.querySelector('time')).toHaveAttribute('dateTime', timestamp);
    expect(localStorage.getItem('showTimestamps')).toBe('true');
    unmount();

    const restored = render(
      <Provider store={createStore()}>
        <TimestampSetting />
      </Provider>,
    );
    const restoredToggle = screen.getByRole('switch', { name: 'Show message timestamps' });

    await waitFor(() => expect(restoredToggle).toHaveAttribute('aria-checked', 'true'));
    expect(restored.container.querySelector('time')).toBeInTheDocument();

    await user.click(restoredToggle);

    expect(restored.container.querySelector('time')).not.toBeInTheDocument();
    expect(localStorage.getItem('showTimestamps')).toBe('false');
  });

  it.each([true, false])(
    'renders a visible timestamp for isCreatedByUser=%s',
    (isCreatedByUser) => {
      const store = createStore();
      store.set(showTimestampsAtom, true);
      const { container } = render(
        <Provider store={store}>
          <MessageRow
            label={isCreatedByUser ? 'You' : 'Assistant'}
            icon={null}
            footer={null}
            timestamp={timestamp}
            isCreatedByUser={isCreatedByUser}
          >
            {messageBody}
          </MessageRow>
        </Provider>,
      );

      const time = container.querySelector('time');
      expect(time).toBeVisible();
      expect(time?.closest('.sr-only')).toBeNull();
      expect(time?.className).not.toContain('opacity-0');
    },
  );

  it.each([undefined, null, 'invalid'])('omits missing or invalid timestamps: %s', (value) => {
    const store = createStore();
    store.set(showTimestampsAtom, true);
    const { container } = render(
      <Provider store={store}>
        <MessageTimestamp value={value} />
      </Provider>,
    );

    expect(container.querySelector('time')).not.toBeInTheDocument();
  });
});
