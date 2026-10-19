package dev.emilabs.sabli.catalog.api;

import dev.emilabs.sabli.catalog.api.CatalogDtos.CategoryRequest;
import dev.emilabs.sabli.catalog.api.CatalogDtos.CategoryResponse;
import dev.emilabs.sabli.catalog.api.CatalogDtos.StatusRequest;
import dev.emilabs.sabli.catalog.application.CatalogCommandService;
import dev.emilabs.sabli.catalog.application.CatalogQueryService;
import dev.emilabs.sabli.shared.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/establishments/{establishmentId}/catalog/categories")
@Tag(name = "Catalog")
public class CatalogCategoryController {

  private final CurrentUser currentUser;
  private final CatalogQueryService queries;
  private final CatalogCommandService commands;

  public CatalogCategoryController(
      CurrentUser currentUser, CatalogQueryService queries, CatalogCommandService commands) {
    this.currentUser = currentUser;
    this.queries = queries;
    this.commands = commands;
  }

  @GetMapping
  @Operation(summary = "Lista categorias do estabelecimento")
  public List<CategoryResponse> list(
      @PathVariable UUID establishmentId, @RequestParam(defaultValue = "false") boolean includeInactive) {
    return queries.listCategories(currentUser.requireUserId(), establishmentId, includeInactive).stream()
        .map(CategoryResponse::from)
        .toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Cria categoria")
  public CategoryResponse create(@PathVariable UUID establishmentId, @Valid @RequestBody CategoryRequest request) {
    return CategoryResponse.from(
        commands.createCategory(currentUser.requireUserId(), establishmentId, request.toCommand()));
  }

  @PatchMapping("/{categoryId}")
  @Operation(summary = "Edita categoria")
  public CategoryResponse update(
      @PathVariable UUID establishmentId,
      @PathVariable UUID categoryId,
      @Valid @RequestBody CategoryRequest request) {
    return CategoryResponse.from(
        commands.updateCategory(currentUser.requireUserId(), establishmentId, categoryId, request.toCommand()));
  }

  @PatchMapping("/{categoryId}/status")
  @Operation(summary = "Ativa ou desativa categoria")
  public CategoryResponse changeStatus(
      @PathVariable UUID establishmentId,
      @PathVariable UUID categoryId,
      @Valid @RequestBody StatusRequest request) {
    return CategoryResponse.from(
        commands.changeCategoryStatus(currentUser.requireUserId(), establishmentId, categoryId, request.status()));
  }
}
