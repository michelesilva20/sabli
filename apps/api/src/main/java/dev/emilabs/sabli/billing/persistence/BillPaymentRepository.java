package dev.emilabs.sabli.billing.persistence;

import dev.emilabs.sabli.billing.domain.BillPayment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillPaymentRepository extends JpaRepository<BillPayment, UUID> {

  List<BillPayment> findByBillIdOrderByRecordedAtAscIdAsc(UUID billId);

  Optional<BillPayment> findByEstablishmentIdAndRecordedByUserIdAndIdempotencyKey(
      UUID establishmentId, UUID recordedByUserId, String idempotencyKey);
}
