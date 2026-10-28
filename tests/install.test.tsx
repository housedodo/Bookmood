import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallApp from '../src/components/InstallApp';
import { captureInstallPrompt } from '../src/lib/install';

captureInstallPrompt();

/** What Chrome on Android sends when the app can be installed. */
function fireInstallPrompt(outcome: 'accepted' | 'dismissed') {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(async () => {}),
    userChoice: Promise.resolve({ outcome }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe('Install the app', () => {
  it('shows instructions when the browser offers no install dialog', () => {
    render(<InstallApp />);
    expect(screen.getByText(/Install app/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens the real install dialog on Android and says when it is installed', async () => {
    render(<InstallApp />);
    const event = fireInstallPrompt('accepted');
    expect(event.defaultPrevented).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Install ShelfScan' }));
    expect(event.prompt).toHaveBeenCalled();
    expect(await screen.findByText(/installed on this phone/)).toBeInTheDocument();
  });
});
