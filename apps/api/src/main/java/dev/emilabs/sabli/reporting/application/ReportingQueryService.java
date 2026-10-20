package dev.emilabs.sabli.reporting.application;

import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.reporting.api.ReportingDtos.ChannelPoint;
import dev.emilabs.sabli.reporting.api.ReportingDtos.DayPoint;
import dev.emilabs.sabli.reporting.api.ReportingDtos.OperationsResponse;
import dev.emilabs.sabli.reporting.api.ReportingDtos.OverviewResponse;
import dev.emilabs.sabli.reporting.api.ReportingDtos.PaymentMethodRow;
import dev.emilabs.sabli.reporting.api.ReportingDtos.PaymentsResponse;
import dev.emilabs.sabli.reporting.api.ReportingDtos.PeriodMeta;
import dev.emilabs.sabli.reporting.api.ReportingDtos.ProductRow;
import dev.emilabs.sabli.reporting.api.ReportingDtos.ProductsResponse;
import dev.emilabs.sabli.reporting.api.ReportingDtos.RevenueResponse;
import dev.emilabs.sabli.reporting.api.ReportingDtos.SalesResponse;
import dev.emilabs.sabli.shared.error.ApiException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class ReportingQueryService {

  private static final int MAX_PAGE_SIZE = 50;
  private static final List<String> PAYMENT_METHODS = List.of("CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD");
  private static final List<String> CHANNELS = List.of("TABLE", "COUNTER");

  private final ReportingAccess access;
  private final JdbcClient jdbc;

  public ReportingQueryService(ReportingAccess access, JdbcClient jdbc) {
    this.access = access;
    this.jdbc = jdbc;
  }

  public OverviewResponse overview(
      UUID userId, UUID establishmentId, String from, String to, String timezone, String channel) {
    Establishment establishment = access.requireCashierCompatible(userId, establishmentId);
    ReportingPeriod period = ReportingPeriod.parse(from, to, timezone);
    String saleChannel = parseChannel(channel);
    SalesTotals sales = salesTotals(establishment, period, saleChannel);
    long receivedCents = receivedCents(establishment, period, null);
    OperationsSnapshot ops = operationsSnapshot(establishment, period);
    return new OverviewResponse(
        periodMeta(period, saleChannel),
        receivedCents,
        sales.soldCents(),
        sales.salesCount(),
        averageTicket(sales.soldCents(), sales.salesCount()),
        "CONFIRMED_ORDER",
        ops.inProductionOrders(),
        ops.occupiedTables(),
        ops.totalTables(),
        ops.pendingBills(),
        ops.pendingCents(),
        Map.of(
            "receivedCents", "PERIOD",
            "soldCents", "PERIOD",
            "salesCount", "PERIOD",
            "averageTicketCents", "PERIOD",
            "inProductionOrders", "CURRENT",
            "occupiedTables", "CURRENT",
            "pendingBills", "CURRENT"),
        definitions());
  }

  public SalesResponse sales(
      UUID userId, UUID establishmentId, String from, String to, String timezone, String channel) {
    Establishment establishment = access.requireManager(userId, establishmentId);
    ReportingPeriod period = ReportingPeriod.parse(from, to, timezone);
    String saleChannel = parseChannel(channel);
    SalesTotals totals = salesTotals(establishment, period, saleChannel);
    return new SalesResponse(
        periodMeta(period, saleChannel),
        totals.salesCount(),
        totals.soldCents(),
        averageTicket(totals.soldCents(), totals.salesCount()),
        "CONFIRMED_ORDER",
        fillDays(
            period,
            queryDays(
                """
                SELECT (o.placed_at AT TIME ZONE :tz)::date AS day,
                       COUNT(*) AS count,
                       COALESCE(SUM(o.total_cents), 0) AS cents
                FROM orders o
                WHERE o.establishment_id = :est
                  AND o.organization_id = :org
                  AND o.commercial_status = 'CONFIRMED'
                  AND o.placed_at >= :fromInclusive
                  AND o.placed_at < :toExclusive
                  AND (:channel IS NULL OR o.channel = :channel)
                GROUP BY 1
                ORDER BY 1
                """,
                establishment,
                period,
                saleChannel)),
        fillChannels(
            queryChannels(
                """
                SELECT o.channel AS channel,
                       COUNT(*) AS count,
                       COALESCE(SUM(o.total_cents), 0) AS cents
                FROM orders o
                WHERE o.establishment_id = :est
                  AND o.organization_id = :org
                  AND o.commercial_status = 'CONFIRMED'
                  AND o.placed_at >= :fromInclusive
                  AND o.placed_at < :toExclusive
                  AND (:channel IS NULL OR o.channel = :channel)
                GROUP BY 1
                """,
                establishment,
                period,
                saleChannel)));
  }

  public RevenueResponse revenue(
      UUID userId, UUID establishmentId, String from, String to, String timezone) {
    Establishment establishment = access.requireManager(userId, establishmentId);
    ReportingPeriod period = ReportingPeriod.parse(from, to, timezone);
    return new RevenueResponse(
        periodMeta(period, null),
        receivedCents(establishment, period, null),
        paymentCount(establishment, period, null),
        fillDays(
            period,
            queryDays(
                """
                SELECT (p.recorded_at AT TIME ZONE :tz)::date AS day,
                       COUNT(*) AS count,
                       COALESCE(SUM(p.applied_cents), 0) AS cents
                FROM bill_payments p
                WHERE p.establishment_id = :est
                  AND p.organization_id = :org
                  AND p.recorded_at >= :fromInclusive
                  AND p.recorded_at < :toExclusive
                GROUP BY 1
                ORDER BY 1
                """,
                establishment,
                period,
                null)));
  }

  public ProductsResponse products(
      UUID userId,
      UUID establishmentId,
      String from,
      String to,
      String timezone,
      String channel,
      int page,
      int size) {
    Establishment establishment = access.requireManager(userId, establishmentId);
    ReportingPeriod period = ReportingPeriod.parse(from, to, timezone);
    String saleChannel = parseChannel(channel);
    int safePage = Math.max(page, 0);
    int safeSize = size < 1 ? 10 : Math.min(size, MAX_PAGE_SIZE);
    long total =
        jdbc.sql(
                """
                SELECT COUNT(*)
                FROM (
                  SELECT i.product_id, i.product_name
                  FROM order_items i
                  INNER JOIN orders o
                    ON o.id = i.order_id
                   AND o.establishment_id = i.establishment_id
                  WHERE i.establishment_id = :est
                    AND i.organization_id = :org
                    AND o.establishment_id = :est
                    AND o.organization_id = :org
                    AND o.commercial_status = 'CONFIRMED'
                    AND o.placed_at >= :fromInclusive
                    AND o.placed_at < :toExclusive
                    AND (:channel IS NULL OR o.channel = :channel)
                  GROUP BY i.product_id, i.product_name
                ) grouped
                """)
            .param("est", establishment.id())
            .param("org", establishment.organizationId())
            .param("fromInclusive", ts(period.startInclusive()))
            .param("toExclusive", ts(period.endExclusive()))
            .param("channel", saleChannel, Types.VARCHAR)
            .query(Long.class)
            .single();
    List<ProductRow> items =
        jdbc.sql(
                """
                SELECT i.product_id AS product_id,
                       i.product_name AS product_name,
                       COALESCE(SUM(i.quantity), 0) AS quantity,
                       COALESCE(SUM(i.line_total_cents), 0) AS sold_cents
                FROM order_items i
                INNER JOIN orders o
                  ON o.id = i.order_id
                 AND o.establishment_id = i.establishment_id
                WHERE i.establishment_id = :est
                  AND i.organization_id = :org
                  AND o.establishment_id = :est
                  AND o.organization_id = :org
                  AND o.commercial_status = 'CONFIRMED'
                  AND o.placed_at >= :fromInclusive
                  AND o.placed_at < :toExclusive
                  AND (:channel IS NULL OR o.channel = :channel)
                GROUP BY i.product_id, i.product_name
                ORDER BY sold_cents DESC, quantity DESC, product_name ASC
                LIMIT :limit OFFSET :offset
                """)
            .param("est", establishment.id())
            .param("org", establishment.organizationId())
            .param("fromInclusive", ts(period.startInclusive()))
            .param("toExclusive", ts(period.endExclusive()))
            .param("channel", saleChannel, Types.VARCHAR)
            .param("limit", safeSize)
            .param("offset", (long) safePage * safeSize)
            .query(
                (rs, rowNum) ->
                    new ProductRow(
                        rs.getObject("product_id") == null ? null : rs.getObject("product_id").toString(),
                        rs.getString("product_name"),
                        rs.getLong("quantity"),
                        rs.getLong("sold_cents")))
            .list();
    return new ProductsResponse(periodMeta(period, saleChannel), total, safePage, safeSize, items);
  }

  public PaymentsResponse payments(
      UUID userId, UUID establishmentId, String from, String to, String timezone) {
    Establishment establishment = access.requireCashierCompatible(userId, establishmentId);
    ReportingPeriod period = ReportingPeriod.parse(from, to, timezone);
    long received = receivedCents(establishment, period, null);
    Map<String, PaymentMethodRow> byMethod = new LinkedHashMap<>();
    for (String method : PAYMENT_METHODS) {
      byMethod.put(method, new PaymentMethodRow(method, 0, 0, 0));
    }
    jdbc.sql(
            """
            SELECT p.method AS method,
                   COUNT(*) AS count,
                   COALESCE(SUM(p.applied_cents), 0) AS cents
            FROM bill_payments p
            WHERE p.establishment_id = :est
              AND p.organization_id = :org
              AND p.recorded_at >= :fromInclusive
              AND p.recorded_at < :toExclusive
            GROUP BY 1
            """)
        .param("est", establishment.id())
        .param("org", establishment.organizationId())
        .param("fromInclusive", ts(period.startInclusive()))
        .param("toExclusive", ts(period.endExclusive()))
        .query(
            (rs, rowNum) -> {
              String method = rs.getString("method");
              long cents = rs.getLong("cents");
              int percent = received == 0 ? 0 : (int) Math.round((cents * 100.0) / received);
              byMethod.put(method, new PaymentMethodRow(method, rs.getLong("count"), cents, percent));
              return method;
            })
        .list();
    return new PaymentsResponse(
        periodMeta(period, null),
        received,
        paymentCount(establishment, period, null),
        List.copyOf(byMethod.values()));
  }

  public OperationsResponse operations(
      UUID userId, UUID establishmentId, String from, String to, String timezone) {
    Establishment establishment = access.requireCashierCompatible(userId, establishmentId);
    ReportingPeriod period = ReportingPeriod.parse(from, to, timezone);
    OperationsSnapshot ops = operationsSnapshot(establishment, period);
    return new OperationsResponse(
        periodMeta(period, null),
        ops.inProductionOrders(),
        ops.occupiedTables(),
        ops.occupiedOpen(),
        ops.awaitingBill(),
        ops.totalTables(),
        ops.pendingBills(),
        ops.pendingCents(),
        ops.servicesOpenedInPeriod(),
        ops.servicesClosedInPeriod());
  }

  private SalesTotals salesTotals(Establishment establishment, ReportingPeriod period, String channel) {
    return jdbc.sql(
            """
            SELECT COUNT(*) AS sales_count,
                   COALESCE(SUM(o.total_cents), 0) AS sold_cents
            FROM orders o
            WHERE o.establishment_id = :est
              AND o.organization_id = :org
              AND o.commercial_status = 'CONFIRMED'
              AND o.placed_at >= :fromInclusive
              AND o.placed_at < :toExclusive
              AND (:channel IS NULL OR o.channel = :channel)
            """)
        .param("est", establishment.id())
        .param("org", establishment.organizationId())
        .param("fromInclusive", ts(period.startInclusive()))
        .param("toExclusive", ts(period.endExclusive()))
        .param("channel", channel, Types.VARCHAR)
        .query((rs, rowNum) -> new SalesTotals(rs.getLong("sales_count"), rs.getLong("sold_cents")))
        .single();
  }

  private long receivedCents(Establishment establishment, ReportingPeriod period, String method) {
    return jdbc.sql(
            """
            SELECT COALESCE(SUM(p.applied_cents), 0)
            FROM bill_payments p
            WHERE p.establishment_id = :est
              AND p.organization_id = :org
              AND p.recorded_at >= :fromInclusive
              AND p.recorded_at < :toExclusive
              AND (:method IS NULL OR p.method = :method)
            """)
        .param("est", establishment.id())
        .param("org", establishment.organizationId())
        .param("fromInclusive", ts(period.startInclusive()))
        .param("toExclusive", ts(period.endExclusive()))
        .param("method", method, Types.VARCHAR)
        .query(Long.class)
        .single();
  }

  private long paymentCount(Establishment establishment, ReportingPeriod period, String method) {
    return jdbc.sql(
            """
            SELECT COUNT(*)
            FROM bill_payments p
            WHERE p.establishment_id = :est
              AND p.organization_id = :org
              AND p.recorded_at >= :fromInclusive
              AND p.recorded_at < :toExclusive
              AND (:method IS NULL OR p.method = :method)
            """)
        .param("est", establishment.id())
        .param("org", establishment.organizationId())
        .param("fromInclusive", ts(period.startInclusive()))
        .param("toExclusive", ts(period.endExclusive()))
        .param("method", method, Types.VARCHAR)
        .query(Long.class)
        .single();
  }

  private OperationsSnapshot operationsSnapshot(Establishment establishment, ReportingPeriod period) {
    long inProduction =
        jdbc.sql(
                """
                SELECT COUNT(*)
                FROM orders o
                WHERE o.establishment_id = :est
                  AND o.organization_id = :org
                  AND o.production_status IN ('WAITING', 'PREPARING', 'READY')
                """)
            .param("est", establishment.id())
            .param("org", establishment.organizationId())
            .query(Long.class)
            .single();
    Occupancy occupancy =
        jdbc.sql(
                """
                SELECT
                  COUNT(*) FILTER (WHERE s.status = 'OPEN') AS occupied_open,
                  COUNT(*) FILTER (WHERE s.status = 'AWAITING_BILL') AS awaiting_bill
                FROM table_services s
                WHERE s.establishment_id = :est
                  AND s.organization_id = :org
                  AND s.status IN ('OPEN', 'AWAITING_BILL')
                """)
            .param("est", establishment.id())
            .param("org", establishment.organizationId())
            .query(
                (rs, rowNum) ->
                    new Occupancy(rs.getLong("occupied_open"), rs.getLong("awaiting_bill")))
            .single();
    long totalTables =
        jdbc.sql(
                """
                SELECT COUNT(*)
                FROM dining_tables t
                WHERE t.establishment_id = :est
                  AND t.organization_id = :org
                  AND t.status = 'ACTIVE'
                """)
            .param("est", establishment.id())
            .param("org", establishment.organizationId())
            .query(Long.class)
            .single();
    PendingBills pending =
        jdbc.sql(
                """
                SELECT COUNT(*) AS pending_bills,
                       COALESCE(SUM(b.remaining_cents), 0) AS pending_cents
                FROM bills b
                WHERE b.establishment_id = :est
                  AND b.organization_id = :org
                  AND b.remaining_cents > 0
                """)
            .param("est", establishment.id())
            .param("org", establishment.organizationId())
            .query(
                (rs, rowNum) -> new PendingBills(rs.getLong("pending_bills"), rs.getLong("pending_cents")))
            .single();
    long opened =
        jdbc.sql(
                """
                SELECT COUNT(*)
                FROM table_services s
                WHERE s.establishment_id = :est
                  AND s.organization_id = :org
                  AND s.opened_at >= :fromInclusive
                  AND s.opened_at < :toExclusive
                """)
            .param("est", establishment.id())
            .param("org", establishment.organizationId())
            .param("fromInclusive", ts(period.startInclusive()))
            .param("toExclusive", ts(period.endExclusive()))
            .query(Long.class)
            .single();
    long closed =
        jdbc.sql(
                """
                SELECT COUNT(*)
                FROM table_services s
                WHERE s.establishment_id = :est
                  AND s.organization_id = :org
                  AND s.closed_at IS NOT NULL
                  AND s.closed_at >= :fromInclusive
                  AND s.closed_at < :toExclusive
                """)
            .param("est", establishment.id())
            .param("org", establishment.organizationId())
            .param("fromInclusive", ts(period.startInclusive()))
            .param("toExclusive", ts(period.endExclusive()))
            .query(Long.class)
            .single();
    return new OperationsSnapshot(
        inProduction,
        occupancy.occupiedOpen() + occupancy.awaitingBill(),
        occupancy.occupiedOpen(),
        occupancy.awaitingBill(),
        totalTables,
        pending.count(),
        pending.cents(),
        opened,
        closed);
  }

  private List<DayPoint> queryDays(
      String sql, Establishment establishment, ReportingPeriod period, String channel) {
    var spec =
        jdbc.sql(sql)
            .param("est", establishment.id())
            .param("org", establishment.organizationId())
            .param("fromInclusive", ts(period.startInclusive()))
            .param("toExclusive", ts(period.endExclusive()))
            .param("tz", period.zone().getId());
    if (sql.contains(":channel")) {
      spec = spec.param("channel", channel, Types.VARCHAR);
    }
    return spec.query(
            (rs, rowNum) ->
                new DayPoint(rs.getObject("day", LocalDate.class), rs.getLong("count"), rs.getLong("cents")))
        .list();
  }

  private List<ChannelPoint> queryChannels(
      String sql, Establishment establishment, ReportingPeriod period, String channel) {
    return jdbc.sql(sql)
        .param("est", establishment.id())
        .param("org", establishment.organizationId())
        .param("fromInclusive", ts(period.startInclusive()))
        .param("toExclusive", ts(period.endExclusive()))
        .param("channel", channel, Types.VARCHAR)
        .query(
            (rs, rowNum) ->
                new ChannelPoint(rs.getString("channel"), rs.getLong("count"), rs.getLong("cents")))
        .list();
  }

  private static List<DayPoint> fillDays(ReportingPeriod period, List<DayPoint> found) {
    Map<LocalDate, DayPoint> byDay = new LinkedHashMap<>();
    for (DayPoint point : found) {
      byDay.put(point.date(), point);
    }
    List<DayPoint> days = new ArrayList<>();
    for (LocalDate day = period.from(); !day.isAfter(period.to()); day = day.plusDays(1)) {
      days.add(byDay.getOrDefault(day, new DayPoint(day, 0, 0)));
    }
    return days;
  }

  private static List<ChannelPoint> fillChannels(List<ChannelPoint> found) {
    Map<String, ChannelPoint> byChannel = new LinkedHashMap<>();
    for (String channel : CHANNELS) {
      byChannel.put(channel, new ChannelPoint(channel, 0, 0));
    }
    for (ChannelPoint point : found) {
      byChannel.put(point.channel(), point);
    }
    return List.copyOf(byChannel.values());
  }

  private static PeriodMeta periodMeta(ReportingPeriod period, String channel) {
    return new PeriodMeta(
        period.from(),
        period.to(),
        period.zone().getId(),
        period.timezoneSource(),
        period.startInclusive(),
        period.endExclusive(),
        channel,
        "placed_at",
        "recorded_at");
  }

  private static long averageTicket(long soldCents, long salesCount) {
    return salesCount == 0 ? 0 : soldCents / salesCount;
  }

  private static Timestamp ts(Instant instant) {
    return Timestamp.from(instant);
  }

  private static String parseChannel(String channel) {
    if (channel == null || channel.isBlank()) {
      return null;
    }
    String normalized = channel.trim().toUpperCase();
    if (!CHANNELS.contains(normalized)) {
      throw ApiException.badRequest("Canal inválido. Use TABLE ou COUNTER.");
    }
    return normalized;
  }

  private static Map<String, String> definitions() {
    return Map.of(
        "receivedCents",
        "Soma de applied_cents dos pagamentos registrados no período. Não inclui troco, tendered, sangria, suprimento nem saldo inicial.",
        "soldCents",
        "Soma de total_cents dos pedidos confirmados no período, pela data de confirmação (placed_at).",
        "salesCount",
        "Quantidade de pedidos confirmados no período.",
        "averageTicketCents",
        "soldCents dividido por salesCount. Unidade: pedido confirmado.",
        "inProductionOrders",
        "Pedidos atuais com production_status WAITING, PREPARING ou READY.",
        "occupiedTables",
        "Atendimentos atuais OPEN (ocupada) ou AWAITING_BILL.",
        "pendingBills",
        "Contas atuais com remaining_cents > 0. Conta vazia de R$ 0,00 não entra.");
  }

  private record SalesTotals(long salesCount, long soldCents) {}

  private record Occupancy(long occupiedOpen, long awaitingBill) {}

  private record PendingBills(long count, long cents) {}

  private record OperationsSnapshot(
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
