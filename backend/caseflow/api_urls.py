from django.urls import include, path

urlpatterns = [
    path("v1/", include("caseflow.api_v1_urls")),
]
