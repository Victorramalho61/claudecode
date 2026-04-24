import logging
from typing import Optional

from ldap3 import NONE, Connection, Server
from ldap3.core.exceptions import LDAPException

logger = logging.getLogger(__name__)


def authenticate_ldap(
    username: str,
    password: str,
    server_url: str,
    domain: str,
    base_dn: str,
) -> Optional[dict[str, str]]:
    try:
        server = Server(server_url, get_info=NONE)
        conn = Connection(server, user=f"{domain}\\{username}", password=password, auto_bind=True)

        conn.search(base_dn, f"(sAMAccountName={username})", attributes=["displayName", "mail"])

        display_name = username
        email = f"{username}@{domain.lower()}"

        if conn.entries:
            entry = conn.entries[0]
            if entry.displayName:
                display_name = str(entry.displayName)
            if entry.mail:
                email = str(entry.mail)

        conn.unbind()
        return {"username": username, "display_name": display_name, "email": email}

    except LDAPException as e:
        logger.warning("LDAP auth failed for %s: %s", username, e)
        return None
