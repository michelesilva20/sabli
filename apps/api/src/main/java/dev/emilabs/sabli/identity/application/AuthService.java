package dev.emilabs.sabli.identity.application;

import dev.emilabs.sabli.identity.config.IdentityProperties;
import dev.emilabs.sabli.identity.config.IdentityProperties.Registration.Mode;
import dev.emilabs.sabli.identity.domain.AccountStatus;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.EstablishmentMembership;
import dev.emilabs.sabli.identity.domain.EstablishmentRole;
import dev.emilabs.sabli.identity.domain.Organization;
import dev.emilabs.sabli.identity.domain.OrganizationMembership;
import dev.emilabs.sabli.identity.domain.OrganizationRole;
import dev.emilabs.sabli.identity.domain.RefreshSession;
import dev.emilabs.sabli.identity.domain.UserAccount;
import dev.emilabs.sabli.identity.persistence.EstablishmentMembershipRepository;
import dev.emilabs.sabli.identity.persistence.EstablishmentRepository;
import dev.emilabs.sabli.identity.persistence.OrganizationMembershipRepository;
import dev.emilabs.sabli.identity.persistence.OrganizationRepository;
import dev.emilabs.sabli.identity.persistence.RefreshSessionRepository;
import dev.emilabs.sabli.identity.persistence.UserAccountRepository;
import dev.emilabs.sabli.identity.security.JwtService;
import dev.emilabs.sabli.identity.security.TokenHasher;
import dev.emilabs.sabli.shared.error.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuthService {

  private final IdentityProperties properties;
  private final UserAccountRepository users;
  private final OrganizationRepository organizations;
  private final EstablishmentRepository establishments;
  private final OrganizationMembershipRepository organizationMemberships;
  private final EstablishmentMembershipRepository establishmentMemberships;
  private final RefreshSessionRepository refreshSessions;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final Clock clock;

  public AuthService(
      IdentityProperties properties,
      UserAccountRepository users,
      OrganizationRepository organizations,
      EstablishmentRepository establishments,
      OrganizationMembershipRepository organizationMemberships,
      EstablishmentMembershipRepository establishmentMemberships,
      RefreshSessionRepository refreshSessions,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      Clock clock) {
    this.properties = properties;
    this.users = users;
    this.organizations = organizations;
    this.establishments = establishments;
    this.organizationMemberships = organizationMemberships;
    this.establishmentMemberships = establishmentMemberships;
    this.refreshSessions = refreshSessions;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.clock = clock;
  }

  @Transactional
  public TokenBundle registerOrganization(RegisterOrganizationCommand command) {
    assertRegistrationAllowed(command.bootstrapToken());
    String emailNormalized = Emails.normalize(command.email());
    if (users.existsByEmailNormalized(emailNormalized)) {
      throw ApiException.conflict("Não foi possível concluir o cadastro.");
    }
    String orgSlug = Slugs.normalize(command.organizationSlug());
    String estSlug = Slugs.normalize(command.establishmentSlug());
    if (organizations.existsBySlug(orgSlug)) {
      throw ApiException.conflict("Não foi possível concluir o cadastro.");
    }
    UserAccount user =
        users.save(
            UserAccount.create(
                command.email().trim(), emailNormalized, passwordEncoder.encode(command.password()), command.name().trim()));
    Organization organization = organizations.save(Organization.create(command.organizationName().trim(), orgSlug));
    Establishment establishment =
        establishments.save(Establishment.create(organization.id(), command.establishmentName().trim(), estSlug));
    organizationMemberships.save(
        OrganizationMembership.create(organization.id(), user.id(), OrganizationRole.ADMIN));
    establishmentMemberships.save(
        EstablishmentMembership.create(
            establishment.id(), organization.id(), user.id(), EstablishmentRole.ADMIN));
    return issueTokens(user.id());
  }

  @Transactional(noRollbackFor = ApiException.class)
  public TokenBundle login(String email, String password) {
    Instant now = clock.instant();
    UserAccount user =
        users.findByEmailNormalized(Emails.normalize(email)).orElseThrow(ApiException::invalidCredentials);
    if (user.status() != AccountStatus.ACTIVE || user.isLocked(now)) {
      throw ApiException.invalidCredentials();
    }
    if (!passwordEncoder.matches(password, user.passwordHash())) {
      user.registerFailure(
          properties.identity().lockout().maxAttempts(), now.plus(properties.identity().lockout().duration()));
      throw ApiException.invalidCredentials();
    }
    user.registerSuccess();
    return issueTokens(user.id());
  }

  @Transactional(noRollbackFor = ApiException.class)
  public TokenBundle refresh(String refreshToken) {
    Instant now = clock.instant();
    RefreshSession session =
        refreshSessions
            .findByTokenHash(TokenHasher.sha256(refreshToken))
            .orElseThrow(ApiException::invalidCredentials);
    if (!session.isActive(now)) {
      if (session.revokedAt() != null && session.replacedBy() != null) {
        revokeFamily(session.familyId(), now);
      }
      throw ApiException.invalidCredentials();
    }
    UserAccount user = users.findById(session.userId()).orElseThrow(ApiException::invalidCredentials);
    if (user.status() != AccountStatus.ACTIVE) {
      session.revoke(now);
      throw ApiException.invalidCredentials();
    }
    RefreshSession next = newSession(user.id(), session.familyId());
    refreshSessions.saveAndFlush(next);
    session.rotateTo(next.id(), now);
    refreshSessions.save(session);
    return new TokenBundle(jwtService.issueAccessToken(user.id()), next.rawToken(), expiresInSeconds());
  }

  @Transactional
  public void logout(String refreshToken) {
    refreshSessions
        .findByTokenHash(TokenHasher.sha256(refreshToken))
        .ifPresent(session -> session.revoke(clock.instant()));
  }

  private void assertRegistrationAllowed(String bootstrapToken) {
    Mode mode = properties.identity().registration().mode();
    if (mode == Mode.DISABLED) {
      throw ApiException.forbidden();
    }
    if (mode == Mode.OPEN) {
      return;
    }
    String expected = properties.identity().registration().bootstrapToken();
    if (!StringUtils.hasText(expected) || !expected.equals(bootstrapToken)) {
      throw ApiException.forbidden();
    }
  }

  private TokenBundle issueTokens(UUID userId) {
    RefreshSession session = newSession(userId, UUID.randomUUID());
    refreshSessions.save(session);
    return new TokenBundle(jwtService.issueAccessToken(userId), session.rawToken(), expiresInSeconds());
  }

  private RefreshSession newSession(UUID userId, UUID familyId) {
    String raw = TokenHasher.newRefreshToken();
    RefreshSession session =
        RefreshSession.create(
            userId,
            TokenHasher.sha256(raw),
            familyId,
            clock.instant().plus(properties.security().jwt().refreshTokenTtl()));
    session.attachRawToken(raw);
    return session;
  }

  private void revokeFamily(UUID familyId, Instant now) {
    refreshSessions.findByFamilyId(familyId).forEach(session -> session.revoke(now));
  }

  private long expiresInSeconds() {
    return properties.security().jwt().accessTokenTtl().toSeconds();
  }

  public record RegisterOrganizationCommand(
      String organizationName,
      String organizationSlug,
      String establishmentName,
      String establishmentSlug,
      String name,
      String email,
      String password,
      String bootstrapToken) {}

  public record TokenBundle(String accessToken, String refreshToken, long expiresInSeconds) {
    @Override
    public String toString() {
      return "TokenBundle[expiresInSeconds=" + expiresInSeconds + "]";
    }
  }
}
