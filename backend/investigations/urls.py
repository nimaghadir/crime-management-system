from django.urls import path
from .views import (
    CaseReportView,
    ComplainantDetailView,
    CaseSuspectDetailView,
    CaseWitnessDetailView,
    RewardTipDetailView,
    UserDetailView,
)

urlpatterns = [
    path('cases/<int:pk>/',        CaseReportView.as_view(),       name='investigation-case-report'),
    path('complainants/<int:pk>/', ComplainantDetailView.as_view(), name='investigation-complainant'),
    path('suspects/<int:pk>/',     CaseSuspectDetailView.as_view(), name='investigation-suspect'),
    path('witnesses/<int:pk>/',    CaseWitnessDetailView.as_view(), name='investigation-witness'),
    path('tips/<int:pk>/',         RewardTipDetailView.as_view(),   name='investigation-tip'),
    path('users/<int:pk>/',        UserDetailView.as_view(),        name='investigation-user'),
]
