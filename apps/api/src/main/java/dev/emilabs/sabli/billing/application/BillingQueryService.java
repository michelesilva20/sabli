package dev.emilabs.sabli.billing.application;

import dev.emilabs.sabli.billing.domain.Bill;
import dev.emilabs.sabli.billing.domain.BillKind;
import dev.emilabs.sabli.billing.domain.BillPayment;
import dev.emilabs.sabli.billing.persistence.BillPaymentRepository;
import dev.emilabs.sabli.billing.persistence.BillRepository;
import dev.emilabs.sabli.dining.domain.DiningTable;
import dev.emilabs.sabli.dining.persistence.DiningTableRepository;
import dev.emilabs.sabli.orders.domain.Order;
import dev.emilabs.sabli.orders.persistence.OrderRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BillingQueryService {

  private final BillingAccess access;
  private final BillingCommandService commands;
  private final BillRepository bills;
  private final BillPaymentRepository payments;
  private final OrderRepository orders;
  private final DiningTableRepository tables;

  public BillingQueryService(
      BillingAccess access,
      BillingCommandService commands,
      BillRepository bills,
      BillPaymentRepository payments,
      OrderRepository orders,
      DiningTableRepository tables) {
    this.access = access;
    this.commands = commands;
    this.bills = bills;
    this.payments = payments;
    this.orders = orders;
    this.tables = tables;
  }

  @Transactional
  public BillView byService(UUID userId, UUID establishmentId, UUID tableServiceId) {
    Bill bill = commands.ensureTableBill(userId, establishmentId, tableServiceId);
    return view(bill);
  }

  @Transactional
  public BillView byOrder(UUID userId, UUID establishmentId, UUID orderId) {
    Bill bill = commands.ensureCounterBill(userId, establishmentId, orderId);
    return view(bill);
  }

  @Transactional
  public BillView get(UUID userId, UUID establishmentId, UUID billId) {
    return view(commands.getLocked(userId, establishmentId, billId));
  }

  @Transactional(readOnly = true)
  public List<BillPayment> payments(UUID userId, UUID establishmentId, UUID billId) {
    access.requireRead(userId, establishmentId);
    bills.findByIdAndEstablishmentId(billId, establishmentId).orElseThrow(ApiException::notFound);
    return payments.findByBillIdOrderByRecordedAtAscIdAsc(billId);
  }

  private BillView view(Bill bill) {
    Integer tableNumber = null;
    List<Order> billOrders;
    if (bill.kind() == BillKind.TABLE) {
      DiningTable table =
          tables
              .findByIdAndEstablishmentId(bill.tableId(), bill.establishmentId())
              .orElseThrow(ApiException::notFound);
      tableNumber = table.number();
      billOrders =
          orders.findByEstablishmentIdAndTableServiceIdOrderByPlacedAtAscIdAsc(
              bill.establishmentId(), bill.tableServiceId());
    } else {
      Order order =
          orders.findByIdAndEstablishmentId(bill.orderId(), bill.establishmentId()).orElseThrow(ApiException::notFound);
      billOrders = List.of(order);
    }
    return new BillView(bill, tableNumber, billOrders, payments.findByBillIdOrderByRecordedAtAscIdAsc(bill.id()));
  }

  public record BillView(Bill bill, Integer tableNumber, List<Order> orders, List<BillPayment> payments) {}
}
