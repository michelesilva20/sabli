package dev.emilabs.sabli.cash.api;

import dev.emilabs.sabli.cash.api.CashDtos.CashMovementRequest;
import dev.emilabs.sabli.cash.api.CashDtos.CashSessionResponse;
import dev.emilabs.sabli.cash.api.CashDtos.CashSessionSummary;
import dev.emilabs.sabli.cash.api.CashDtos.CloseCashRequest;
import dev.emilabs.sabli.cash.api.CashDtos.OpenCashRequest;
import dev.emilabs.sabli.cash.api.CashDtos.PageResponse;
import dev.emilabs.sabli.cash.application.CashCommandService;
import dev.emilabs.sabli.cash.application.CashQueryService;
import dev.emilabs.sabli.cash.domain.CashSession;
import dev.emilabs.sabli.shared.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/establishments/{establishmentId}/cash/sessions")
@Tag(name = "Cash")
public class CashSessionController {

  private final CurrentUser currentUser;
  private final CashCommandService commands;
  private final CashQueryService queries;

  public CashSessionController(
      CurrentUser currentUser, CashCommandService commands, CashQueryService queries) {
    this.currentUser = currentUser;
    this.commands = commands;
    this.queries = queries;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Abre o caixa do estabelecimento")
  public CashSessionResponse open(
      @PathVariable UUID establishmentId, @Valid @RequestBody OpenCashRequest request) {
    return toResponse(commands.open(currentUser.requireUserId(), establishmentId, request.toCommand()));
  }

  @GetMapping("/current")
  @Operation(summary = "Consulta o caixa ativo do estabelecimento")
  public CashSessionResponse current(@PathVariable UUID establishmentId) {
    return toResponse(queries.current(currentUser.requireUserId(), establishmentId));
  }

  @GetMapping
  @Operation(summary = "Lista o histórico de caixas")
  public PageResponse<CashSessionSummary> list(
      @PathVariable UUID establishmentId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return PageResponse.from(
        queries
            .list(currentUser.requireUserId(), establishmentId, page, size)
            .map(CashSessionSummary::from));
  }

  @GetMapping("/{sessionId}")
  @Operation(summary = "Consulta sessão, movimentos e totais por meio")
  public CashSessionResponse get(@PathVariable UUID establishmentId, @PathVariable UUID sessionId) {
    return toResponse(queries.get(currentUser.requireUserId(), establishmentId, sessionId));
  }

  @PostMapping("/{sessionId}/movements")
  @Operation(summary = "Registra suprimento ou sangria")
  public CashSessionResponse move(
      @PathVariable UUID establishmentId,
      @PathVariable UUID sessionId,
      @Valid @RequestBody CashMovementRequest request) {
    return toResponse(commands.move(currentUser.requireUserId(), establishmentId, sessionId, request.toCommand()));
  }

  @PostMapping("/{sessionId}/close")
  @Operation(summary = "Fecha o caixa sem invalidar pagamentos já registrados")
  public CashSessionResponse close(
      @PathVariable UUID establishmentId,
      @PathVariable UUID sessionId,
      @RequestBody(required = false) CloseCashRequest request) {
    Integer version = request == null ? null : request.version();
    return toResponse(commands.close(currentUser.requireUserId(), establishmentId, sessionId, version));
  }

  private CashSessionResponse toResponse(CashSession session) {
    return CashSessionResponse.from(session, queries.movements(session.id()));
  }
}
