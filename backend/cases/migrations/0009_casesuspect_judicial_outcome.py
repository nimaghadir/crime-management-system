from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cases", "0008_case_assigned_chief"),
    ]

    operations = [
        migrations.AddField(
            model_name="casesuspect",
            name="judicial_outcome",
            field=models.CharField(
                choices=[("pending", "Pending"), ("convicted", "Convicted"), ("acquitted", "Acquitted")],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="casesuspect",
            name="judicial_decided_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

