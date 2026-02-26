from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cases", "0011_casesuspect_bail_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="casesuspect",
            name="bail_payment_authority",
            field=models.CharField(blank=True, max_length=128),
        ),
        migrations.AddField(
            model_name="casesuspect",
            name="bail_payment_initiated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="casesuspect",
            name="bail_payment_ref_id",
            field=models.CharField(blank=True, max_length=128),
        ),
    ]
