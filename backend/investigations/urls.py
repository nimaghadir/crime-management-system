from django.urls import path
from .views import (
    CaseReportView,
    AssignedCasesListView,
    CaseSuspectCreateUpdateView,
    ComplainantDetailView,
    CaseSuspectCreateUpdateView,
    CaseWitnessDetailView,
    RewardTipDetailView,
    UserDetailView,
)

urlpatterns = [
    path('cases/assigned/',        AssignedCasesListView.as_view(),         name='investigation-assigned-cases'),
    path('cases/<int:pk>/',        CaseReportView.as_view(),                name='investigation-case-report'),

    path('suspects/',              CaseSuspectCreateUpdateView.as_view(),   name='investigation-suspect-create'),
    path('suspects/<int:pk>/',     CaseSuspectCreateUpdateView.as_view(),   name='investigation-suspect-update'),

    path('complainants/<int:pk>/', ComplainantDetailView.as_view(),         name='investigation-complainant'),
    path('witnesses/<int:pk>/',    CaseWitnessDetailView.as_view(),         name='investigation-witness'),
    path('tips/<int:pk>/',         RewardTipDetailView.as_view(),           name='investigation-tip'),
    path('users/<int:pk>/',        UserDetailView.as_view(),                name='investigation-user'),
]
