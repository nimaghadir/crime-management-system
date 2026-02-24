# core/urls.py

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from financials.views import RewardLookupView, PaymentRecordListView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Swagger Documentation Endpoints
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # LAPD App Endpoints
    path('api/accounts/', include('accounts.urls')),
    path('api/cases/', include('cases.urls')),
    path('api/evidence/', include('evidence.urls')),
    path('api/investigations/', include('investigations.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/financials/', include('financials.urls')),
    path('api/payments/records/', PaymentRecordListView.as_view(), name='payments-records'),
    path('api/payments/rewards/lookup/', RewardLookupView.as_view(), name='payments-reward-lookup'),
    path('api/custom-admin/', include('custom-admin.urls')),

]
