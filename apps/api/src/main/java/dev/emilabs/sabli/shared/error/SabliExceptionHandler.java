package dev.emilabs.sabli.shared.error;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class SabliExceptionHandler {

  @ExceptionHandler(ApiException.class)
  ProblemDetail handleApi(ApiException exception) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(exception.status(), exception.getMessage());
    problem.setTitle(exception.title());
    problem.setProperty("code", exception.code());
    exception.properties().forEach(problem::setProperty);
    return problem;
  }

  @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
  ProblemDetail handleValidation(Exception ignored) {
    ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
    problem.setTitle("Solicitação inválida");
    problem.setDetail("Um ou mais campos são inválidos.");
    problem.setProperty("code", "VALIDATION");
    return problem;
  }

  @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
  ProblemDetail handleStale(ObjectOptimisticLockingFailureException ignored) {
    return handleApi(ApiException.staleVersion());
  }

  @ExceptionHandler(Exception.class)
  ProblemDetail handleUnexpected(Exception ignored) {
    ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    problem.setTitle("Erro interno");
    problem.setDetail("A solicitação não pôde ser concluída.");
    return problem;
  }
}
