package dev.emilabs.sabli.identity.security;

import dev.emilabs.sabli.shared.config.SabliCorsProperties;
import dev.emilabs.sabli.shared.error.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class CookieCsrfGuard {

  private final SabliCorsProperties cors;

  public CookieCsrfGuard(SabliCorsProperties cors) {
    this.cors = cors;
  }

  public void assertAllowed(HttpServletRequest request, boolean cookieCredential) {
    if (!cookieCredential) {
      return;
    }
    String origin = request.getHeader("Origin");
    if (!StringUtils.hasText(origin)) {
      return;
    }
    if (!cors.allowedOrigins().contains(origin)) {
      throw new ApiException(
          org.springframework.http.HttpStatus.FORBIDDEN,
          "Origem recusada",
          "CSRF_ORIGIN",
          "O cookie de sessão não pode ser usado a partir desta origem.");
    }
  }
}
