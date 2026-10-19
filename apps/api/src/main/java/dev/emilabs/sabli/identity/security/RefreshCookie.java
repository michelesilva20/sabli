package dev.emilabs.sabli.identity.security;

import dev.emilabs.sabli.identity.config.IdentityProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class RefreshCookie {

  private final IdentityProperties properties;

  public RefreshCookie(IdentityProperties properties) {
    this.properties = properties;
  }

  public void write(HttpServletResponse response, String refreshToken) {
    response.addHeader(HttpHeaders.SET_COOKIE, cookie(refreshToken, properties.security().jwt().refreshTokenTtl()).toString());
  }

  public void clear(HttpServletResponse response) {
    response.addHeader(HttpHeaders.SET_COOKIE, cookie("", java.time.Duration.ZERO).toString());
  }

  public String read(HttpServletRequest request, String bodyToken) {
    if (StringUtils.hasText(bodyToken)) {
      return bodyToken.trim();
    }
    Cookie[] cookies = request.getCookies();
    if (cookies == null) {
      return null;
    }
    String name = properties.security().cookie().name();
    for (Cookie cookie : cookies) {
      if (name.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
        return cookie.getValue();
      }
    }
    return null;
  }

  private ResponseCookie cookie(String value, java.time.Duration maxAge) {
    var settings = properties.security().cookie();
    return ResponseCookie.from(settings.name(), value)
        .httpOnly(true)
        .secure(settings.secure())
        .sameSite(settings.sameSite())
        .path(settings.path())
        .maxAge(maxAge)
        .build();
  }
}
