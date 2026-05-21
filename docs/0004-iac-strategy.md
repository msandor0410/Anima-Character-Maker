# ADR 0004 – IaC stratégia (Terraform Plan-Only, CI-követelményre)

## Kontextus

A Sprint 2 követelményei alapján Terraform használata szükséges, de **csak a `validate` és `plan` futtatása kötelező**, `apply` nem.

A jelenlegi projektben a valós infrastruktúra (Firebase projekt, Auth, Firestore, Hosting) **nem Terraformral van menedzselve Sprint 2-ben**, mert:

- az MVP cél **gyors iteráció és minimális infra overhead**,
- a kurzus követelménye plan-only, nem tényleges provisioning.

## Döntés

A Terraform konfiguráció **minimális plan-only** jellegű lesz:

- Provider: `null` / `local` (vagy bármely “safe” provider, ami nem igényel felhős kredenciált)
- 1 db erőforrás:
  - `null_resource` (pl. egy “placeholder” triggerrel), vagy
  - `local_file` (pl. generál egy `terraform-plan-artifact.txt` jellegű fájlt a plan-ban)
- CI lépések:
  - `terraform fmt -check`
  - `terraform validate`
  - `terraform plan` (exit code 0)

## Indoklás

- A projekt jelenleg **nem igényel valós infra provisioninget** Sprint 2-ben (Firebase szolgáltatások kezelése külön folyamat).
- A plan-only megoldás **teljesíti a tárgyi követelményt** minimális kockázattal.
- CI-ben gyors és determinisztikus, nincs felhős hozzáférés / secret kezelési kényszer.

## Alternatívák

- **Valós GCP/AWS/Azure erőforrások Terraformmal:** túl nagy többletterhelés (kredenciál, billing, policy-k).
- **Firebase menedzsment Terraformmal (3rd party provider / bonyolultabb setup):** Sprint 2-höz képest túl komplex.
- **Docker Compose stack IaC-ként:** itt nem releváns (nincs klasszikus DB+API konténer MVP-ben).

## Következmények

- Terraform **nem hoz létre valós erőforrást**.
- Megteremti a jövőbeli IaC bővítés alapját (ha később kell staging környezet / preview csatorna / policy-k).
- A CI “Infrastructure as Code” ellenőrzése teljesül a kurzus elvárása szerint.
