import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cases", "0012_casesuspect_bail_gateway_fields"),
        ("investigations", "0002_investigationaction"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DetectiveBoardNote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("text", models.TextField()),
                ("pinned", models.BooleanField(default=False)),
                ("order_index", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "case",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="detective_board_notes",
                        to="cases.case",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="detective_board_notes_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["order_index", "id"]},
        ),
        migrations.CreateModel(
            name="DetectiveBoardRelation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source_evidence", models.PositiveIntegerField(blank=True, null=True)),
                ("source_suspect", models.PositiveIntegerField(blank=True, null=True)),
                ("target_evidence", models.PositiveIntegerField(blank=True, null=True)),
                ("target_suspect", models.PositiveIntegerField(blank=True, null=True)),
                ("annotation", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "case",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="detective_board_relations",
                        to="cases.case",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="detective_board_relations_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "source_note",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="outgoing_relations",
                        to="investigations.detectiveboardnote",
                    ),
                ),
                (
                    "target_note",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="incoming_relations",
                        to="investigations.detectiveboardnote",
                    ),
                ),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.AddIndex(
            model_name="detectiveboardnote",
            index=models.Index(fields=["case", "order_index"], name="investigatio_case_id_f4e08f_idx"),
        ),
        migrations.AddIndex(
            model_name="detectiveboardrelation",
            index=models.Index(fields=["case", "id"], name="investigatio_case_id_2877ea_idx"),
        ),
    ]

