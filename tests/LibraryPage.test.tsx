import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { addBook, db } from '../src/data/db';
import LibraryPage from '../src/pages/LibraryPage';

const renderPage = () => render(<MemoryRouter><LibraryPage /></MemoryRouter>);

beforeEach(async () => {
  await db.books.clear();
});

describe('LibraryPage', () => {
  it('shows the empty state', async () => {
    renderPage();
    expect(await screen.findByText(/Your shelf is empty/)).toBeInTheDocument();
  });

  it('renders books and opens the detail sheet', async () => {
    await addBook({ isbn13: '9780593334836', title: 'Book Lovers', authors: ['Emily Henry'], source: 'manual' });
    await addBook({ isbn13: '9780306406157', title: 'Ice & Ember', source: 'manual', status: 'read' });
    renderPage();

    expect(await screen.findByRole('button', { name: /Book Lovers/ })).toBeInTheDocument();
    expect(screen.getByText(/2 books, 1 waiting to be read/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Book Lovers/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Book Lovers' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reading' }));
    await vi.waitFor(async () => expect((await db.books.toArray()).find((b) => b.title === 'Book Lovers')?.status).toBe('reading'));
  });

  it('filters by status', async () => {
    await addBook({ isbn13: '9780593334836', title: 'Book Lovers', source: 'manual' });
    await addBook({ isbn13: '9780306406157', title: 'Ice & Ember', source: 'manual', status: 'read' });
    renderPage();
    await screen.findByRole('button', { name: /Book Lovers/ });

    await userEvent.click(within(screen.getByRole('group', { name: 'Reading status' })).getByRole('button', { name: 'Read' }));
    expect(screen.queryByRole('button', { name: /Book Lovers/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ice & Ember/ })).toBeInTheDocument();
  });

  it('shows one genre at a time with the genre chips', async () => {
    await addBook({ isbn13: '1', title: 'Hockey Hearts', genres: ['Romance'], source: 'manual' });
    await addBook({ isbn13: '2', title: 'Cold Case', genres: ['Thriller'], source: 'manual' });
    renderPage();
    const genreRow = await screen.findByRole('group', { name: 'Genre' });

    await userEvent.click(within(genreRow).getByRole('button', { name: /Thriller/ }));
    expect(screen.queryByRole('button', { name: /Hockey Hearts/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cold Case/ })).toBeInTheDocument();

    // Tapping it again shows everything.
    await userEvent.click(within(genreRow).getByRole('button', { name: /Thriller/ }));
    expect(screen.getByRole('button', { name: /Hockey Hearts/ })).toBeInTheDocument();
  });

  it('adds a book by hand', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Add by hand' }));
    await userEvent.type(screen.getByLabelText(/Title/), 'My Hand Book');
    await userEvent.click(screen.getByRole('button', { name: 'Add to my shelf' }));
    expect(await screen.findByRole('button', { name: /My Hand Book/ })).toBeInTheDocument();
    expect((await db.books.toArray())[0]).toMatchObject({ title: 'My Hand Book', source: 'manual', status: 'unread' });
  });
});
