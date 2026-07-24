# So `terraform show -json` on a saved plan exposes the fully-merged, fully-validated data --
# e.g. `terraform plan -out=tfplan && terraform show -json tfplan`, consumed by
# ../../scripts/check_team_hierarchy.py.

output "formal_position_types" {
  value = module.org.formal_position_types
}

output "authority_line_types" {
  value = module.org.authority_line_types
}

output "team_types" {
  value = module.org.team_types
}

output "component_types" {
  value = module.org.component_types
}

output "people" {
  value = module.org.people
}

output "roles" {
  value = module.org.roles
}

output "teams" {
  value = module.org.teams
}

output "authority_lines" {
  value = module.org.authority_lines
}

output "components" {
  value = module.org.components
}
