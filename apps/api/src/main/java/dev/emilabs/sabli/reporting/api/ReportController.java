package dev.emilabs.sabli.reporting.api;

import dev.emilabs.sabli.reporting.api.ReportingDtos.OperationsResponse;
import dev.emilabs.sabli.reporting.api.ReportingDtos.OverviewResponse;
import dev.emilabs.sabli.reporting.api.ReportingDtos.PaymentsResponse;
import dev.emilabs.sabli.reporting.api.ReportingDtos.ProductsResponse;
import dev.emilabs.sabli.reporting.api.ReportingDtos.RevenueResponse;
import dev.emilabs.sabli.reporting.api.ReportingDtos.SalesResponse;
import dev.emilabs.sabli.reporting.application.ReportingQueryService;
import dev.emilabs.sabli.shared.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/establishments/{establishmentId}/reports")
@Tag(name = "Reports")
public class ReportController {

  private final CurrentUser currentUser;
  private final ReportingQueryService queries;

  public ReportController(CurrentUser currentUser, ReportingQueryService queries) {
    this.currentUser = currentUser;
    this.queries = queries;
  }

  @GetMapping("/overview")
  @Operation(summary = "Indicadores do dashboard: recebidos, vendas, operação atual")
  public OverviewResponse overview(
      @PathVariable UUID establishmentId,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to,
      @RequestParam(required = false) String timezone,
      @RequestParam(required = false) String channel) {
    return queries.overview(currentUser.requireUserId(), establishmentId, from, to, timezone, channel);
  }

  @GetMapping("/sales")
  @Operation(summary = "Vendas confirmadas por dia e canal")
  public SalesResponse sales(
      @PathVariable UUID establishmentId,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to,
      @RequestParam(required = false) String timezone,
      @RequestParam(required = false) String channel) {
    return queries.sales(currentUser.requireUserId(), establishmentId, from, to, timezone, channel);
  }

  @GetMapping("/revenue")
  @Operation(summary = "Recebimentos aplicados por dia")
  public RevenueResponse revenue(
      @PathVariable UUID establishmentId,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to,
      @RequestParam(required = false) String timezone) {
    return queries.revenue(currentUser.requireUserId(), establishmentId, from, to, timezone);
  }

  @GetMapping("/products")
  @Operation(summary = "Produtos mais vendidos no período")
  public ProductsResponse products(
      @PathVariable UUID establishmentId,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to,
      @RequestParam(required = false) String timezone,
      @RequestParam(required = false) String channel,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size) {
    return queries.products(
        currentUser.requireUserId(), establishmentId, from, to, timezone, channel, page, size);
  }

  @GetMapping("/payments")
  @Operation(summary = "Recebimentos por forma de pagamento")
  public PaymentsResponse payments(
      @PathVariable UUID establishmentId,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to,
      @RequestParam(required = false) String timezone) {
    return queries.payments(currentUser.requireUserId(), establishmentId, from, to, timezone);
  }

  @GetMapping("/operations")
  @Operation(summary = "Indicadores operacionais atuais e movimento de mesas no período")
  public OperationsResponse operations(
      @PathVariable UUID establishmentId,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to,
      @RequestParam(required = false) String timezone) {
    return queries.operations(currentUser.requireUserId(), establishmentId, from, to, timezone);
  }
}
