from django.urls import path
from .views import (
    CaseReportView,
    AssignedCasesListView,
    CaseSuspectCreateUpdateView,
    IntenseTrackingSuspectsListView,
    ComplainantDetailView,
    CaseSuspectCreateUpdateView,
    CaseWitnessDetailView,
    RewardTipDetailView,
    UserDetailView,
    SuspectCandidateListView,
    DetectiveBoardLayoutView,
)

urlpatterns = [
    path('cases/assigned/',        AssignedCasesListView.as_view(),         name='investigation-assigned-cases'),
    path('cases/<int:pk>/',        CaseReportView.as_view(),                name='investigation-case-report'),

    path('suspects/',              CaseSuspectCreateUpdateView.as_view(),   name='investigation-suspect-create'),
    path('suspect-candidates/',    SuspectCandidateListView.as_view(),      name='investigation-suspect-candidates'),
    path('suspects/intense-tracking/', IntenseTrackingSuspectsListView.as_view(), name='investigation-suspect-intense-tracking'),
    path('suspects/<int:pk>/',     CaseSuspectCreateUpdateView.as_view(),   name='investigation-suspect-update'),
    path('board-layout/<int:case_id>/', DetectiveBoardLayoutView.as_view(), name='investigation-board-layout'),

    path('complainants/<int:pk>/', ComplainantDetailView.as_view(),         name='investigation-complainant'),
    path('witnesses/<int:pk>/',    CaseWitnessDetailView.as_view(),         name='investigation-witness'),
    path('tips/<int:pk>/',         RewardTipDetailView.as_view(),           name='investigation-tip'),
    path('users/<int:pk>/',        UserDetailView.as_view(),                name='investigation-user'),
]
