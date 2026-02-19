from django.urls import include, path
from rest_framework import permissions, renderers
from rest_framework.schemas import get_schema_view

from . import api_v1_urls
from .api_docs import SwaggerUIView
from .api_schema import CaseflowSchemaGenerator

api_v1_schema_view = get_schema_view(
    title="Caseflow API",
    url="/api/",
    description="Crime management system API documentation.",
    version="v1",
    public=True,
    patterns=api_v1_urls.urlpatterns,
    generator_class=CaseflowSchemaGenerator,
    renderer_classes=[renderers.JSONOpenAPIRenderer],
    authentication_classes=[],
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path("schema/", api_v1_schema_view, name="api-schema"),
    path("docs/", SwaggerUIView.as_view(), name="api-docs"),
    path("", include("caseflow.api_v1_urls")),
]
