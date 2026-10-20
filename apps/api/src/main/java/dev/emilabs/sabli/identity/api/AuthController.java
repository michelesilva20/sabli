package dev.emilabs.sabli.identity.api;

import dev.emilabs.sabli.identity.api.IdentityDtos.LoginRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.LogoutRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.RefreshRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.RegisterOrganizationRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.TokenResponse;
import dev.emilabs.sabli.identity.application.AuthService;
import dev.emilabs.sabli.identity.application.AuthService.RegisterOrganizationCommand;
import dev.emilabs.sabli.identity.application.AuthService.TokenBundle;
import dev.emilabs.sabli.identity.security.RefreshCookie;
import dev.emilabs.sabli.shared.error.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Auth")
public class AuthController {

  private final AuthService authService;
  private final RefreshCookie refreshCookie;

  public AuthController(AuthService authService, RefreshCookie refreshCookie) {
    this.authService = authService;
    this.refreshCookie = refreshCookie;
  }

  @PostMapping("/register-organization")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Cadastra organização, estabelecimento inicial e administrador")
  public TokenResponse register(
      @Valid @RequestBody RegisterOrganizationRequest request, HttpServletResponse response) {
    return tokens(
        authService.registerOrganization(
            new RegisterOrganizationCommand(
                request.organizationName(),
                request.organizationSlug(),
                request.establishmentName(),
                request.establishmentSlug(),
                request.name(),
                request.email(),
                request.password(),
                request.bootstrapToken())),
        response);
  }

  @PostMapping("/login")
  @Operation(summary = "Autentica por e-mail e senha")
  public TokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    return tokens(authService.login(request.email(), request.password()), response);
  }

  @PostMapping("/refresh")
  @Operation(summary = "Rotaciona o refresh token do cookie HttpOnly e emite novo acesso")
  public TokenResponse refresh(
      @RequestBody(required = false) RefreshRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    String presented = refreshCookie.read(httpRequest, request == null ? null : request.refreshToken());
    if (presented == null) {
      throw ApiException.invalidCredentials();
    }
    return tokens(authService.refresh(presented), response);
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Revoga o refresh token do cookie e limpa a sessão")
  public void logout(
      @RequestBody(required = false) LogoutRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {
    String presented = refreshCookie.read(httpRequest, request == null ? null : request.refreshToken());
    if (presented != null) {
      authService.logout(presented);
    }
    refreshCookie.clear(response);
  }

  private TokenResponse tokens(TokenBundle bundle, HttpServletResponse response) {
    refreshCookie.write(response, bundle.refreshToken());
    return TokenResponse.from(bundle);
  }
}
