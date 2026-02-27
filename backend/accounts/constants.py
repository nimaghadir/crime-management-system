SYSTEM_ADMINISTRATOR = "System Administrator"
POLICE_CHIEF = "Police Chief"
CAPTAIN = "Captain"
SERGEANT = "Sergeant"
DETECTIVE = "Detective"
POLICE_OFFICER = "Police Officer"
CADET = "Cadet"
COMPLAINANT = "Complainant"
WITNESS = "Witness"
SUSPECT = "Suspect"
JUDGE = "Judge"
CORONER = "Coroner"
BASIC_USER = "Basic User"

ALL_ROLES = (
    SYSTEM_ADMINISTRATOR,
    POLICE_CHIEF,
    CAPTAIN,
    SERGEANT,
    DETECTIVE,
    POLICE_OFFICER,
    CADET,
    COMPLAINANT,
    WITNESS,
    SUSPECT,
    JUDGE,
    CORONER,
    BASIC_USER,
)

COP_ROLES = {
    SYSTEM_ADMINISTRATOR,
    POLICE_CHIEF,
    CAPTAIN,
    SERGEANT,
    DETECTIVE,
    POLICE_OFFICER,
    CADET,
}


def normalize_role_name(name):
    return str(name or "").replace("_", " ").replace("-", " ").strip().lower()


_KNOWN_ROLE_NAMES_NORMALIZED = {normalize_role_name(role_name) for role_name in ALL_ROLES}
_BASIC_USER_NORMALIZED = normalize_role_name(BASIC_USER)


def is_known_role_name(role_name):
    return normalize_role_name(role_name) in _KNOWN_ROLE_NAMES_NORMALIZED


def is_basic_user_role_name(role_name):
    return normalize_role_name(role_name) == _BASIC_USER_NORMALIZED


def select_primary_role_name(role_names):
    cleaned = [str(role).strip() for role in (role_names or []) if str(role or "").strip()]
    if not cleaned:
        return None
    for role_name in cleaned:
        if not is_basic_user_role_name(role_name):
            return role_name
    return cleaned[0]
