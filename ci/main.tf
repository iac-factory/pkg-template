terraform {
    required_providers {
        gitlab = { source = "gitlabhq/gitlab" }
        github = {
            source  = "integrations/github"
            version = "~> 4"
        }
    }

    backend "local" {
        path = "terraform.state.json"
    }
}

variable "owner" { default = "iac-factory" }
variable "template" { default = [ ] }
variable "topics" { default = [ "version-control", "terraform", "github", "auto-generated" ] }
variable "license" { default = "BSD-2-Clause" }
variable "username" { default = "Segmentational" }

variable "token" { sensitive = true }

variable "repository" {
    description = "The Projected Name of the Repository"
    type = string
}

variable "auto-archive" {
    description = "Auto-Archive Upon Destruction ( true || false )"
    type        = bool
    validation {
        condition     = var.auto-archive == true || var.auto-archive == false || var.auto-archive == "true" || var.auto-archive == "false"
        error_message = "Value must be of type Boolean ( true || false )."
    }
}

locals {
    owner      = { name = var.owner }
    repository = { name = var.repository }

    /// Ensure topics include reference to organization name; useful
    /// for search queries if the repository is set to public
    topics = concat(var.topics, [ local.owner.name ])
}

data "github_user" "creator" {
    username = var.username
}

resource "github_repository" "repository" {
    name                 = local.repository.name
    visibility           = "public"
    vulnerability_alerts = true

    // https://github.com/github/choosealicense.com/tree/gh-pages/_licenses
    license_template = var.license

    // https://github.com/github/gitignore
    gitignore_template = "Node"

    has_issues = true

    /*** @deprecated */
    has_downloads = false
    has_projects  = false
    has_wiki      = true

    homepage_url = join("/", [ "https:/", "github.com", local.owner.name, local.repository.name ])

    is_template = false

    archived           = false
    archive_on_destroy = var.auto-archive

    topics = local.topics

    // The most concise as it relate to git's DAG history
    allow_squash_merge = true

    allow_auto_merge   = false
    allow_merge_commit = false
    allow_rebase_merge = false

    delete_branch_on_merge = true

    dynamic "template" {
        for_each = var.template
        iterator = idx
        content {
            owner      = local.owner.name
            repository = idx.value
        }
    }

    auto_init = true

    ignore_vulnerability_alerts_during_read = true
}

resource "github_branch_default" "branch" {
    branch     = "Development"
    repository = github_repository.repository.name
}

resource "github_branch_protection" "protection" {
    repository_id = github_repository.repository.node_id

    pattern          = github_branch_default.branch.branch
    enforce_admins   = true
    allows_deletions = true

    required_status_checks {
        strict = false
    }

    required_pull_request_reviews {
        dismiss_stale_reviews  = true
        restrict_dismissals    = true
        dismissal_restrictions = [ ]
    }

    push_restrictions = [
        # limited to a list of one type of restriction (user, team, app)
        # github_team.example.node_id
        data.github_user.creator.node_id
    ]
}

output "workspace" {
    description = "The local Terraform stateful workspace"
    value       = terraform.workspace
}

output "repository" {
    description = "GitHub repository information"
    value       = {
        definition = github_repository.repository
        branch     = {
            definition = github_branch_default.branch
            protection = github_branch_protection.protection
        }
    }
}

output "organization" {
    description = "The user-provided github.com organization"
    value       = var.owner
}

provider "github" {
    owner = var.owner
    token = var.token
}

provider "terraform" {}
provider "external" {}
provider "archive" {}
provider "random" {}
provider "local" {}
provider "http" {}
provider "null" {}
provider "aws" {}
