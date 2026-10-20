package dev.emilabs.sabli.dining.domain;

/**
 * Estado derivado para o mapa. Persistido: cadastro da mesa ({@link TableAvailability} + {@link
 * DiningStatus}) e atendimento ({@link TableServiceStatus}). Occupancy nunca é coluna.
 */
public enum TableOccupancy {
  AVAILABLE,
  OCCUPIED,
  AWAITING_BILL,
  RESERVED,
  UNAVAILABLE
}
