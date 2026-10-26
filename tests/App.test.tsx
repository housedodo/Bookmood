import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

describe('App scaffold', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('shows the library empty state by default', () => {
    render(<App />);
    expect(screen.getByText(/Your shelf is empty/)).toBeInTheDocument();
  });

  it('navigates between tabs', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('link', { name: 'Pick' }));
    expect(screen.getByRole('heading', { name: /What are you in the mood for/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Settings' }));
    expect(screen.getByText(/all your data lives only on this device/)).toBeInTheDocument();
  });
});
