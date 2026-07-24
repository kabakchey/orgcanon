# So `terraform show -json` on a saved plan exposes the fully-merged, fully-validated data --
# e.g. scripts/check_team_hierarchy.py reads `teams` this way instead of parsing .tf files or
# reimplementing ../main.tf's merge() logic.

output "formal_position_types" {
  value = var.formal_position_types
}

output "authority_line_types" {
  value = var.authority_line_types
}

output "team_types" {
  value = var.team_types
}

output "component_types" {
  value = var.component_types
}

output "people" {
  value = var.people
}

output "roles" {
  value = var.roles
}

output "teams" {
  value = var.teams
}

output "authority_lines" {
  value = var.authority_lines
}

output "components" {
  value = var.components
}

output "retirement_confirmations" {
  value = var.retirement_confirmations
}
