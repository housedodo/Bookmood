import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import MoodPicker from '../src/components/MoodPicker';
import { MOODS } from '../src/data/moods';

function Harness() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <MoodPicker
      selected={selected}
      onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((m) => m !== id) : [...s, id]))}
    />
  );
}

describe('MoodPicker', () => {
  it('shows every mood', () => {
    render(<Harness />);
    expect(screen.getAllByRole('button')).toHaveLength(MOODS.length);
  });

  it('selects several moods and deselects them again', async () => {
    render(<Harness />);
    const romance = screen.getByRole('button', { name: /Romance/ });
    const cozy = screen.getByRole('button', { name: /Cozy/ });

    await userEvent.click(romance);
    await userEvent.click(cozy);
    expect(romance).toHaveAttribute('aria-pressed', 'true');
    expect(cozy).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(romance);
    expect(romance).toHaveAttribute('aria-pressed', 'false');
    expect(cozy).toHaveAttribute('aria-pressed', 'true');
  });
});
