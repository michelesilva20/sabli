package dev.emilabs.sabli.dining;

import dev.emilabs.sabli.dining.domain.DiningTable;
import dev.emilabs.sabli.dining.domain.Occupancy;
import dev.emilabs.sabli.dining.domain.TableAvailability;
import dev.emilabs.sabli.dining.domain.TableOccupancy;
import dev.emilabs.sabli.dining.domain.TableService;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OccupancyTests {

  @Test
  void derivesOccupancyFromCadastroAndActiveService() {
    UUID est = UUID.randomUUID();
    UUID org = UUID.randomUUID();
    DiningTable available = DiningTable.create(est, org, 1, null, 4, "Salão", 10, 20, TableAvailability.AVAILABLE);
    DiningTable reserved = DiningTable.create(est, org, 2, null, 4, "Salão", 10, 20, TableAvailability.RESERVED);
    DiningTable blocked = DiningTable.create(est, org, 3, null, 4, "Salão", 10, 20, TableAvailability.UNAVAILABLE);
    DiningTable inactive = DiningTable.create(est, org, 4, null, 4, "Salão", 10, 20, TableAvailability.AVAILABLE);
    inactive.changeStatus(dev.emilabs.sabli.dining.domain.DiningStatus.INACTIVE);

    TableService open = TableService.open(available.id(), est, org, 2, UUID.randomUUID(), "Mariana");
    TableService awaiting = TableService.open(available.id(), est, org, 2, UUID.randomUUID(), "Mariana");
    awaiting.requestBill();

    assertThat(Occupancy.of(available, null)).isEqualTo(TableOccupancy.AVAILABLE);
    assertThat(Occupancy.of(reserved, null)).isEqualTo(TableOccupancy.RESERVED);
    assertThat(Occupancy.of(blocked, null)).isEqualTo(TableOccupancy.UNAVAILABLE);
    assertThat(Occupancy.of(inactive, null)).isEqualTo(TableOccupancy.UNAVAILABLE);
    assertThat(Occupancy.of(available, open)).isEqualTo(TableOccupancy.OCCUPIED);
    assertThat(Occupancy.of(available, awaiting)).isEqualTo(TableOccupancy.AWAITING_BILL);
  }
}
