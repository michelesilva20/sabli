package dev.emilabs.sabli.dining.api;

import dev.emilabs.sabli.dining.application.DiningCommandService.TableCommand;
import dev.emilabs.sabli.dining.domain.DiningStatus;
import dev.emilabs.sabli.dining.domain.DiningTable;
import dev.emilabs.sabli.dining.domain.Occupancy;
import dev.emilabs.sabli.dining.domain.ServiceCloseKind;
import dev.emilabs.sabli.dining.domain.TableAvailability;
import dev.emilabs.sabli.dining.domain.TableOccupancy;
import dev.emilabs.sabli.dining.domain.TableService;
import dev.emilabs.sabli.dining.domain.TableServiceStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;

public final class DiningDtos {

  private DiningDtos() {}

  public record TableRequest(
      @NotNull @Min(1) Integer number,
      @Size(max = 80) String name,
      @NotNull @Min(1) Integer seats,
      @Size(max = 80) String area,
      Integer layoutX,
      Integer layoutY,
      TableAvailability availability,
      Integer version) {
    TableCommand toCommand() {
      return new TableCommand(
          number,
          name,
          seats,
          area,
          layoutX,
          layoutY,
          availability,
          version);
    }
  }

  public record AvailabilityRequest(@NotNull TableAvailability availability, Integer version) {}

  public record StatusRequest(@NotNull DiningStatus status, Integer version) {}

  public record OpenServiceRequest(@NotNull @Min(1) Integer guests) {}

  public record CloseServiceRequest(Boolean empty, @Size(max = 140) String reason) {}

  public record TableResponse(
      UUID id,
      UUID establishmentId,
      int number,
      String name,
      int seats,
      String area,
      Integer layoutX,
      Integer layoutY,
      TableAvailability availability,
      DiningStatus status,
      TableOccupancy occupancy,
      int version,
      Instant createdAt,
      Instant updatedAt,
      ServiceResponse activeService) {
    static TableResponse from(DiningTable table, TableService active) {
      return new TableResponse(
          table.id(),
          table.establishmentId(),
          table.number(),
          table.name(),
          table.seats(),
          table.area(),
          table.layoutX(),
          table.layoutY(),
          table.availability(),
          table.status(),
          Occupancy.of(table, active),
          table.version(),
          table.createdAt(),
          table.updatedAt(),
          active == null ? null : ServiceResponse.from(active));
    }
  }

  public record ServiceResponse(
      UUID id,
      UUID tableId,
      UUID establishmentId,
      TableServiceStatus status,
      int guests,
      UUID openedByUserId,
      String hostName,
      Instant openedAt,
      Instant requestedBillAt,
      Instant closedAt,
      UUID closedByUserId,
      String closedByName,
      String closeReason,
      ServiceCloseKind closeKind,
      int version) {
    static ServiceResponse from(TableService service) {
      return new ServiceResponse(
          service.id(),
          service.tableId(),
          service.establishmentId(),
          service.status(),
          service.guestCount(),
          service.openedByUserId(),
          service.hostName(),
          service.openedAt(),
          service.requestedBillAt(),
          service.closedAt(),
          service.closedByUserId(),
          service.closedByName(),
          service.closeReason(),
          service.closeKind(),
          service.version());
    }
  }

  public record PageResponse<T>(List<T> items, int page, int size, long total) {
    static <T> PageResponse<T> from(Page<T> page) {
      return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements());
    }
  }
}
