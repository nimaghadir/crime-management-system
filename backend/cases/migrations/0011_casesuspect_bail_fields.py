from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("cases", "0010_casesuspect_tracking_timestamps"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="casesuspect",
            name="bail_amount",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True),
        ),
        migrations.AddField(
            model_name="casesuspect",
            name="bail_notes",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="casesuspect",
            name="bail_paid_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="casesuspect",
            name="bail_set_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="casesuspect",
            name="bail_set_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="bail_amounts_set_for_suspects", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="casesuspect",
            name="released_on_bail",
            field=models.BooleanField(default=False),
        ),
    ]

