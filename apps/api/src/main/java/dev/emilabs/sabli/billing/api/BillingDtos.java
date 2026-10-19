package dev.emilabs.sabli.billing.api;

import dev.emilabs.sabli.billing.application.BillingCommandService.PayCommand;
import dev.emilabs.sabli.billing.application.BillingQueryService.BillView;
import dev.emilabs.sabli.billing.domain.Bill;
import dev.emilabs.sabli.billing.domain.BillKind;
import dev.emilabs.sabli.billing.domain.BillPayment;
import dev.emilabs.sabli.billing.domain.BillStatus;
import dev.emilabs.sabli.billing.domain.PaymentCaptureKind;
import dev.emilabs.sabli.billing.domain.PaymentMethod;
import dev.emilabs.sabli.orders.api.OrderDtos.OrderItemResponse;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class BillingDtos {

  private BillingDtos() {}

  public record RegisterPaymentRequest(
      @NotNull PaymentMethod method,
      @NotNull @Min(1) Integer tenderedCents,
      @Size(max = 500) String notes,
      Integer version) {
    PayCommand toCommand() {
      return new PayCommand(method, tenderedCents, notes, version);
    }
  }

  public record BillResponse(
      UUID id,
      UUID establishmentId,
      BillKind kind,
      UUID tableId,
      Integer tableNumber,
      UUID tableServiceId,
      UUID orderId,
      int subtotalCents,
      int discountCents,
      int totalCents,
      int paidCents,
      int remainingCents,
      BillStatus status,
      boolean settled,
      Instant settledAt,
      int version,
      List<BillOrderResponse> orders,
      List<PaymentResponse> payments) {
    public static BillResponse from(BillView view, List<BillOrderResponse> orders) {
      Bill bill = view.bill();
      return new BillResponse(
          bill.id(),
          bill.establishmentId(),
          bill.kind(),
          bill.tableId(),
          view.tableNumber(),
          bill.tableServiceId(),
          bill.orderId(),
          bill.subtotalCents(),
          bill.discountCents(),
          bill.totalCents(),
          bill.paidCents(),
          bill.remainingCents(),
          bill.status(),
          bill.isSettled(),
          bill.settledAt(),
          bill.version(),
          orders,
          view.payments().stream().map(PaymentResponse::from).toList());
    }
  }

  public record BillOrderResponse(
      UUID id,
      int number,
      int subtotalCents,
      int discountCents,
      int totalCents,
      Instant placedAt,
      List<OrderItemResponse> items) {}

  public record PaymentResponse(
      UUID id,
      UUID billId,
      UUID cashSessionId,
      PaymentMethod method,
      PaymentCaptureKind captureKind,
      int tenderedCents,
      int appliedCents,
      int changeCents,
      String recordedByName,
      String notes,
      Instant recordedAt,
      int version) {
    public static PaymentResponse from(BillPayment payment) {
      return new PaymentResponse(
          payment.id(),
          payment.billId(),
          payment.cashSessionId(),
          payment.method(),
          payment.captureKind(),
          payment.tenderedCents(),
          payment.appliedCents(),
          payment.changeCents(),
          payment.recordedByName(),
          payment.notes(),
          payment.recordedAt(),
          payment.version());
    }
  }

  public record PaymentPageResponse(List<PaymentResponse> items) {}
}
