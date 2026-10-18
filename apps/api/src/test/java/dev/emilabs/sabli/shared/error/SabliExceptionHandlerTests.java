package dev.emilabs.sabli.shared.error;

import dev.emilabs.sabli.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(SabliExceptionHandlerTests.BoomConfiguration.class)
class SabliExceptionHandlerTests extends AbstractIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @WithMockUser
  void unexpectedErrorDoesNotLeakInternalDetails() throws Exception {
    mockMvc
        .perform(get("/__test/boom").accept(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.title").value("Erro interno"))
        .andExpect(jsonPath("$.detail").value("A solicitação não pôde ser concluída."))
        .andExpect(jsonPath("$.detail", not(containsString("segredo-interno"))))
        .andExpect(jsonPath("$.trace").doesNotExist());
  }

  @TestConfiguration
  static class BoomConfiguration {
    @RestController
    static class BoomController {
      @GetMapping("/__test/boom")
      void boom() {
        throw new IllegalStateException("segredo-interno");
      }
    }
  }
}
