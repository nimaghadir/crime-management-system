from django.urls import path

from .views import (
    DetectiveTipQueueView,
    DetectiveTipReviewView,
    MyTipListView,
    OfficerTipQueueView,
    OfficerTipReviewView,
    RewardLookupView,
    TipAttachmentListCreateView,
    TipCreateView,
)


urlpatterns = [
    path("tips/", TipCreateView.as_view(), name="tips-create"),
    path("tips/<int:pk>/attachments/", TipAttachmentListCreateView.as_view(), name="tips-attachments"),
    path("tips/my/", MyTipListView.as_view(), name="tips-my"),
    path("tips/officer-queue/", OfficerTipQueueView.as_view(), name="tips-officer-queue"),
    path("tips/<int:pk>/officer-review/", OfficerTipReviewView.as_view(), name="tips-officer-review"),
    path("tips/detective-queue/", DetectiveTipQueueView.as_view(), name="tips-detective-queue"),
    path("tips/<int:pk>/detective-review/", DetectiveTipReviewView.as_view(), name="tips-detective-review"),
    path("rewards/lookup/", RewardLookupView.as_view(), name="rewards-lookup"),
]
