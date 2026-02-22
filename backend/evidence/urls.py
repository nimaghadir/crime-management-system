from django.urls import path
from .views import (TestimonyEvidenceListCreateView,
                     TestimonyEvidenceDetailView, 
                     BiologicalEvidenceListCreateView,
                     BiologicalEvidenceDetailView)

urlpatterns = [
    path('testimony/', TestimonyEvidenceListCreateView.as_view(), name='testimony-list-create'),
    path('testimony/<int:pk>/', TestimonyEvidenceDetailView.as_view(), name='testimony-detail'),

    path('biological/', BiologicalEvidenceListCreateView.as_view(), name='biological-list-create'),
    path('biological/<int:pk>/', BiologicalEvidenceDetailView.as_view(), name='biological-detail'),

]
