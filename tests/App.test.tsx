import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { db } from '../src/data/db';

describe('App scaffold', () => {
  beforeEach(async () => {
    window.location.hash = '';
    await db.books.clear();
  });

  it('shows the library empty state by default', async () => {
    render(<App />);
    expect(await screen.findByText(/Your shelf is empty/)).toBeInTheDocument();
  });

  it('navigates between tabs', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('link', { name: 'Pick' }));
    expect(screen.getByRole('heading', { name: /What are you in the mood for/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Shelf' }));
    await userEvent.click(await screen.findByRole('link', { name: 'Settings' }));
    expect(screen.getByText(/all your data lives only on this device/)).toBeInTheDocument();
  });
});
