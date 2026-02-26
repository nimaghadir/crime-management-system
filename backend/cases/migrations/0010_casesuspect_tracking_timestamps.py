from django.db import migrations, models
import django.utils.timezone


def backfill_casesuspect_tracking_timestamps(apps, schema_editor):
    CaseSuspect = apps.get_model("cases", "CaseSuspect")

    under_pursuit_statuses = {"awaiting_sergeant", "warrant_issued"}
    post_pursuit_statuses = {"arrested", "awaiting_captain", "awaiting_chief", "on_trial", "free", "released"}

    for row in CaseSuspect.objects.select_related("case").all():
        changed = []

        case_created = getattr(getattr(row, "case", None), "created_at", None)
        case_updated = getattr(getattr(row, "case", None), "updated_at", None)

        if case_created and getattr(row, "identified_at", None) != case_created:
            row.identified_at = case_created
            changed.append("identified_at")

        status = str(getattr(row, "arrest_status", "") or "").strip().lower()

        if (
            status in {"arrested", "awaiting_captain", "awaiting_chief", "on_trial"}
            and not getattr(row, "arrested_at", None)
        ):
            fallback_arrested = getattr(row, "arrest_warrant_issued_at", None) or case_updated or case_created
            if fallback_arrested:
                row.arrested_at = fallback_arrested
                changed.append("arrested_at")

        if status in post_pursuit_statuses and not getattr(row, "under_pursuit_ended_at", None):
            fallback_end = (
                getattr(row, "arrested_at", None)
                or getattr(row, "judicial_decided_at", None)
                or case_updated
                or getattr(row, "arrest_warrant_issued_at", None)
                or case_created
            )
            if fallback_end:
                row.under_pursuit_ended_at = fallback_end
                changed.append("under_pursuit_ended_at")

        if status in under_pursuit_statuses and getattr(row, "under_pursuit_ended_at", None):
            # Keep active pursuit rows open-ended.
            row.under_pursuit_ended_at = None
            changed.append("under_pursuit_ended_at")

        if changed:
            row.save(update_fields=sorted(set(changed)))


class Migration(migrations.Migration):
    dependencies = [
        ("cases", "0009_casesuspect_judicial_outcome"),
    ]

    operations = [
        migrations.AddField(
            model_name="casesuspect",
            name="identified_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="casesuspect",
            name="arrested_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="casesuspect",
            name="under_pursuit_ended_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_casesuspect_tracking_timestamps, migrations.RunPython.noop),
    ]

