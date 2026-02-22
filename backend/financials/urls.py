# financials/urls.py

from django.urls import path
from .views import TipListCreateView, TipDetailView, TipLookupView

urlpatterns = [
    path('tips/',          TipListCreateView.as_view(), name='tip-list-create'),
    path('tips/lookup/',   TipLookupView.as_view(),     name='tip-lookup'),
    path('tips/<int:pk>/', TipDetailView.as_view(),     name='tip-detail'),
]
