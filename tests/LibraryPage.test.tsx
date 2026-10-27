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
    expect(screen.getByText('2 books · 1 unread')).toBeInTheDocument();

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

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const sheet = screen.getByRole('dialog', { name: 'Filter & sort' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Read' }));
    await userEvent.click(within(sheet).getByRole('button', { name: /Show 1 book/ }));
    expect(screen.queryByRole('button', { name: /Book Lovers/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ice & Ember/ })).toBeInTheDocument();
  });

  it('shows one genre at a time with the genre chips', async () => {
    await addBook({ isbn13: '1', title: 'Hockey Hearts', genres: ['Romance'], source: 'manual' });
    await addBook({ isbn13: '2', title: 'Cold Case', genres: ['Thriller'], source: 'manual' });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Filters' }));
    const genreRow = screen.getByRole('group', { name: 'Genre' });

    await userEvent.click(within(genreRow).getByRole('button', { name: /Thriller/ }));
    await userEvent.click(screen.getByRole('button', { name: /Show 1 book/ }));
    expect(screen.queryByRole('button', { name: /Hockey Hearts/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cold Case/ })).toBeInTheDocument();

    // The active filter shows as a pill; removing it brings the shelves back.
    await userEvent.click(screen.getByRole('button', { name: 'Remove filter Thriller' }));
    expect(screen.getByRole('button', { name: /Hockey Hearts/ })).toBeInTheDocument();
  });

  it('has no add button: books come in through the Scan tab', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'Scan a book' })).toHaveAttribute('href', '/scan');
    expect(screen.queryByRole('button', { name: /Add/ })).not.toBeInTheDocument();
  });

  it('shows shelves by default: Reading now, Up next and Finished', async () => {
    await addBook({ isbn13: '1', title: 'Current One', status: 'reading', source: 'manual' });
    await addBook({ isbn13: '2', title: 'Next One', source: 'manual' });
    await addBook({ isbn13: '3', title: 'Done One', status: 'read', source: 'manual' });
    renderPage();
    expect(within(await screen.findByRole('region', { name: 'Reading now' })).getByRole('button', { name: /Current One/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Up next' })).getByRole('button', { name: /Next One/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Finished' })).getByRole('button', { name: /Done One/ })).toBeInTheDocument();

    // "See all" switches to a filtered grid.
    await userEvent.click(within(screen.getByRole('region', { name: 'Up next' })).getByRole('button', { name: 'See all' }));
    expect(screen.getByRole('button', { name: 'Remove filter Unread' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
  });

  it('keeps rarely used actions in the ⋯ menu, e.g. delete', async () => {
    await addBook({ isbn13: '1', title: 'Goodbye Book', source: 'manual' });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Goodbye Book/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Goodbye Book' });
    expect(within(dialog).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'More actions' }));
    await userEvent.click(within(dialog).getByRole('menuitem', { name: 'Delete book' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, delete' }));
    await vi.waitFor(async () => expect(await db.books.count()).toBe(0));
  });

  it('shows every book as a spine in the bookcase view', async () => {
    localStorage.clear();
    await addBook({ isbn13: '1', title: 'Spine One', authors: ['A. Writer'], status: 'reading', source: 'manual' });
    await addBook({ isbn13: '2', title: 'Spine Two', source: 'manual' });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Bookcase' }));
    const bookcase = screen.getByRole('region', { name: 'Bookcase' });
    expect(within(bookcase).getByRole('button', { name: 'Spine One by A. Writer, reading now' })).toBeInTheDocument();
    await userEvent.click(within(bookcase).getByRole('button', { name: /Spine Two/ }));
    expect(await screen.findByRole('dialog', { name: 'Spine Two' })).toBeInTheDocument();
  });
});
