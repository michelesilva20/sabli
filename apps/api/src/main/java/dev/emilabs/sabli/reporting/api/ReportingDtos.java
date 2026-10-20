package dev.emilabs.sabli.reporting.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class ReportingDtos {

  private ReportingDtos() {}

  public record PeriodMeta(
      LocalDate from,
      LocalDate to,
      String timezone,
      String timezoneSource,
      Instant fromInclusive,
      Instant toExclusive,
      String channel,
      String saleDateField,
      String receiptDateField) {}

  public record OverviewResponse(
      PeriodMeta period,
      long receivedCents,
      long soldCents,
      long salesCount,
      long averageTicketCents,
      String averageTicketUnit,
      long inProductionOrders,
      long occupiedTables,
      long totalTables,
      long pendingBills,
      long pendingCents,
      Map<String, String> metricScope,
      Map<String, String> definitions) {}

  public record DayPoint(LocalDate date, long count, long cents) {}

  public record ChannelPoint(String channel, long count, long cents) {}

  public record SalesResponse(
      PeriodMeta period,
      long salesCount,
      long soldCents,
      long averageTicketCents,
      String averageTicketUnit,
      List<DayPoint> byDay,
      List<ChannelPoint> byChannel) {}

  public record RevenueResponse(
      PeriodMeta period, long receivedCents, long paymentCount, List<DayPoint> byDay) {}

  public record ProductRow(String productId, String productName, long quantity, long soldCents) {}

  public record ProductsResponse(
      PeriodMeta period, long total, int page, int size, List<ProductRow> items) {}

  public record PaymentMethodRow(String method, long count, long receivedCents, int percent) {}

  public record PaymentsResponse(
      PeriodMeta period, long receivedCents, long paymentCount, List<PaymentMethodRow> byMethod) {}

  public record OperationsResponse(
      PeriodMeta period,
      long inProductionOrders,
      long occupiedTables,
      long occupiedOpen,
      long awaitingBill,
      long totalTables,
      long pendingBills,
      long pendingCents,
      long servicesOpenedInPeriod,
      long servicesClosedInPeriod) {}
}
