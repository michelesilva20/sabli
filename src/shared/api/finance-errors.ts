import { ApiError, ApiUnavailableError } from '@/shared/api/http-client';

export function financeErrorMessage(error: unknown): string {
  if (error instanceof ApiUnavailableError) {
    return 'A confirmação não chegou. Nada foi lançado nesta tela. Tente de novo — a mesma chave será reutilizada.';
  }
  if (!(error instanceof ApiError)) return 'Não foi possível concluir a operação.';
  if (error.code === 'CASH_SESSION_NOT_OPEN') return 'Abra o caixa antes de registrar um pagamento.';
  if (error.code === 'CASH_SESSION_CLOSED') return 'O caixa já está fechado.';
  if (error.code === 'CASH_SESSION_OPEN') return 'Já existe um caixa aberto neste estabelecimento.';
  if (error.code === 'INSUFFICIENT_CASH') return 'A sangria não pode superar o saldo em espécie.';
  if (error.code === 'OVER_REMAINING') return 'PIX e cartão não aceitam valor acima do saldo restante.';
  if (error.code === 'BILL_SETTLED') return 'Esta conta já está quitada.';
  if (error.code === 'EMPTY_TENDER') return 'Informe um valor maior que zero.';
  if (error.code === 'IDEMPOTENCY_CONFLICT') {
    return 'A mesma confirmação foi usada com outro valor. Inicie uma nova tentativa.';
  }
  if (error.code === 'CLOSE_REQUIRES_SETTLEMENT') {
    return 'Quite o saldo restante antes de liberar a mesa.';
  }
  if (error.code === 'PAYMENT_STARTED') {
    return 'Não é possível incluir pedido depois que o pagamento foi iniciado.';
  }
  if (error.code === 'STALE_VERSION') return 'Os dados mudaram no servidor. Atualizamos a tela.';
  if (error.code === 'INVALID_FLOAT') return 'O fundo de troco não pode ser negativo.';
  if (error.code === 'CONTEXT_CHANGED') return 'O estabelecimento mudou. A operação anterior foi cancelada.';
  if (error.code === 'SERVICE_NOT_OPEN') return 'O atendimento não está aberto.';
  if (error.status === 403) return 'Você não pode executar esta operação financeira.';
  return error.message || 'Não foi possível concluir a operação.';
}

export function isAmbiguousPaymentTimeout(error: unknown) {
  return error instanceof ApiUnavailableError;
}
