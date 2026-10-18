import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Dialog } from '@/design-system/components/dialog';
import { renderWithProviders } from '@/test/render';

function DialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir diálogo
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Confirmar mesa"
        description="Detalhe da mesa 4"
      >
        <p>Conteúdo do diálogo</p>
      </Dialog>
    </>
  );
}

describe('dialog', () => {
  it('abre, expõe o título e fecha com Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DialogExample />);
    await user.click(screen.getByRole('button', { name: 'Abrir diálogo' }));
    expect(screen.getByRole('dialog', { name: 'Confirmar mesa' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
