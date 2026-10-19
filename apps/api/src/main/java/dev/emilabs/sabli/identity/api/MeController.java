package dev.emilabs.sabli.identity.api;

import dev.emilabs.sabli.identity.api.IdentityDtos.ContextRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.ContextResponse;
import dev.emilabs.sabli.identity.api.IdentityDtos.MeResponse;
import dev.emilabs.sabli.identity.application.IdentityQueryService;
import dev.emilabs.sabli.shared.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@Tag(name = "Me")
public class MeController {

  private final CurrentUser currentUser;
  private final IdentityQueryService queries;

  public MeController(CurrentUser currentUser, IdentityQueryService queries) {
    this.currentUser = currentUser;
    this.queries = queries;
  }

  @GetMapping
  @Operation(summary = "Retorna o usuário autenticado e as memberships ativas")
  public MeResponse me() {
    return MeResponse.from(queries.me(currentUser.requireUserId()));
  }

  @PostMapping("/context")
  @Operation(summary = "Valida o contexto de organização e estabelecimento do solicitante")
  public ContextResponse context(@Valid @RequestBody ContextRequest request) {
    return ContextResponse.from(
        queries.validateContext(
            currentUser.requireUserId(), request.organizationId(), request.establishmentId()));
  }
}
