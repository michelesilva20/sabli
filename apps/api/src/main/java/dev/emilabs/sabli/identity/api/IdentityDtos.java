package dev.emilabs.sabli.identity.api;

import dev.emilabs.sabli.identity.application.AuthService;
import dev.emilabs.sabli.identity.application.IdentityQueryService.ContextSnapshot;
import dev.emilabs.sabli.identity.application.IdentityQueryService.MeSnapshot;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.EstablishmentMembership;
import dev.emilabs.sabli.identity.domain.EstablishmentRole;
import dev.emilabs.sabli.identity.domain.Organization;
import dev.emilabs.sabli.identity.domain.OrganizationMembership;
import dev.emilabs.sabli.identity.domain.OrganizationRole;
import dev.emilabs.sabli.identity.domain.TenantStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public final class IdentityDtos {

  private IdentityDtos() {}

  public record RegisterOrganizationRequest(
      @NotBlank @Size(max = 160) String organizationName,
      @NotBlank @Size(max = 80) String organizationSlug,
      @NotBlank @Size(max = 160) String establishmentName,
      @NotBlank @Size(max = 80) String establishmentSlug,
      @NotBlank @Size(max = 120) String name,
      @NotBlank @Email @Size(max = 320) String email,
      @NotBlank @Size(min = 10, max = 72) String password,
      String bootstrapToken) {
    @Override
    public String toString() {
      return "RegisterOrganizationRequest[email=" + email + "]";
    }
  }

  public record LoginRequest(
      @NotBlank @Email String email, @NotBlank @Size(min = 10, max = 72) String password) {
    @Override
    public String toString() {
      return "LoginRequest[email=" + email + "]";
    }
  }

  public record RefreshRequest(@NotBlank String refreshToken) {
    @Override
    public String toString() {
      return "RefreshRequest[]";
    }
  }

  public record LogoutRequest(@NotBlank String refreshToken) {
    @Override
    public String toString() {
      return "LogoutRequest[]";
    }
  }

  public record TokenResponse(String accessToken, String refreshToken, long expiresInSeconds, String tokenType) {
    public static TokenResponse from(AuthService.TokenBundle bundle) {
      return new TokenResponse(bundle.accessToken(), bundle.refreshToken(), bundle.expiresInSeconds(), "Bearer");
    }
  }

  public record UserResponse(UUID id, String email, String name, String status) {}

  public record OrganizationResponse(UUID id, String name, String slug, TenantStatus status) {
    public static OrganizationResponse from(Organization organization) {
      return new OrganizationResponse(
          organization.id(), organization.name(), organization.slug(), organization.status());
    }
  }

  public record EstablishmentResponse(
      UUID id, UUID organizationId, String name, String slug, TenantStatus status) {
    public static EstablishmentResponse from(Establishment establishment) {
      return new EstablishmentResponse(
          establishment.id(),
          establishment.organizationId(),
          establishment.name(),
          establishment.slug(),
          establishment.status());
    }
  }

  public record OrganizationMembershipResponse(
      UUID organizationId, UUID userId, OrganizationRole role, String status) {
    public static OrganizationMembershipResponse from(OrganizationMembership membership) {
      return new OrganizationMembershipResponse(
          membership.organizationId(), membership.userId(), membership.role(), membership.status().name());
    }
  }

  public record EstablishmentMembershipResponse(
      UUID establishmentId, UUID organizationId, UUID userId, EstablishmentRole role, String status) {
    public static EstablishmentMembershipResponse from(EstablishmentMembership membership) {
      return new EstablishmentMembershipResponse(
          membership.establishmentId(),
          membership.organizationId(),
          membership.userId(),
          membership.role(),
          membership.status().name());
    }
  }

  public record MeResponse(
      UserResponse user,
      List<OrganizationResponse> organizations,
      List<OrganizationMembershipResponse> organizationMemberships,
      List<EstablishmentResponse> establishments,
      List<EstablishmentMembershipResponse> establishmentMemberships) {
    public static MeResponse from(MeSnapshot snapshot) {
      return new MeResponse(
          new UserResponse(
              snapshot.user().id(),
              snapshot.user().email(),
              snapshot.user().name(),
              snapshot.user().status().name()),
          snapshot.organizations().stream().map(OrganizationResponse::from).toList(),
          snapshot.organizationMemberships().stream().map(OrganizationMembershipResponse::from).toList(),
          snapshot.establishments().stream().map(EstablishmentResponse::from).toList(),
          snapshot.establishmentMemberships().stream().map(EstablishmentMembershipResponse::from).toList());
    }
  }

  public record ContextRequest(@NotNull UUID organizationId, UUID establishmentId) {}

  public record ContextResponse(
      OrganizationResponse organization,
      EstablishmentResponse establishment,
      OrganizationRole organizationRole,
      EstablishmentRole establishmentRole) {
    public static ContextResponse from(ContextSnapshot snapshot) {
      return new ContextResponse(
          OrganizationResponse.from(snapshot.organization()),
          snapshot.establishment() == null ? null : EstablishmentResponse.from(snapshot.establishment()),
          snapshot.organizationRole(),
          snapshot.establishmentRole());
    }
  }

  public record CreateEstablishmentRequest(
      @NotBlank @Size(max = 160) String name, @NotBlank @Size(max = 80) String slug) {}

  public record StatusUpdateRequest(@NotNull TenantStatus status) {}

  public record UpsertOrganizationMembershipRequest(
      @NotBlank @Email String email, @NotNull OrganizationRole role) {}

  public record UpsertEstablishmentMembershipRequest(
      @NotBlank @Email String email, @NotNull EstablishmentRole role) {}
}
