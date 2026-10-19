package dev.emilabs.sabli.dining.api;

import dev.emilabs.sabli.dining.api.DiningDtos.PageResponse;
import dev.emilabs.sabli.dining.api.DiningDtos.ServiceResponse;
import dev.emilabs.sabli.dining.application.DiningQueryService;
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
@RequestMapping("/api/v1/establishments/{establishmentId}/table-services")
@Tag(name = "Dining")
public class DiningServiceController {

  private final CurrentUser currentUser;
  private final DiningQueryService queries;

  public DiningServiceController(CurrentUser currentUser, DiningQueryService queries) {
    this.currentUser = currentUser;
    this.queries = queries;
  }

  @GetMapping
  @Operation(summary = "Histórico de atendimentos do estabelecimento")
  public PageResponse<ServiceResponse> list(
      @PathVariable UUID establishmentId,
      @RequestParam(required = false) UUID tableId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return PageResponse.from(
        queries
            .listServices(currentUser.requireUserId(), establishmentId, tableId, page, size)
            .map(ServiceResponse::from));
  }
}
