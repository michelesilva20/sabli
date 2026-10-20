package dev.emilabs.sabli.dining.application;

import dev.emilabs.sabli.dining.domain.DiningStatus;
import dev.emilabs.sabli.dining.domain.DiningTable;
import dev.emilabs.sabli.dining.domain.TableAvailability;
import dev.emilabs.sabli.dining.domain.TableService;
import dev.emilabs.sabli.dining.domain.TableServiceStatus;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.UserAccount;
import dev.emilabs.sabli.identity.persistence.UserAccountRepository;
import dev.emilabs.sabli.dining.persistence.DiningTableRepository;
import dev.emilabs.sabli.dining.persistence.TableServiceRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiningCommandService {

  private final DiningAccess access;
  private final DiningTableRepository tables;
  private final TableServiceRepository services;
  private final UserAccountRepository users;

  public DiningCommandService(
      DiningAccess access,
      DiningTableRepository tables,
      TableServiceRepository services,
      UserAccountRepository users) {
    this.access = access;
    this.tables = tables;
    this.services = services;
    this.users = users;
  }

  @Transactional
  public DiningTable createTable(UUID userId, UUID establishmentId, TableCommand command) {
    Establishment establishment = access.requireManage(userId, establishmentId);
    requireUniqueNumber(establishmentId, command.number(), null);
    try {
      return tables.saveAndFlush(
          DiningTable.create(
              establishment.id(),
              establishment.organizationId(),
              command.number(),
              command.name(),
              command.seats(),
              command.area(),
              command.layoutX(),
              command.layoutY(),
              command.availability()));
    } catch (DataIntegrityViolationException ignored) {
      throw ApiException.conflict("TABLE_NUMBER_TAKEN", "Já existe uma mesa com este número neste estabelecimento.");
    }
  }

  @Transactional
  public DiningTable updateTable(UUID userId, UUID establishmentId, UUID tableId, TableCommand command) {
    access.requireManage(userId, establishmentId);
    DiningTable table = lockTable(establishmentId, tableId);
    assertCurrentVersion(table.version(), command.version());
    requireUniqueNumber(establishmentId, command.number(), tableId);
    TableService active = lockActive(establishmentId, tableId);
    if (active != null && command.seats() < active.guestCount()) {
      throw ApiException.unprocessable(
          "GUESTS_EXCEED_CAPACITY", "A capacidade não pode ficar abaixo das pessoas do atendimento ativo.");
    }
    if (active != null && command.availability() == TableAvailability.UNAVAILABLE) {
      throw ApiException.conflict("TABLE_OCCUPIED", "Mesa com atendimento ativo não pode ficar indisponível.");
    }
    table.update(
        command.number(),
        command.name(),
        command.seats(),
        command.area(),
        command.layoutX(),
        command.layoutY(),
        command.availability() == null ? table.availability() : command.availability());
    return table;
  }

  @Transactional
  public DiningTable changeAvailability(
      UUID userId, UUID establishmentId, UUID tableId, TableAvailability availability, Integer version) {
    access.requireManage(userId, establishmentId);
    DiningTable table = lockTable(establishmentId, tableId);
    assertCurrentVersion(table.version(), version);
    TableService active = lockActive(establishmentId, tableId);
    if (active != null && availability == TableAvailability.UNAVAILABLE) {
      throw ApiException.conflict("TABLE_OCCUPIED", "Mesa com atendimento ativo não pode ficar indisponível.");
    }
    table.changeAvailability(availability);
    return table;
  }

  @Transactional
  public DiningTable changeStatus(
      UUID userId, UUID establishmentId, UUID tableId, DiningStatus status, Integer version) {
    access.requireManage(userId, establishmentId);
    DiningTable table = lockTable(establishmentId, tableId);
    assertCurrentVersion(table.version(), version);
    if (status == DiningStatus.INACTIVE && lockActive(establishmentId, tableId) != null) {
      throw ApiException.conflict("TABLE_OCCUPIED", "Mesa com atendimento ativo não pode ser desativada.");
    }
    table.changeStatus(status);
    return table;
  }

  @Transactional
  public TableService openService(UUID userId, UUID establishmentId, UUID tableId, int guests) {
    Establishment establishment = access.requireOperate(userId, establishmentId);
    DiningTable table = lockTable(establishmentId, tableId);
    if (!table.isActive()) {
      throw ApiException.unprocessable("TABLE_INACTIVE", "Mesa inativa não recebe atendimento.");
    }
    if (table.availability() == TableAvailability.UNAVAILABLE) {
      throw ApiException.unprocessable("TABLE_UNAVAILABLE", "Mesa indisponível não recebe atendimento.");
    }
    if (lockActive(establishmentId, tableId) != null) {
      throw occupied();
    }
    if (guests > table.seats()) {
      throw ApiException.unprocessable(
          "GUESTS_EXCEED_CAPACITY", "A quantidade de pessoas excede a capacidade da mesa.");
    }
    UserAccount user = users.findById(userId).orElseThrow(ApiException::notFound);
    table.consumeReservation();
    TableService service =
        TableService.open(
            table.id(),
            establishment.id(),
            establishment.organizationId(),
            guests,
            user.id(),
            user.name());
    try {
      return services.saveAndFlush(service);
    } catch (DataIntegrityViolationException ignored) {
      throw occupied();
    }
  }

  @Transactional
  public TableService requestBill(UUID userId, UUID establishmentId, UUID tableId) {
    access.requireOperate(userId, establishmentId);
    lockTable(establishmentId, tableId);
    TableService service = requireLockedActive(establishmentId, tableId);
    if (service.status() != TableServiceStatus.OPEN) {
      throw ApiException.unprocessable("SERVICE_NOT_OPEN", "Só é possível pedir conta em atendimento aberto.");
    }
    service.requestBill();
    return service;
  }

  @Transactional
  public TableService reopenService(UUID userId, UUID establishmentId, UUID tableId) {
    access.requireOperate(userId, establishmentId);
    lockTable(establishmentId, tableId);
    TableService service = requireLockedActive(establishmentId, tableId);
    if (service.status() != TableServiceStatus.AWAITING_BILL) {
      throw ApiException.unprocessable(
          "SERVICE_NOT_AWAITING_BILL", "Só é possível reabrir um atendimento que aguarda a conta.");
    }
    service.reopen();
    return service;
  }

  @Transactional
  public TableService closeService(UUID userId, UUID establishmentId, UUID tableId) {
    access.requireOperate(userId, establishmentId);
    lockTable(establishmentId, tableId);
    requireLockedActive(establishmentId, tableId);
    throw ApiException.conflict(
        "CLOSE_REQUIRES_SETTLEMENT",
        "O encerramento da mesa depende da quitação no módulo de caixa. Esta etapa não fecha atendimento.");
  }

  private DiningTable lockTable(UUID establishmentId, UUID tableId) {
    return tables
        .lockByIdAndEstablishmentId(tableId, establishmentId)
        .orElseThrow(ApiException::notFound);
  }

  private TableService lockActive(UUID establishmentId, UUID tableId) {
    return services
        .lockActiveByTable(tableId, establishmentId, DiningQueryService.ACTIVE)
        .orElse(null);
  }

  private TableService requireLockedActive(UUID establishmentId, UUID tableId) {
    TableService service = lockActive(establishmentId, tableId);
    if (service == null) {
      throw ApiException.notFound();
    }
    return service;
  }

  private void requireUniqueNumber(UUID establishmentId, int number, UUID tableId) {
    boolean taken =
        tableId == null
            ? tables.existsByEstablishmentIdAndNumber(establishmentId, number)
            : tables.existsByEstablishmentIdAndNumberAndIdNot(establishmentId, number, tableId);
    if (taken) {
      throw ApiException.conflict("TABLE_NUMBER_TAKEN", "Já existe uma mesa com este número neste estabelecimento.");
    }
  }

  private static void assertCurrentVersion(int current, Integer expected) {
    if (expected != null && expected != current) {
      throw ApiException.staleVersion();
    }
  }

  private static ApiException occupied() {
    return ApiException.conflict("TABLE_OCCUPIED", "A mesa já possui um atendimento ativo.");
  }

  public record TableCommand(
      int number,
      String name,
      int seats,
      String area,
      Integer layoutX,
      Integer layoutY,
      TableAvailability availability,
      Integer version) {}
}
