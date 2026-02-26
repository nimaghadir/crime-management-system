# cases/urls.py

from django.urls import path
from .views import (
    CaseListCreateView,
    PublicOverviewView,
    CaseMyListView,
    CasePartialUpdateView,
    CaseWorkflowTransitionView,
    JoinCaseAsComplainantView,
    CaseValidationReviewListCreateView,
    CaseValidationReviewValidateView,
    CaseWitnessCreateView,
    CaseWitnessListView,
    WitnessCandidateListView,
    WitnessJoinCaseView,
)

urlpatterns = [
    # Cases
    path('', CaseListCreateView.as_view(), name='case-list-create'),
    path('public-overview/', PublicOverviewView.as_view(), name='case-public-overview'),
    path('my/', CaseMyListView.as_view(), name='case-list-my'),
    path('<int:pk>/transition/', CaseWorkflowTransitionView.as_view(), name='case-workflow-transition'),
    path('<int:pk>/', CasePartialUpdateView.as_view(), name='case-partial-update'),
    path('complainants/', JoinCaseAsComplainantView.as_view(), name='case-complainant-join'),
    path("case-validation-reviews/", CaseValidationReviewListCreateView.as_view(), name="case-validation-review-list-create",),
    path("case-validation-review/<int:pk>/", CaseValidationReviewValidateView.as_view(), name="case-validation-review-validate"),
    path("witness-candidates/", WitnessCandidateListView.as_view(), name="case-witness-candidates"),
    path("witnesses/join/", WitnessJoinCaseView.as_view(), name="case-witness-join"),
    path("witnesses/", CaseWitnessCreateView.as_view(), name="case-witness-create-clean"),
    path("cases/witnesses/", CaseWitnessCreateView.as_view(), name="case-witness-create"),
    path("cases/<int:pk>/witnesses/", CaseWitnessListView.as_view(), name="case-witness-list"),
]
