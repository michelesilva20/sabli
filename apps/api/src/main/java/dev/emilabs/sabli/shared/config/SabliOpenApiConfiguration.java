package dev.emilabs.sabli.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SabliOpenApiConfiguration {

  @Bean
  OpenAPI sabliOpenApi() {
    return new OpenAPI()
        .info(
            new Info()
                .title("Sabli API")
                .version("0.1.0")
                .description(
                    "Fundação do backend Sabli. Sem autenticação, RBAC ou operações de negócio neste checkpoint."));
  }
}
