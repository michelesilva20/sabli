package dev.emilabs.sabli.identity.api;

import dev.emilabs.sabli.identity.api.IdentityDtos.CreateEstablishmentRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.EstablishmentResponse;
import dev.emilabs.sabli.identity.api.IdentityDtos.OrganizationMembershipResponse;
import dev.emilabs.sabli.identity.api.IdentityDtos.OrganizationResponse;
import dev.emilabs.sabli.identity.api.IdentityDtos.StatusUpdateRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.UpsertOrganizationMembershipRequest;
import dev.emilabs.sabli.identity.application.IdentityQueryService;
import dev.emilabs.sabli.identity.application.TenantAdminService;
import dev.emilabs.sabli.shared.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/organizations")
@Tag(name = "Organizations")
public class OrganizationController {

  private final CurrentUser currentUser;
  private final IdentityQueryService queries;
  private final TenantAdminService admin;

  public OrganizationController(
      CurrentUser currentUser, IdentityQueryService queries, TenantAdminService admin) {
    this.currentUser = currentUser;
    this.queries = queries;
    this.admin = admin;
  }

  @GetMapping
  @Operation(summary = "Lista organizações às quais o usuário pertence")
  public List<OrganizationResponse> list() {
    return queries.listOrganizations(currentUser.requireUserId()).stream()
        .map(OrganizationResponse::from)
        .toList();
  }

  @GetMapping("/{organizationId}")
  public OrganizationResponse get(@PathVariable UUID organizationId) {
    return OrganizationResponse.from(queries.getOrganization(currentUser.requireUserId(), organizationId));
  }

  @PatchMapping("/{organizationId}")
  public OrganizationResponse updateStatus(
      @PathVariable UUID organizationId, @Valid @RequestBody StatusUpdateRequest request) {
    return OrganizationResponse.from(
        admin.changeOrganizationStatus(currentUser.requireUserId(), organizationId, request.status()));
  }

  @GetMapping("/{organizationId}/establishments")
  public List<EstablishmentResponse> establishments(@PathVariable UUID organizationId) {
    return queries.listEstablishments(currentUser.requireUserId(), organizationId).stream()
        .map(EstablishmentResponse::from)
        .toList();
  }

  @PostMapping("/{organizationId}/establishments")
  @ResponseStatus(HttpStatus.CREATED)
  public EstablishmentResponse createEstablishment(
      @PathVariable UUID organizationId, @Valid @RequestBody CreateEstablishmentRequest request) {
    return EstablishmentResponse.from(
        admin.createEstablishment(
            currentUser.requireUserId(), organizationId, request.name(), request.slug()));
  }

  @GetMapping("/{organizationId}/memberships")
  public List<OrganizationMembershipResponse> memberships(@PathVariable UUID organizationId) {
    return admin.listOrganizationMemberships(currentUser.requireUserId(), organizationId).stream()
        .map(OrganizationMembershipResponse::from)
        .toList();
  }

  @PutMapping("/{organizationId}/memberships")
  public OrganizationMembershipResponse upsertMembership(
      @PathVariable UUID organizationId, @Valid @RequestBody UpsertOrganizationMembershipRequest request) {
    return OrganizationMembershipResponse.from(
        admin.upsertOrganizationMembership(
            currentUser.requireUserId(), organizationId, request.email(), request.role()));
  }

  @DeleteMapping("/{organizationId}/memberships/{userId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void revokeMembership(@PathVariable UUID organizationId, @PathVariable UUID userId) {
    admin.revokeOrganizationMembership(currentUser.requireUserId(), organizationId, userId);
  }
}
