# Terraform – Sprint 2 (Plan-Only) – Anima Character Builder

Ez a könyvtár egy **minimális Terraform konfigurációt** tartalmaz, ami teljesíti a Sprint 2 IaC követelményeit:
- `terraform fmt -check`
- `terraform validate`
- `terraform plan`

A jelenlegi MVP technikai stackje: **React (Vite) + Firebase (Auth + Firestore + Hosting)**.  
**Fontos:** a Firebase erőforrások **nincsenek Terraformral menedzselve** ebben a sprintben.

## Tartalom
- `main.tf` – plan-only placeholder erőforrások (`null_resource`, plusz egy safe `local_file`)
- `providers.tf` – `null` + `local` provider
- `variables.tf` – minimális változók (projektnév, preview URL, artifact útvonal)

## Futás (lokálisan / WebStorm-ból is)
```bash
terraform init
terraform fmt -check
terraform validate
terraform plan -out=plan.out
