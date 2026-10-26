import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { addBook, db } from '../src/data/db';
import PickPage from '../src/pages/PickPage';

const renderPage = () => render(<MemoryRouter><PickPage /></MemoryRouter>);

beforeEach(async () => {
  await db.books.clear();
});

describe('PickPage', () => {
  it('suggests matching unread books with a reason, and Start reading updates the status', async () => {
    await addBook({ isbn13: '1', title: 'Hockey Hearts', subjects: ['Romance', 'Sports romance'], source: 'manual' });
    await addBook({ isbn13: '2', title: 'Cold Case', subjects: ['Mystery'], source: 'manual' });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Romance/ }));
    const suggestions = screen.getByRole('region', { name: 'Suggestions' });
    expect(within(suggestions).getByText('Hockey Hearts', { selector: 'strong' })).toBeInTheDocument();
    expect(within(suggestions).queryByText('Cold Case', { selector: 'strong' })).not.toBeInTheDocument();
    expect(within(suggestions).getByText('Matches: romance, sports romance')).toBeInTheDocument();

    await userEvent.click(within(suggestions).getByRole('button', { name: 'Start reading' }));
    await vi.waitFor(async () => expect((await db.books.get({ isbn13: '1' }))?.status).toBe('reading'));
  });

  it('shows the friendly message when nothing matches', async () => {
    await addBook({ isbn13: '3', title: 'Cold Case', subjects: ['Mystery'], source: 'manual' });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Spooky/ }));
    expect(screen.getByText(/Nothing in your unread pile matches this mood yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Surprise me' })).toBeInTheDocument();
  });

  it('lists unread books whose mood it can’t tell, so they aren’t invisible', async () => {
    await addBook({ isbn13: '4', title: 'No One Saw a Thing', authors: ['Andrea Mara'], source: 'openlibrary' });
    await addBook({ isbn13: '5', title: 'Cold Case', subjects: ['Mystery'], source: 'manual' });
    renderPage();
    const row = await screen.findByRole('region', { name: 'Books with unknown mood' });
    expect(within(row).getByText(/this book/)).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /No One Saw a Thing/ })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /Cold Case/ })).not.toBeInTheDocument();
  });
});
