package dev.emilabs.sabli.identity.domain;

public enum OrganizationRole {
  ADMIN(2),
  MANAGER(1);

  private final int rank;

  OrganizationRole(int rank) {
    this.rank = rank;
  }

  public int rank() {
    return rank;
  }

  public boolean canAssign(OrganizationRole target) {
    return rank >= target.rank;
  }
}
