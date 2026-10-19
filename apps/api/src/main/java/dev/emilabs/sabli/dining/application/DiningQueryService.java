package dev.emilabs.sabli.dining.application;

import dev.emilabs.sabli.dining.domain.DiningStatus;
import dev.emilabs.sabli.dining.domain.DiningTable;
import dev.emilabs.sabli.dining.domain.TableService;
import dev.emilabs.sabli.dining.domain.TableServiceStatus;
import dev.emilabs.sabli.dining.persistence.DiningTableRepository;
import dev.emilabs.sabli.dining.persistence.TableServiceRepository;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiningQueryService {

  static final EnumSet<TableServiceStatus> ACTIVE =
      EnumSet.of(TableServiceStatus.OPEN, TableServiceStatus.AWAITING_BILL);

  private final DiningAccess access;
  private final DiningTableRepository tables;
  private final TableServiceRepository services;

  public DiningQueryService(
      DiningAccess access, DiningTableRepository tables, TableServiceRepository services) {
    this.access = access;
    this.tables = tables;
    this.services = services;
  }

  @Transactional(readOnly = true)
  public List<DiningTable> listTables(UUID userId, UUID establishmentId, boolean includeInactive) {
    access.requireRead(userId, establishmentId);
    if (includeInactive) {
      return tables.findByEstablishmentIdOrderByNumberAscIdAsc(establishmentId);
    }
    return tables.findByEstablishmentIdAndStatusOrderByNumberAscIdAsc(establishmentId, DiningStatus.ACTIVE);
  }

  @Transactional(readOnly = true)
  public DiningTable getTable(UUID userId, UUID establishmentId, UUID tableId) {
    access.requireRead(userId, establishmentId);
    return requireTable(establishmentId, tableId);
  }

  @Transactional(readOnly = true)
  public Map<UUID, TableService> activeServicesByTable(UUID establishmentId, List<UUID> tableIds) {
    if (tableIds.isEmpty()) {
      return Map.of();
    }
    return services.findByEstablishmentIdAndStatusIn(establishmentId, ACTIVE).stream()
        .filter(service -> tableIds.contains(service.tableId()))
        .collect(Collectors.toMap(TableService::tableId, service -> service));
  }

  @Transactional(readOnly = true)
  public TableService getActiveService(UUID userId, UUID establishmentId, UUID tableId) {
    access.requireRead(userId, establishmentId);
    requireTable(establishmentId, tableId);
    return services
        .findByTableIdAndEstablishmentIdAndStatusIn(tableId, establishmentId, ACTIVE)
        .orElseThrow(ApiException::notFound);
  }

  @Transactional(readOnly = true)
  public Page<TableService> listServices(
      UUID userId, UUID establishmentId, UUID tableId, int page, int size) {
    access.requireRead(userId, establishmentId);
    if (tableId != null) {
      requireTable(establishmentId, tableId);
    }
    int safePage = Math.max(page, 0);
    int safeSize = Math.min(Math.max(size, 1), 100);
    PageRequest request = PageRequest.of(safePage, safeSize);
    if (tableId == null) {
      return services.findByEstablishmentIdOrderByOpenedAtDescIdDesc(establishmentId, request);
    }
    return services.findByEstablishmentIdAndTableIdOrderByOpenedAtDescIdDesc(
        establishmentId, tableId, request);
  }

  public Establishment requireRead(UUID userId, UUID establishmentId) {
    return access.requireRead(userId, establishmentId);
  }

  DiningTable requireTable(UUID establishmentId, UUID tableId) {
    return tables.findByIdAndEstablishmentId(tableId, establishmentId).orElseThrow(ApiException::notFound);
  }
}
