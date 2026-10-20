package dev.emilabs.sabli.identity.persistence;

import dev.emilabs.sabli.identity.domain.UserAccount;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

  Optional<UserAccount> findByEmailNormalized(String emailNormalized);

  boolean existsByEmailNormalized(String emailNormalized);
}
