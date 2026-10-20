package dev.emilabs.sabli.dining.domain;

public final class Occupancy {

  private Occupancy() {}

  public static TableOccupancy of(DiningTable table, TableService activeService) {
    if (!table.isActive() || table.availability() == TableAvailability.UNAVAILABLE) {
      return TableOccupancy.UNAVAILABLE;
    }
    if (activeService != null && activeService.isActive()) {
      return activeService.status() == TableServiceStatus.AWAITING_BILL
          ? TableOccupancy.AWAITING_BILL
          : TableOccupancy.OCCUPIED;
    }
    if (table.availability() == TableAvailability.RESERVED) {
      return TableOccupancy.RESERVED;
    }
    return TableOccupancy.AVAILABLE;
  }
}
