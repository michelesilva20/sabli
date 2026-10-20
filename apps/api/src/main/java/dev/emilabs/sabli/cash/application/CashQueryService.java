package dev.emilabs.sabli.cash.application;

import dev.emilabs.sabli.billing.application.BillingAccess;
import dev.emilabs.sabli.cash.domain.CashMovement;
import dev.emilabs.sabli.cash.domain.CashSession;
import dev.emilabs.sabli.cash.domain.CashSessionStatus;
import dev.emilabs.sabli.cash.persistence.CashMovementRepository;
import dev.emilabs.sabli.cash.persistence.CashSessionRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CashQueryService {

  private final BillingAccess access;
  private final CashSessionRepository sessions;
  private final CashMovementRepository movements;

  public CashQueryService(
      BillingAccess access, CashSessionRepository sessions, CashMovementRepository movements) {
    this.access = access;
    this.sessions = sessions;
    this.movements = movements;
  }

  @Transactional(readOnly = true)
  public CashSession current(UUID userId, UUID establishmentId) {
    access.requireFinance(userId, establishmentId);
    return sessions
        .findByEstablishmentIdAndStatus(establishmentId, CashSessionStatus.OPEN)
        .orElseThrow(ApiException::notFound);
  }

  @Transactional(readOnly = true)
  public CashSession get(UUID userId, UUID establishmentId, UUID sessionId) {
    access.requireFinance(userId, establishmentId);
    return sessions.findByIdAndEstablishmentId(sessionId, establishmentId).orElseThrow(ApiException::notFound);
  }

  @Transactional(readOnly = true)
  public Page<CashSession> list(UUID userId, UUID establishmentId, int page, int size) {
    access.requireFinance(userId, establishmentId);
    return sessions.findByEstablishmentIdOrderByOpenedAtDescIdDesc(
        establishmentId, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
  }

  @Transactional(readOnly = true)
  public List<CashMovement> movements(UUID sessionId) {
    return movements.findByCashSessionIdOrderByRecordedAtAscIdAsc(sessionId);
  }
}
