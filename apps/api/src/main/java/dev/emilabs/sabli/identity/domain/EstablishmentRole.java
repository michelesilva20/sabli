package dev.emilabs.sabli.identity.domain;

public enum EstablishmentRole {
  ADMIN(5),
  MANAGER(4),
  CASHIER(3),
  WAITER(2),
  KITCHEN(2);

  private final int rank;

  EstablishmentRole(int rank) {
    this.rank = rank;
  }

  public int rank() {
    return rank;
  }

  public boolean canManageMemberships() {
    return this == ADMIN || this == MANAGER;
  }

  public boolean canAssign(EstablishmentRole target) {
    return canManageMemberships() && rank >= target.rank;
  }
}
