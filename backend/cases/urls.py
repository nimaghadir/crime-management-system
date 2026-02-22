# cases/urls.py

from django.urls import path
from .views import (
    CaseListCreateView, CaseDetailView, CaseReviewView,
    CaseResolutionView,
    SuspectListCreateView, SuspectDetailView,
    SuspectInterrogationView, SuspectArrestView,
    CaseStatisticsView, SuspectRankingView,
)

urlpatterns = [
    # Cases
    path('', CaseListCreateView.as_view(), name='case-list-create'),
    path('', CaseListCreateView.as_view(), name='case-list-create'),
    path("case-validation-reviews/", CaseValidationReviewListView.as_view(), name="case-validation-review-list",),
    path("case-validation-reviews/", CaseValidationReviewCreateView.as_view(), name="case-validation-review-create",),
    path("case-validation-review/<int:pk>/", CaseValidationReviewValidateView.as_view(), name="case-validation-review-validate"),
    path("cases/witnesses/", CaseWitnessCreateView.as_view(), name="case-witness-create"),
    path("cases/<int:pk>/witnesses/", CaseWitnessListView.as_view(), name="case-witness-list"),
]
