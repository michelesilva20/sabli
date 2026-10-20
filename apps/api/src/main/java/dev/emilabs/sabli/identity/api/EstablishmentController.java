package dev.emilabs.sabli.identity.api;

import dev.emilabs.sabli.identity.api.IdentityDtos.EstablishmentMembershipResponse;
import dev.emilabs.sabli.identity.api.IdentityDtos.EstablishmentResponse;
import dev.emilabs.sabli.identity.api.IdentityDtos.StatusUpdateRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.UpsertEstablishmentMembershipRequest;
import dev.emilabs.sabli.identity.application.IdentityQueryService;
import dev.emilabs.sabli.identity.application.TenantAdminService;
import dev.emilabs.sabli.shared.security.CurrentUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/establishments")
@Tag(name = "Establishments")
public class EstablishmentController {

  private final CurrentUser currentUser;
  private final IdentityQueryService queries;
  private final TenantAdminService admin;

  public EstablishmentController(
      CurrentUser currentUser, IdentityQueryService queries, TenantAdminService admin) {
    this.currentUser = currentUser;
    this.queries = queries;
    this.admin = admin;
  }

  @GetMapping("/{establishmentId}")
  public EstablishmentResponse get(@PathVariable UUID establishmentId) {
    return EstablishmentResponse.from(queries.getEstablishment(currentUser.requireUserId(), establishmentId));
  }

  @PatchMapping("/{establishmentId}")
  public EstablishmentResponse updateStatus(
      @PathVariable UUID establishmentId, @Valid @RequestBody StatusUpdateRequest request) {
    return EstablishmentResponse.from(
        admin.changeEstablishmentStatus(currentUser.requireUserId(), establishmentId, request.status()));
  }

  @GetMapping("/{establishmentId}/memberships")
  public List<EstablishmentMembershipResponse> memberships(@PathVariable UUID establishmentId) {
    return admin.listEstablishmentMemberships(currentUser.requireUserId(), establishmentId).stream()
        .map(EstablishmentMembershipResponse::from)
        .toList();
  }

  @PutMapping("/{establishmentId}/memberships")
  public EstablishmentMembershipResponse upsertMembership(
      @PathVariable UUID establishmentId, @Valid @RequestBody UpsertEstablishmentMembershipRequest request) {
    return EstablishmentMembershipResponse.from(
        admin.upsertEstablishmentMembership(
            currentUser.requireUserId(), establishmentId, request.email(), request.role()));
  }

  @DeleteMapping("/{establishmentId}/memberships/{userId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void revokeMembership(@PathVariable UUID establishmentId, @PathVariable UUID userId) {
    admin.revokeEstablishmentMembership(currentUser.requireUserId(), establishmentId, userId);
  }
}
