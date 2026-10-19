package dev.emilabs.sabli.dining.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "dining_tables")
public class DiningTable {

  @Id
  private UUID id;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(nullable = false)
  private int number;

  private String name;

  @Column(nullable = false)
  private int seats;

  private String area;

  @Column(name = "layout_x")
  private Integer layoutX;

  @Column(name = "layout_y")
  private Integer layoutY;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TableAvailability availability;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private DiningStatus status;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static DiningTable create(
      UUID establishmentId,
      UUID organizationId,
      int number,
      String name,
      int seats,
      String area,
      Integer layoutX,
      Integer layoutY,
      TableAvailability availability) {
    DiningTable table = new DiningTable();
    table.id = UUID.randomUUID();
    table.establishmentId = establishmentId;
    table.organizationId = organizationId;
    table.number = number;
    table.name = blankToNull(name);
    table.seats = seats;
    table.area = blankToNull(area);
    table.layoutX = layoutX;
    table.layoutY = layoutY;
    table.availability = availability == null ? TableAvailability.AVAILABLE : availability;
    table.status = DiningStatus.ACTIVE;
    return table;
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

  public UUID establishmentId() {
    return establishmentId;
  }

  public UUID organizationId() {
    return organizationId;
  }

  public int number() {
    return number;
  }

  public String name() {
    return name;
  }

  public int seats() {
    return seats;
  }

  public String area() {
    return area;
  }

  public Integer layoutX() {
    return layoutX;
  }

  public Integer layoutY() {
    return layoutY;
  }

  public TableAvailability availability() {
    return availability;
  }

  public DiningStatus status() {
    return status;
  }

  public int version() {
    return version;
  }

  public Instant createdAt() {
    return createdAt;
  }

  public Instant updatedAt() {
    return updatedAt;
  }

  public boolean isActive() {
    return status == DiningStatus.ACTIVE;
  }

  public boolean canReceiveService() {
    return isActive() && availability != TableAvailability.UNAVAILABLE;
  }

  public void update(
      int number,
      String name,
      int seats,
      String area,
      Integer layoutX,
      Integer layoutY,
      TableAvailability availability) {
    this.number = number;
    this.name = blankToNull(name);
    this.seats = seats;
    this.area = blankToNull(area);
    this.layoutX = layoutX;
    this.layoutY = layoutY;
    this.availability = availability;
  }

  public void changeAvailability(TableAvailability availability) {
    this.availability = availability;
  }

  public void changeStatus(DiningStatus status) {
    this.status = status;
  }

  public void consumeReservation() {
    if (availability == TableAvailability.RESERVED) {
      availability = TableAvailability.AVAILABLE;
    }
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }
}
