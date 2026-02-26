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
    SergeantBailCandidatesView,
    CaseSuspectBailOfferView,
    MyBailOffersView,
    CaseSuspectBailPayView,
    CaseSuspectBailPayVerifyView,
)

urlpatterns = [
    path('cases/assigned/',        AssignedCasesListView.as_view(),         name='investigation-assigned-cases'),
    path('cases/<int:pk>/',        CaseReportView.as_view(),                name='investigation-case-report'),

    path('suspects/',              CaseSuspectCreateUpdateView.as_view(),   name='investigation-suspect-create'),
    path('suspect-candidates/',    SuspectCandidateListView.as_view(),      name='investigation-suspect-candidates'),
    path('suspects/intense-tracking/', IntenseTrackingSuspectsListView.as_view(), name='investigation-suspect-intense-tracking'),
    path('bail/sergeant-candidates/', SergeantBailCandidatesView.as_view(), name='investigation-bail-sergeant-candidates'),
    path('bail/my/', MyBailOffersView.as_view(), name='investigation-bail-my'),
    path('suspects/<int:pk>/',     CaseSuspectCreateUpdateView.as_view(),   name='investigation-suspect-update'),
    path('suspects/<int:pk>/bail-offer/', CaseSuspectBailOfferView.as_view(), name='investigation-suspect-bail-offer'),
    path('suspects/<int:pk>/bail-pay/', CaseSuspectBailPayView.as_view(), name='investigation-suspect-bail-pay'),
    path('suspects/<int:pk>/bail-pay/verify/', CaseSuspectBailPayVerifyView.as_view(), name='investigation-suspect-bail-pay-verify'),
    path('board-layout/<int:case_id>/', DetectiveBoardLayoutView.as_view(), name='investigation-board-layout'),

    path('complainants/<int:pk>/', ComplainantDetailView.as_view(),         name='investigation-complainant'),
    path('witnesses/<int:pk>/',    CaseWitnessDetailView.as_view(),         name='investigation-witness'),
    path('tips/<int:pk>/',         RewardTipDetailView.as_view(),           name='investigation-tip'),
    path('users/<int:pk>/',        UserDetailView.as_view(),                name='investigation-user'),
]
