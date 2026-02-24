from django.urls import path

from .views import NotificationDetailView, NotificationListView


urlpatterns = [
    path("", NotificationListView.as_view(), name="notifications-list"),
    path("<int:pk>/", NotificationDetailView.as_view(), name="notifications-detail"),
]
