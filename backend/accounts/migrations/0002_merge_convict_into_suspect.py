from django.db import migrations


def merge_convict_group_into_suspect(apps, schema_editor):
    Group = apps.get_model("auth", "Group")

    convict_group = Group.objects.filter(name="Convict").first()
    if not convict_group:
        return

    suspect_group, _ = Group.objects.get_or_create(name="Suspect")

    for user in convict_group.user_set.all():
        user.groups.add(suspect_group)

    convict_group.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(merge_convict_group_into_suspect, migrations.RunPython.noop),
    ]
