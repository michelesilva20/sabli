package dev.emilabs.sabli.shared.security;

import java.util.Optional;

public interface BearerAuthenticator {

  Optional<AuthenticatedUser> authenticate(String bearerToken);
}
