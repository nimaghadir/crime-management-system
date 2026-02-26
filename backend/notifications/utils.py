from typing import Iterable

from .models import Notification


def notify_user(recipient, title, body, notif_type=Notification.NotifType.GENERAL, link=""):
    if recipient is None:
        return None
    return Notification.objects.create(
        recipient=recipient,
        notif_type=notif_type,
        title=str(title or "").strip()[:255],
        body=str(body or "").strip(),
        link=str(link or "").strip(),
    )


def notify_case(recipient, case_id, title, body, notif_type=Notification.NotifType.CASE_UPDATED):
    if recipient is None:
        return None
    return notify_user(
        recipient=recipient,
        title=title,
        body=body,
        notif_type=notif_type,
        link=f"/cases/{int(case_id)}/" if case_id else "",
    )


def notify_many_case(recipients: Iterable, case_id, title, body, notif_type=Notification.NotifType.CASE_UPDATED):
    seen_ids = set()
    created = []
    for recipient in recipients or []:
        if recipient is None:
            continue
        recipient_id = getattr(recipient, "id", None)
        if not recipient_id or recipient_id in seen_ids:
            continue
        seen_ids.add(recipient_id)
        row = notify_case(recipient, case_id, title, body, notif_type=notif_type)
        if row:
            created.append(row)
    return created
