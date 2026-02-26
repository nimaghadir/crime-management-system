from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("evidence", "0004_alter_biologicalevidence_case_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="EvidenceAttachment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("evidence_type", models.CharField(choices=[("testimony", "Testimony"), ("bio_medical", "Biological / Medical"), ("vehicle", "Vehicle"), ("identity", "Identification Document"), ("other", "Other")], max_length=32)),
                ("evidence_id", models.PositiveBigIntegerField()),
                ("file", models.FileField(blank=True, null=True, upload_to="evidence/attachments/")),
                ("file_url", models.URLField(blank=True)),
                ("file_path", models.CharField(blank=True, max_length=512)),
                ("mime_type", models.CharField(blank=True, max_length=255)),
                ("original_name", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("uploaded_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="evidence_attachments_uploaded", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(
            model_name="evidenceattachment",
            index=models.Index(fields=["evidence_type", "evidence_id"], name="evidence_evi_evidenc_61e26f_idx"),
        ),
    ]
