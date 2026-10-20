package dev.emilabs.sabli.billing.application;

import dev.emilabs.sabli.billing.domain.Bill;
import dev.emilabs.sabli.billing.domain.BillKind;
import dev.emilabs.sabli.billing.domain.BillPayment;
import dev.emilabs.sabli.billing.domain.PaymentMethod;
import dev.emilabs.sabli.billing.domain.Tender;
import dev.emilabs.sabli.billing.persistence.BillPaymentRepository;
import dev.emilabs.sabli.billing.persistence.BillRepository;
import dev.emilabs.sabli.cash.domain.CashDrawer;
import dev.emilabs.sabli.cash.domain.CashMovement;
import dev.emilabs.sabli.cash.domain.CashSession;
import dev.emilabs.sabli.cash.domain.CashSessionStatus;
import dev.emilabs.sabli.cash.persistence.CashMovementRepository;
import dev.emilabs.sabli.cash.persistence.CashSessionRepository;
import dev.emilabs.sabli.dining.domain.TableService;
import dev.emilabs.sabli.dining.persistence.TableServiceRepository;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.UserAccount;
import dev.emilabs.sabli.identity.persistence.UserAccountRepository;
import dev.emilabs.sabli.identity.security.TokenHasher;
import dev.emilabs.sabli.orders.domain.Order;
import dev.emilabs.sabli.orders.persistence.OrderRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class BillingCommandService {

  private final BillingAccess access;
  private final BillRepository bills;
  private final BillPaymentRepository payments;
  private final OrderRepository orders;
  private final TableServiceRepository services;
  private final CashSessionRepository cashSessions;
  private final CashMovementRepository cashMovements;
  private final UserAccountRepository users;
  private final TransactionTemplate transactions;

  public BillingCommandService(
      BillingAccess access,
      BillRepository bills,
      BillPaymentRepository payments,
      OrderRepository orders,
      TableServiceRepository services,
      CashSessionRepository cashSessions,
      CashMovementRepository cashMovements,
      UserAccountRepository users,
      PlatformTransactionManager transactionManager) {
    this.access = access;
    this.bills = bills;
    this.payments = payments;
    this.orders = orders;
    this.services = services;
    this.cashSessions = cashSessions;
    this.cashMovements = cashMovements;
    this.users = users;
    this.transactions = new TransactionTemplate(transactionManager);
  }

  public Bill requireSettledForClose(UUID establishmentId, TableService service) {
    Bill bill = ensureLockedTableBill(service.establishmentId(), service);
    if (bill.totalCents() <= 0 || bill.remainingCents() != 0 || !bill.isSettled()) {
      throw ApiException.conflict(
          "CLOSE_REQUIRES_SETTLEMENT", "O atendimento só pode ser encerrado com a conta quitada.");
    }
    return bill;
  }

  public Bill requireEmptyForClose(UUID establishmentId, TableService service) {
    Bill bill = ensureLockedTableBill(service.establishmentId(), service);
    boolean hasOrders =
        orders.existsByEstablishmentIdAndTableServiceId(establishmentId, service.id());
    if (hasOrders || bill.totalCents() > 0) {
      throw ApiException.conflict(
          "CLOSE_HAS_CONSUMPTION",
          "Há pedidos confirmados neste atendimento. Quite a conta antes de encerrar.");
    }
    if (bill.paidCents() > 0 || payments.existsByBillId(bill.id())) {
      throw ApiException.conflict(
          "CLOSE_HAS_PAYMENTS", "Há pagamentos registrados. Encerrar sem consumo não é permitido.");
    }
    if (bill.isSettled()) {
      throw ApiException.conflict(
          "CLOSE_REQUIRES_SETTLEMENT", "O atendimento só pode ser encerrado com a conta quitada.");
    }
    return bill;
  }

  public Bill ensureTableBill(UUID userId, UUID establishmentId, UUID tableServiceId) {
    Establishment establishment = access.requireRead(userId, establishmentId);
    TableService service =
        services
            .lockByIdAndEstablishmentId(tableServiceId, establishment.id())
            .orElseThrow(ApiException::notFound);
    return ensureLockedTableBill(establishment.id(), service);
  }

  public Bill ensureCounterBill(UUID userId, UUID establishmentId, UUID orderId) {
    Establishment establishment = access.requireRead(userId, establishmentId);
    return ensureLockedCounterBill(establishment.id(), orderId);
  }

  public Bill getLocked(UUID userId, UUID establishmentId, UUID billId) {
    access.requireRead(userId, establishmentId);
    Bill bill = bills.lockByIdAndEstablishmentId(billId, establishmentId).orElseThrow(ApiException::notFound);
    refresh(bill);
    return bill;
  }

  public PayResult pay(UUID userId, UUID establishmentId, UUID billId, String idempotencyKey, PayCommand command) {
    access.requireFinance(userId, establishmentId);
    String key = requireKey(idempotencyKey);
    String hash = hash(command);
    PayResult replay = replayIfPresent(establishmentId, userId, key, hash);
    if (replay != null) {
      return replay;
    }
    try {
      return transactions.execute(status -> payNew(userId, establishmentId, billId, key, hash, command));
    } catch (RuntimeException ex) {
      PayResult recovered = waitForReplay(establishmentId, userId, key, hash);
      if (recovered != null) {
        return recovered;
      }
      throw ex;
    }
  }

  private PayResult payNew(
      UUID userId, UUID establishmentId, UUID billId, String key, String hash, PayCommand command) {
    PayResult replay = replayIfPresent(establishmentId, userId, key, hash);
    if (replay != null) {
      return replay;
    }
    Bill preview =
        bills.findByIdAndEstablishmentId(billId, establishmentId).orElseThrow(ApiException::notFound);
    TableService service = null;
    if (preview.kind() == BillKind.TABLE) {
      service =
          services
              .lockByIdAndEstablishmentId(preview.tableServiceId(), establishmentId)
              .orElseThrow(ApiException::notFound);
      if (!service.isActive()) {
        throw ApiException.unprocessable("SERVICE_NOT_OPEN", "O atendimento não está aberto.");
      }
    }
    Bill bill = bills.lockByIdAndEstablishmentId(billId, establishmentId).orElseThrow(ApiException::notFound);
    refresh(bill);
    if (command.version() != null && command.version() != bill.version()) {
      throw ApiException.staleVersion();
    }
    CashSession session =
        cashSessions
            .lockByEstablishmentIdAndStatus(establishmentId, CashSessionStatus.OPEN)
            .orElseThrow(
                () ->
                    ApiException.unprocessable(
                        "CASH_SESSION_NOT_OPEN", "Abra o caixa antes de registrar um pagamento."));
    Tender.Result tender = Tender.apply(command.method(), bill.remainingCents(), command.tenderedCents());
    UserAccount user = users.findById(userId).orElseThrow(ApiException::notFound);
    BillPayment payment =
        payments.saveAndFlush(
            BillPayment.record(
                bill.id(),
                bill.establishmentId(),
                bill.organizationId(),
                session.id(),
                command.method(),
                tender,
                user.id(),
                user.name(),
                command.notes(),
                key,
                hash));
    bill.applyPaid(bill.paidCents() + tender.appliedCents());
    if (service != null && !service.billingStarted()) {
      service.markBillingStarted();
    }
    cashMovements.save(
        CashMovement.sale(
            session.id(),
            session.establishmentId(),
            session.organizationId(),
            command.method(),
            tender.appliedCents(),
            payment.id(),
            user.id(),
            user.name()));
    session.syncExpectedCash(CashDrawer.expectedCashCents(cashMovements.findByCashSessionIdOrderByRecordedAtAscIdAsc(session.id())));
    return new PayResult(bill, payment, true);
  }

  Bill ensureLockedTableBill(UUID establishmentId, TableService service) {
    Bill existing =
        bills.lockByTableServiceIdAndEstablishmentId(service.id(), establishmentId).orElse(null);
    if (existing != null) {
      refresh(existing);
      return existing;
    }
    Money money = moneyForService(establishmentId, service.id());
    try {
      Bill created =
          bills.saveAndFlush(
              Bill.openTable(
                  service.establishmentId(),
                  service.organizationId(),
                  service.tableId(),
                  service.id(),
                  money.subtotalCents(),
                  money.discountCents(),
                  money.totalCents()));
      return created;
    } catch (DataIntegrityViolationException ignored) {
      Bill raced =
          bills.lockByTableServiceIdAndEstablishmentId(service.id(), establishmentId).orElseThrow(ApiException::notFound);
      refresh(raced);
      return raced;
    }
  }

  Bill ensureLockedCounterBill(UUID establishmentId, UUID orderId) {
    Bill existing = bills.lockByOrderIdAndEstablishmentId(orderId, establishmentId).orElse(null);
    if (existing != null) {
      refresh(existing);
      return existing;
    }
    Order order = orders.findByIdAndEstablishmentId(orderId, establishmentId).orElseThrow(ApiException::notFound);
    try {
      return bills.saveAndFlush(
          Bill.openCounter(
              order.establishmentId(),
              order.organizationId(),
              order.id(),
              order.subtotalCents(),
              order.discountCents(),
              order.totalCents()));
    } catch (DataIntegrityViolationException ignored) {
      Bill raced = bills.lockByOrderIdAndEstablishmentId(orderId, establishmentId).orElseThrow(ApiException::notFound);
      refresh(raced);
      return raced;
    }
  }

  private void refresh(Bill bill) {
    if (bill.paymentStarted()) {
      return;
    }
    if (bill.kind() == BillKind.TABLE) {
      Money money = moneyForService(bill.establishmentId(), bill.tableServiceId());
      bill.refreshTotals(money.subtotalCents(), money.discountCents(), money.totalCents());
      return;
    }
    Order order =
        orders.findByIdAndEstablishmentId(bill.orderId(), bill.establishmentId()).orElseThrow(ApiException::notFound);
    bill.refreshTotals(order.subtotalCents(), order.discountCents(), order.totalCents());
  }

  private Money moneyForService(UUID establishmentId, UUID tableServiceId) {
    List<Order> lines =
        orders.findByEstablishmentIdAndTableServiceIdOrderByPlacedAtAscIdAsc(establishmentId, tableServiceId);
    int subtotal = 0;
    int discount = 0;
    int total = 0;
    for (Order order : lines) {
      subtotal += order.subtotalCents();
      discount += order.discountCents();
      total += order.totalCents();
    }
    return new Money(subtotal, discount, total);
  }

  private PayResult waitForReplay(UUID establishmentId, UUID userId, String key, String hash) {
    for (int attempt = 0; attempt < 20; attempt++) {
      PayResult recovered = replayIfPresent(establishmentId, userId, key, hash);
      if (recovered != null) {
        return recovered;
      }
      try {
        Thread.sleep(25);
      } catch (InterruptedException interrupted) {
        Thread.currentThread().interrupt();
        return null;
      }
    }
    return replayIfPresent(establishmentId, userId, key, hash);
  }

  private PayResult replayIfPresent(UUID establishmentId, UUID userId, String key, String hash) {
    BillPayment existing =
        payments
            .findByEstablishmentIdAndRecordedByUserIdAndIdempotencyKey(establishmentId, userId, key)
            .orElse(null);
    if (existing == null) {
      return null;
    }
    if (!existing.idempotencyHash().equals(hash)) {
      throw ApiException.conflict("IDEMPOTENCY_CONFLICT", "A mesma chave foi usada com outro pagamento.");
    }
    Bill bill =
        bills.findByIdAndEstablishmentId(existing.billId(), establishmentId).orElseThrow(ApiException::notFound);
    return new PayResult(bill, existing, false);
  }

  private static String requireKey(String idempotencyKey) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw ApiException.badRequest("Informe a chave de idempotência.");
    }
    String key = idempotencyKey.trim();
    if (key.length() > 80) {
      throw ApiException.badRequest("A chave de idempotência é longa demais.");
    }
    return key;
  }

  private static String hash(PayCommand command) {
    String notes = command.notes() == null ? "" : command.notes().trim();
    return TokenHasher.sha256(command.method() + "|" + command.tenderedCents() + "|" + notes);
  }

  public record PayCommand(PaymentMethod method, int tenderedCents, String notes, Integer version) {}

  public record PayResult(Bill bill, BillPayment payment, boolean created) {}

  private record Money(int subtotalCents, int discountCents, int totalCents) {}
}
