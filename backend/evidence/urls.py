from django.urls import path
from .views import (TestimonyEvidenceListCreateView,
                     TestimonyEvidenceDetailView, 
                     BiologicalEvidenceListCreateView,
                     BiologicalEvidenceDetailView, 
                     VehicleEvidenceListCreateView,
                     VehicleEvidenceDetailView,
                     IdentificationDocumentListCreateView, 
                     IdentificationDocumentDetailView,
                     OtherEvidenceListCreateView,
                     OtherEvidenceDetailView,
                     EvidenceAttachmentListCreateView,
                     )

urlpatterns = [
    path('testimony/', TestimonyEvidenceListCreateView.as_view(), name='testimony-list-create'),
    path('testimony/<int:pk>/', TestimonyEvidenceDetailView.as_view(), name='testimony-detail'),

    path('biological/', BiologicalEvidenceListCreateView.as_view(), name='biological-list-create'),
    path('biological/<int:pk>/', BiologicalEvidenceDetailView.as_view(), name='biological-detail'),

    path('vehicle/', VehicleEvidenceListCreateView.as_view(), name='vehicle-list-create'),
    path('vehicle/<int:pk>/', VehicleEvidenceDetailView.as_view(), name='vehicle-detail'),

    path('identification-document/', IdentificationDocumentListCreateView.as_view(), name='id-doc-list-create'),
    path('identification-document/<int:pk>/', IdentificationDocumentDetailView.as_view(), name='id-doc-detail'),

    path('other/', OtherEvidenceListCreateView.as_view(), name='other-list-create'),
    path('other/<int:pk>/', OtherEvidenceDetailView.as_view(), name='other-detail'),
    path('attachments/', EvidenceAttachmentListCreateView.as_view(), name='evidence-attachment-list-create'),
]
