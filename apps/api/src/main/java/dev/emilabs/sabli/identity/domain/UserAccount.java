package dev.emilabs.sabli.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserAccount {

  @Id
  private UUID id;

  @Column(nullable = false)
  private String email;

  @Column(name = "email_normalized", nullable = false)
  private String emailNormalized;

  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  @Column(nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AccountStatus status;

  @Column(name = "failed_login_attempts", nullable = false)
  private int failedLoginAttempts;

  @Column(name = "locked_until")
  private Instant lockedUntil;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "last_organization_id")
  private UUID lastOrganizationId;

  @Column(name = "last_establishment_id")
  private UUID lastEstablishmentId;

  public static UserAccount create(String email, String emailNormalized, String passwordHash, String name) {
    UserAccount user = new UserAccount();
    user.id = UUID.randomUUID();
    user.email = email;
    user.emailNormalized = emailNormalized;
    user.passwordHash = passwordHash;
    user.name = name;
    user.status = AccountStatus.ACTIVE;
    user.failedLoginAttempts = 0;
    return user;
  }

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public UUID id() {
    return id;
  }

  public String email() {
    return email;
  }

  public String emailNormalized() {
    return emailNormalized;
  }

  public String passwordHash() {
    return passwordHash;
  }

  public String name() {
    return name;
  }

  public AccountStatus status() {
    return status;
  }

  public Instant lockedUntil() {
    return lockedUntil;
  }

  public boolean isLocked(Instant now) {
    return lockedUntil != null && lockedUntil.isAfter(now);
  }

  public void registerFailure(int maxAttempts, Instant lockedUntil) {
    failedLoginAttempts += 1;
    if (failedLoginAttempts >= maxAttempts) {
      this.lockedUntil = lockedUntil;
    }
  }

  public void registerSuccess() {
    failedLoginAttempts = 0;
    lockedUntil = null;
  }

  public void deactivate() {
    status = AccountStatus.INACTIVE;
  }

  public UUID lastOrganizationId() {
    return lastOrganizationId;
  }

  public UUID lastEstablishmentId() {
    return lastEstablishmentId;
  }

  public void rememberContext(UUID organizationId, UUID establishmentId) {
    this.lastOrganizationId = organizationId;
    this.lastEstablishmentId = establishmentId;
  }

  public void forgetContext() {
    lastOrganizationId = null;
    lastEstablishmentId = null;
  }
}
