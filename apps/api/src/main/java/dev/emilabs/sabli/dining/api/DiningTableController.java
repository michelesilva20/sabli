package dev.emilabs.sabli.dining.api;

import dev.emilabs.sabli.dining.api.DiningDtos.AvailabilityRequest;
import dev.emilabs.sabli.dining.api.DiningDtos.OpenServiceRequest;
import dev.emilabs.sabli.dining.api.DiningDtos.PageResponse;
import dev.emilabs.sabli.dining.api.DiningDtos.ServiceResponse;
import dev.emilabs.sabli.dining.api.DiningDtos.StatusRequest;
import dev.emilabs.sabli.dining.api.DiningDtos.TableRequest;
import dev.emilabs.sabli.dining.api.DiningDtos.TableResponse;
import dev.emilabs.sabli.dining.application.DiningCommandService;
import dev.emilabs.sabli.dining.application.DiningQueryService;
import dev.emilabs.sabli.dining.domain.DiningTable;
import dev.emilabs.sabli.dining.domain.TableService;
import dev.emilabs.sabli.shared.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/establishments/{establishmentId}/tables")
@Tag(name = "Dining")
public class DiningTableController {

  private final CurrentUser currentUser;
  private final DiningQueryService queries;
  private final DiningCommandService commands;

  public DiningTableController(
      CurrentUser currentUser, DiningQueryService queries, DiningCommandService commands) {
    this.currentUser = currentUser;
    this.queries = queries;
    this.commands = commands;
  }

  @GetMapping
  @Operation(summary = "Lista mesas do estabelecimento com ocupação derivada")
  public List<TableResponse> list(
      @PathVariable UUID establishmentId, @RequestParam(defaultValue = "false") boolean includeInactive) {
    UUID userId = currentUser.requireUserId();
    List<DiningTable> tables = queries.listTables(userId, establishmentId, includeInactive);
    Map<UUID, TableService> active =
        queries.activeServicesByTable(establishmentId, tables.stream().map(DiningTable::id).toList());
    return tables.stream().map(table -> TableResponse.from(table, active.get(table.id()))).toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Cria mesa")
  public TableResponse create(@PathVariable UUID establishmentId, @Valid @RequestBody TableRequest request) {
    DiningTable table =
        commands.createTable(currentUser.requireUserId(), establishmentId, request.toCommand());
    return TableResponse.from(table, null);
  }

  @GetMapping("/{tableId}")
  @Operation(summary = "Consulta mesa e atendimento ativo")
  public TableResponse get(@PathVariable UUID establishmentId, @PathVariable UUID tableId) {
    UUID userId = currentUser.requireUserId();
    DiningTable table = queries.getTable(userId, establishmentId, tableId);
    TableService active =
        queries.activeServicesByTable(establishmentId, List.of(tableId)).get(tableId);
    return TableResponse.from(table, active);
  }

  @PatchMapping("/{tableId}")
  @Operation(summary = "Edita cadastro da mesa")
  public TableResponse update(
      @PathVariable UUID establishmentId,
      @PathVariable UUID tableId,
      @Valid @RequestBody TableRequest request) {
    DiningTable table =
        commands.updateTable(currentUser.requireUserId(), establishmentId, tableId, request.toCommand());
    TableService active =
        queries.activeServicesByTable(establishmentId, List.of(tableId)).get(tableId);
    return TableResponse.from(table, active);
  }

  @PatchMapping("/{tableId}/availability")
  @Operation(summary = "Altera disponibilidade cadastral da mesa")
  public TableResponse changeAvailability(
      @PathVariable UUID establishmentId,
      @PathVariable UUID tableId,
      @Valid @RequestBody AvailabilityRequest request) {
    DiningTable table =
        commands.changeAvailability(
            currentUser.requireUserId(), establishmentId, tableId, request.availability(), request.version());
    TableService active =
        queries.activeServicesByTable(establishmentId, List.of(tableId)).get(tableId);
    return TableResponse.from(table, active);
  }

  @PatchMapping("/{tableId}/status")
  @Operation(summary = "Ativa ou desativa a mesa")
  public TableResponse changeStatus(
      @PathVariable UUID establishmentId,
      @PathVariable UUID tableId,
      @Valid @RequestBody StatusRequest request) {
    DiningTable table =
        commands.changeStatus(
            currentUser.requireUserId(), establishmentId, tableId, request.status(), request.version());
    return TableResponse.from(table, null);
  }

  @GetMapping("/{tableId}/service")
  @Operation(summary = "Consulta o atendimento ativo da mesa")
  public ServiceResponse activeService(@PathVariable UUID establishmentId, @PathVariable UUID tableId) {
    return ServiceResponse.from(
        queries.getActiveService(currentUser.requireUserId(), establishmentId, tableId));
  }

  @PostMapping("/{tableId}/service")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Abre atendimento na mesa")
  public ServiceResponse open(
      @PathVariable UUID establishmentId,
      @PathVariable UUID tableId,
      @Valid @RequestBody OpenServiceRequest request) {
    return ServiceResponse.from(
        commands.openService(currentUser.requireUserId(), establishmentId, tableId, request.guests()));
  }

  @PostMapping("/{tableId}/service/bill")
  @Operation(summary = "Solicita a conta sem encerrar o atendimento")
  public ServiceResponse requestBill(@PathVariable UUID establishmentId, @PathVariable UUID tableId) {
    return ServiceResponse.from(commands.requestBill(currentUser.requireUserId(), establishmentId, tableId));
  }

  @PostMapping("/{tableId}/service/reopen")
  @Operation(summary = "Reabre atendimento que aguarda conta")
  public ServiceResponse reopen(@PathVariable UUID establishmentId, @PathVariable UUID tableId) {
    return ServiceResponse.from(commands.reopenService(currentUser.requireUserId(), establishmentId, tableId));
  }

  @PostMapping("/{tableId}/service/close")
  @Operation(summary = "Encerra o atendimento somente com a conta quitada")
  public ServiceResponse close(@PathVariable UUID establishmentId, @PathVariable UUID tableId) {
    return ServiceResponse.from(commands.closeService(currentUser.requireUserId(), establishmentId, tableId));
  }

  @GetMapping("/{tableId}/services")
  @Operation(summary = "Histórico de atendimentos da mesa")
  public PageResponse<ServiceResponse> history(
      @PathVariable UUID establishmentId,
      @PathVariable UUID tableId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return PageResponse.from(
        queries
            .listServices(currentUser.requireUserId(), establishmentId, tableId, page, size)
            .map(ServiceResponse::from));
  }
}
