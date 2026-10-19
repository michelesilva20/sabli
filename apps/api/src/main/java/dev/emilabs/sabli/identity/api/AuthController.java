package dev.emilabs.sabli.identity.api;

import dev.emilabs.sabli.identity.api.IdentityDtos.LoginRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.LogoutRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.RefreshRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.RegisterOrganizationRequest;
import dev.emilabs.sabli.identity.api.IdentityDtos.TokenResponse;
import dev.emilabs.sabli.identity.application.AuthService;
import dev.emilabs.sabli.identity.application.AuthService.RegisterOrganizationCommand;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/register-organization")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Cadastra organização, estabelecimento inicial e administrador")
  public TokenResponse register(@Valid @RequestBody RegisterOrganizationRequest request) {
    return TokenResponse.from(
        authService.registerOrganization(
            new RegisterOrganizationCommand(
                request.organizationName(),
                request.organizationSlug(),
                request.establishmentName(),
                request.establishmentSlug(),
                request.name(),
                request.email(),
                request.password(),
                request.bootstrapToken())));
  }

  @PostMapping("/login")
  @Operation(summary = "Autentica por e-mail e senha")
  public TokenResponse login(@Valid @RequestBody LoginRequest request) {
    return TokenResponse.from(authService.login(request.email(), request.password()));
  }

  @PostMapping("/refresh")
  @Operation(summary = "Rotaciona o refresh token e emite novo acesso")
  public TokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
    return TokenResponse.from(authService.refresh(request.refreshToken()));
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Revoga o refresh token apresentado")
  public void logout(@Valid @RequestBody LogoutRequest request) {
    authService.logout(request.refreshToken());
  }
}
