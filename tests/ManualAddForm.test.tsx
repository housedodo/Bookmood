import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManualAddForm from '../src/components/ManualAddForm';
import { db } from '../src/data/db';

beforeEach(async () => {
  await db.books.clear();
});

describe('ManualAddForm (opened by the Scan page when a book isn’t found online)', () => {
  it('saves a book with only a title, keeping the scanned ISBN', async () => {
    const onAdded = vi.fn();
    render(<ManualAddForm initialIsbn="9781804990780" onAdded={onAdded} onDuplicate={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/Title/), 'My Hand Book');
    await userEvent.click(screen.getByRole('button', { name: 'Add to my shelf' }));

    await vi.waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect((await db.books.toArray())[0]).toMatchObject({ title: 'My Hand Book', isbn13: '9781804990780', source: 'manual', status: 'unread' });
  });
});
