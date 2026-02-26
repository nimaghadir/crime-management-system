from django.urls import path

from .views import NotificationDetailView, NotificationListView, NotificationMarkAllReadView


urlpatterns = [
    path("", NotificationListView.as_view(), name="notifications-list"),
    path("mark-all-read/", NotificationMarkAllReadView.as_view(), name="notifications-mark-all-read"),
    path("<int:pk>/", NotificationDetailView.as_view(), name="notifications-detail"),
]
