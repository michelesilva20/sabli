package dev.emilabs.sabli.shared.error;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

  private final HttpStatus status;
  private final String title;
  private final String code;

  public ApiException(HttpStatus status, String title, String code, String detail) {
    super(detail);
    this.status = status;
    this.title = title;
    this.code = code;
  }

  public HttpStatus status() {
    return status;
  }

  public String title() {
    return title;
  }

  public String code() {
    return code;
  }

  public static ApiException unauthorized() {
    return new ApiException(
        HttpStatus.UNAUTHORIZED, "Não autenticado", "UNAUTHENTICATED", "A solicitação exige autenticação.");
  }

  public static ApiException invalidCredentials() {
    return new ApiException(
        HttpStatus.UNAUTHORIZED, "Credenciais inválidas", "INVALID_CREDENTIALS", "Não foi possível autenticar.");
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "Não encontrado", "NOT_FOUND", "O recurso não foi encontrado.");
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "Acesso negado", "FORBIDDEN", "Você não pode executar esta ação.");
  }

  public static ApiException tenantSuspended() {
    return new ApiException(
        HttpStatus.FORBIDDEN,
        "Tenant suspenso",
        "TENANT_SUSPENDED",
        "A organização ou o estabelecimento está suspenso.");
  }

  public static ApiException conflict(String detail) {
    return new ApiException(HttpStatus.CONFLICT, "Conflito", "CONFLICT", detail);
  }

  public static ApiException badRequest(String detail) {
    return new ApiException(HttpStatus.BAD_REQUEST, "Solicitação inválida", "BAD_REQUEST", detail);
  }
}
