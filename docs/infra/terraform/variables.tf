variable "project_name" {
  description = "Logikai projektnév (repo / Firebase alias szintű azonosításhoz)."
  type        = string
  default     = "anima-builder"
}

variable "preview_url" {
  description = "Lokális dev-preview URL (Vite dev server)."
  type        = string
  default     = "http://localhost:5173"
}

variable "plan_artifact_path" {
  description = "A local_file által tervezett (apply esetén létrejövő) artifact fájl neve/útvonala."
  type        = string
  default     = "terraform-plan-artifact.txt"
}
