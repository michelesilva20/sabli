package dev.emilabs.sabli.cash.application;

import dev.emilabs.sabli.billing.application.BillingAccess;
import dev.emilabs.sabli.cash.domain.CashDrawer;
import dev.emilabs.sabli.cash.domain.CashMovement;
import dev.emilabs.sabli.cash.domain.CashMovementType;
import dev.emilabs.sabli.cash.domain.CashSession;
import dev.emilabs.sabli.cash.domain.CashSessionStatus;
import dev.emilabs.sabli.cash.persistence.CashMovementRepository;
import dev.emilabs.sabli.cash.persistence.CashSessionRepository;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.UserAccount;
import dev.emilabs.sabli.identity.persistence.UserAccountRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CashCommandService {

  private final BillingAccess access;
  private final CashSessionRepository sessions;
  private final CashMovementRepository movements;
  private final UserAccountRepository users;

  public CashCommandService(
      BillingAccess access,
      CashSessionRepository sessions,
      CashMovementRepository movements,
      UserAccountRepository users) {
    this.access = access;
    this.sessions = sessions;
    this.movements = movements;
    this.users = users;
  }

  @Transactional
  public CashSession open(UUID userId, UUID establishmentId, OpenCommand command) {
    Establishment establishment = access.requireFinance(userId, establishmentId);
    if (command.openingFloatCents() < 0) {
      throw ApiException.unprocessable("INVALID_FLOAT", "O fundo de troco não pode ser negativo.");
    }
    if (sessions.lockByEstablishmentIdAndStatus(establishment.id(), CashSessionStatus.OPEN).isPresent()) {
      throw ApiException.conflict("CASH_SESSION_OPEN", "Já existe um caixa aberto neste estabelecimento.");
    }
    UserAccount user = users.findById(userId).orElseThrow(ApiException::notFound);
    try {
      CashSession session =
          sessions.saveAndFlush(
              CashSession.open(
                  establishment.id(),
                  establishment.organizationId(),
                  user.id(),
                  user.name(),
                  command.openingFloatCents(),
                  command.notes()));
      movements.save(
          CashMovement.opening(
              session.id(),
              session.establishmentId(),
              session.organizationId(),
              command.openingFloatCents(),
              user.id(),
              user.name()));
      return session;
    } catch (DataIntegrityViolationException ignored) {
      throw ApiException.conflict("CASH_SESSION_OPEN", "Já existe um caixa aberto neste estabelecimento.");
    }
  }

  @Transactional
  public CashSession move(UUID userId, UUID establishmentId, UUID sessionId, MoveCommand command) {
    access.requireFinance(userId, establishmentId);
    if (command.amountCents() < 1) {
      throw ApiException.unprocessable("EMPTY_TENDER", "Informe um valor maior que zero.");
    }
    if (command.type() != CashMovementType.SUPPLY && command.type() != CashMovementType.BLEED) {
      throw ApiException.badRequest("Use SUPPLY ou BLEED para movimentar o caixa.");
    }
    CashSession session = lockSession(establishmentId, sessionId);
    requireOpen(session);
    UserAccount user = users.findById(userId).orElseThrow(ApiException::notFound);
    List<CashMovement> current = movements.findByCashSessionIdOrderByRecordedAtAscIdAsc(session.id());
    int expected = CashDrawer.expectedCashCents(current);
    if (command.type() == CashMovementType.BLEED && command.amountCents() > expected) {
      throw ApiException.unprocessable("INSUFFICIENT_CASH", "A sangria não pode superar o saldo em espécie.");
    }
    if (command.type() == CashMovementType.SUPPLY) {
      movements.save(
          CashMovement.supply(
              session.id(),
              session.establishmentId(),
              session.organizationId(),
              command.amountCents(),
              user.id(),
              user.name(),
              command.notes()));
    } else {
      movements.save(
          CashMovement.bleed(
              session.id(),
              session.establishmentId(),
              session.organizationId(),
              command.amountCents(),
              user.id(),
              user.name(),
              command.notes()));
    }
    current = movements.findByCashSessionIdOrderByRecordedAtAscIdAsc(session.id());
    session.syncExpectedCash(CashDrawer.expectedCashCents(current));
    return session;
  }

  @Transactional
  public CashSession close(UUID userId, UUID establishmentId, UUID sessionId, Integer version) {
    access.requireFinance(userId, establishmentId);
    CashSession session = lockSession(establishmentId, sessionId);
    requireOpen(session);
    if (version != null && version != session.version()) {
      throw ApiException.staleVersion();
    }
    UserAccount user = users.findById(userId).orElseThrow(ApiException::notFound);
    int expected =
        CashDrawer.expectedCashCents(movements.findByCashSessionIdOrderByRecordedAtAscIdAsc(session.id()));
    session.close(user.id(), user.name(), expected);
    return session;
  }

  private CashSession lockSession(UUID establishmentId, UUID sessionId) {
    return sessions.lockByIdAndEstablishmentId(sessionId, establishmentId).orElseThrow(ApiException::notFound);
  }

  private static void requireOpen(CashSession session) {
    if (!session.isOpen()) {
      throw ApiException.unprocessable("CASH_SESSION_CLOSED", "O caixa já está fechado.");
    }
  }

  public record OpenCommand(int openingFloatCents, String notes) {}

  public record MoveCommand(CashMovementType type, int amountCents, String notes) {}
}
