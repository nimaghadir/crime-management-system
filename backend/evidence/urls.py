from django.urls import path
from .views import TestimonyEvidenceListCreateView, TestimonyEvidenceDetailView

urlpatterns = [
    path('testimony/', TestimonyEvidenceListCreateView.as_view(), name='testimony-list-create'),
    path('testimony/<int:pk>/', TestimonyEvidenceDetailView.as_view(), name='testimony-detail'),
]
