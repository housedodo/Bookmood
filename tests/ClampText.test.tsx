import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClampText from '../src/components/ClampText';

// jsdom has no layout, so fake "this text is taller than 3 lines".
function fakeHeights(scrollHeight: number, clientHeight: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
}

afterEach(() => vi.restoreAllMocks());

describe('ClampText', () => {
  it('clamps long text to 3 lines and expands on "more"', async () => {
    fakeHeights(200, 66);
    render(<ClampText text="A long summary…" />);
    const text = screen.getByText('A long summary…');
    expect(text).toHaveClass('clamp-3');

    await userEvent.click(screen.getByRole('button', { name: 'more' }));
    expect(text).not.toHaveClass('clamp-3');
    await userEvent.click(screen.getByRole('button', { name: 'less' }));
    expect(text).toHaveClass('clamp-3');
  });

  it('shows no button when the text fits', () => {
    fakeHeights(40, 40);
    render(<ClampText text="Short." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
