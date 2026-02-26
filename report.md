# Project Report
## Students
Amirmohammad Kooshky - 400109673

Mohsen Ghasemi - 400105166

Nima Ghadirniya - 402111323


## Task Allocation
### Design of Entities:
all members participated to draw out the entities of the project.

### Design of Django Apps:
all members participated to draw out the design

### Implementation of Initial Django Models:
Kooshky and Ghasemi (separated by apps)

### Creation of scripts that build context for LLMs:
Kooshky and Ghasemi: the scripts coalesced the project's code files into the same file that could be fed into an LLM.

### Implementation of Serializers and Views:
Kooshky and Ghasemi (separated by apps)

### Testing of API's using curl and POSTMAN:
Ghadirniya (so he is onboarded to the backend and can connect to front)

### Testing of API's using automated library (Unit Tests):
Ghadirniya and Ghasemi

### Frontend
TODO

### Testing of the Frontend:
Kooshky and Ghasemi (to understand how the frontend is written)

### Connecting to Payment API:
Assigned to Ghasemi (if we had enough time)


## Development Agreements:
### Commits and Git
At first commits were just required to be clean and descriptive. later we switched to conventional commits for the frontend (Ghadirniya)

Merge requests were peer reviewed (especially on the backend)

### Variable Naming

The project follows standard Python and Django naming conventions, and these rules were explicitly defined and provided to the LLM during development to ensure generated code remained consistent with the existing codebase.

For **Python variables, functions, and methods**, `snake_case` naming is used throughout the project. Variable names are descriptive and reflect domain concepts rather than implementation details (e.g., `assigned_detective`, `arrest_status`, `crime_level_weight`). Temporary or computed values are named according to their semantic meaning, such as `tracking_started_at`, `ranking_score`, and `reward_amount_rial`.

For **classes and Django models**, `PascalCase` is used, following Django conventions. Model names represent real-world entities in the crime management domain, such as `Case`, `CaseSuspect`, `Complainant`, `RewardTip`, and `InvestigationAction`. View and serializer classes clearly indicate their responsibility using suffixes like `View`, `ListView`, `DetailView`, `Serializer`, or `ViewSet` (e.g., `CaseReportView`, `CaseSuspectCreateUpdateView`).

**Constants and role identifiers** are written in uppercase with underscores and centralized in dedicated modules to avoid magic strings and improve maintainability. Examples include `DETECTIVE`, `POLICE_CHIEF`, `CAPTAIN`, and status values such as `OPEN`, `UNDER_INVESTIGATION`, and `ARRESTED`.

For **Django relationships**, field names and `related_name` values are chosen to be explicit and readable when traversing relations in queries and serializers. For example, `assigned_detective`, `sergeant_cases`, `detective_cases`, and `testimonies` clearly describe the direction and meaning of each relationship. Plural forms are consistently used for reverse relations to reflect collections.

**API-related variables and serializer fields** mirror model field names whenever possible, ensuring a predictable mapping between database models, serializers, and JSON responses. This reduces cognitive overhead for both frontend integration and future maintenance.

By defining and enforcing these naming conventions early, and by feeding them as explicit constraints to the LLM during code generation, the team ensured that AI-assisted code blended seamlessly with manually written code and adhered to Django and Python best practices across the entire project.


Front: TODO

