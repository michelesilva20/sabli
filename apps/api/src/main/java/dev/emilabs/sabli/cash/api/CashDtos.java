package dev.emilabs.sabli.cash.api;

import dev.emilabs.sabli.billing.domain.PaymentMethod;
import dev.emilabs.sabli.cash.application.CashCommandService.MoveCommand;
import dev.emilabs.sabli.cash.application.CashCommandService.OpenCommand;
import dev.emilabs.sabli.cash.domain.CashDrawer;
import dev.emilabs.sabli.cash.domain.CashMovement;
import dev.emilabs.sabli.cash.domain.CashMovementType;
import dev.emilabs.sabli.cash.domain.CashScope;
import dev.emilabs.sabli.cash.domain.CashSession;
import dev.emilabs.sabli.cash.domain.CashSessionStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;

public final class CashDtos {

  private CashDtos() {}

  public record OpenCashRequest(@NotNull @Min(0) Integer openingFloatCents, @Size(max = 500) String notes) {
    OpenCommand toCommand() {
      return new OpenCommand(openingFloatCents, notes);
    }
  }

  public record CashMovementRequest(
      @NotNull CashMovementType type, @NotNull @Min(1) Integer amountCents, @Size(max = 500) String notes) {
    MoveCommand toCommand() {
      return new MoveCommand(type, amountCents, notes);
    }
  }

  public record CloseCashRequest(Integer version) {}

  public record CashSessionSummary(
      UUID id,
      UUID establishmentId,
      CashScope scope,
      CashSessionStatus status,
      String openedByName,
      Instant openedAt,
      Instant closedAt,
      String closedByName,
      int openingFloatCents,
      int expectedCashCents,
      int version) {
    public static CashSessionSummary from(CashSession session) {
      return new CashSessionSummary(
          session.id(),
          session.establishmentId(),
          session.scope(),
          session.status(),
          session.openedByName(),
          session.openedAt(),
          session.closedAt(),
          session.closedByName(),
          session.openingFloatCents(),
          session.expectedCashCents(),
          session.version());
    }
  }

  public record CashSessionResponse(
      UUID id,
      UUID establishmentId,
      CashScope scope,
      CashSessionStatus status,
      String openedByName,
      Instant openedAt,
      Instant closedAt,
      String closedByName,
      int openingFloatCents,
      int expectedCashCents,
      int drawerCashCents,
      Map<PaymentMethod, Integer> totalsByMethod,
      int version,
      String notes,
      List<CashMovementResponse> movements) {
    public static CashSessionResponse from(CashSession session, List<CashMovement> movements) {
      return new CashSessionResponse(
          session.id(),
          session.establishmentId(),
          session.scope(),
          session.status(),
          session.openedByName(),
          session.openedAt(),
          session.closedAt(),
          session.closedByName(),
          session.openingFloatCents(),
          session.expectedCashCents(),
          CashDrawer.expectedCashCents(movements),
          CashDrawer.salesByMethod(movements),
          session.version(),
          session.notes(),
          movements.stream().map(CashMovementResponse::from).toList());
    }
  }

  public record CashMovementResponse(
      UUID id,
      CashMovementType type,
      PaymentMethod method,
      int amountCents,
      UUID paymentId,
      String recordedByName,
      String notes,
      Instant recordedAt) {
    public static CashMovementResponse from(CashMovement movement) {
      return new CashMovementResponse(
          movement.id(),
          movement.type(),
          movement.method(),
          movement.amountCents(),
          movement.paymentId(),
          movement.recordedByName(),
          movement.notes(),
          movement.recordedAt());
    }
  }

  public record PageResponse<T>(List<T> items, int page, int size, long total) {
    public static <T> PageResponse<T> from(Page<T> page) {
      return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements());
    }
  }
}
