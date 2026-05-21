terraform {
  required_version = ">= 1.5.0"

  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

locals {
  stack        = "react-vite-firebase"
  generated_at = timestamp()
}

resource "null_resource" "plan_only_check" {
  triggers = {
    project_name = var.project_name
    stack        = local.stack
    run_id       = local.generated_at
  }
}

resource "local_file" "plan_artifact" {
  filename = var.plan_artifact_path
  content  = <<EOT
Anima Character Builder — Terraform Plan-Only
project_name: ${var.project_name}
stack: ${local.stack}
preview_url: ${var.preview_url}
generated_at: ${local.generated_at}

notes:
- Sprint 2 követelmény: terraform fmt/validate/plan
- A Firebase (Auth/Firestore/Hosting) NINCS Terraformral provision-ölve ebben a sprintben.
EOT
}

output "plan_artifact_path" {
  value       = local_file.plan_artifact.filename
  description = "A plan-ban tervezett (apply esetén létrejövő) lokális artifact fájl útvonala."
}
