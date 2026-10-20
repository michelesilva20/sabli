package dev.emilabs.sabli.shared.error;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class SabliExceptionHandler {

  @ExceptionHandler(Exception.class)
  ProblemDetail handleUnexpected(Exception ignored) {
    ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    problem.setTitle("Erro interno");
    problem.setDetail("A solicitação não pôde ser concluída.");
    return problem;
  }
}
