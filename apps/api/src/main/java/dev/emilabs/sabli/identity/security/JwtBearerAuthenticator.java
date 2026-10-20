package dev.emilabs.sabli.identity.security;

import dev.emilabs.sabli.identity.domain.AccountStatus;
import dev.emilabs.sabli.identity.persistence.UserAccountRepository;
import dev.emilabs.sabli.shared.security.AuthenticatedUser;
import dev.emilabs.sabli.shared.security.BearerAuthenticator;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class JwtBearerAuthenticator implements BearerAuthenticator {

  private final JwtService jwtService;
  private final UserAccountRepository users;

  public JwtBearerAuthenticator(JwtService jwtService, UserAccountRepository users) {
    this.jwtService = jwtService;
    this.users = users;
  }

  @Override
  public Optional<AuthenticatedUser> authenticate(String bearerToken) {
    return jwtService
        .parseAccessToken(bearerToken)
        .flatMap(users::findById)
        .filter(user -> user.status() == AccountStatus.ACTIVE)
        .map(user -> new AuthenticatedUser(user.id(), user.email()));
  }
}
